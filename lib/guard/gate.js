/**
 * The delivery gate runner: orchestrates the four-phase quality checklist
 * over one session's durable evidence and settles the deliverable/rework
 * decision.
 *
 * - **requirements** + **tests** — deterministic folds of the session log
 *   (no model calls): the key-question checklist against the committed
 *   spec, and the test-run/coverage evidence.
 * - **consistency** — a local forked reviewer audits the diff ↔ requirement
 *   mapping (every edit must serve a spec dimension).
 * - **review** — the delivery conclusion. With `engine: auto`, the
 *   dsh-auto-review engine's durable verdict records (`autoReview/verdict` /
 *   `autoReview/rejection`) are the evidence; when the engine is not
 *   installed or has no records this session, the phase degrades to the
 *   local forked reviewer and says so. `engine: local` always uses the
 *   local reviewer. The gate never synthesizes approval requests: that
 *   chain may reach a human.
 *
 * Everything a run settles is audit-safe: counts, ids, verdicts, and
 * redacted findings only. The settled state rides the durable
 * `doublecheck/gate` session event (replay IS the state), the workspace
 * `gate-report.md`, and the `/gate run` command result.
 *
 * @module dsh-doublecheck/guard/gate
 */
import { createUserMessage } from '@deepseek-ai/dsh-llm';
import z from '@deepseek-ai/schemastery';
import { countRedChecks, DEFAULT_COVERAGE_PATTERN, DEFAULT_GATE_QUESTIONS, deriveGateVerdict, evaluateConsistency, evaluateRequirements, evaluateReview, evaluateTests, foldAutoReviewEvidence, foldRequirementsEvidence, foldTestEvidence, GATE_FINDINGS_SCHEMA, renderGateReportMarkdown, renderPhaseMarkdown, skippedPhase, } from "../domain/gate.js";
import { sortFindings } from "./review.js";
import { PROSE } from "./prose.js";
/** The default gate configuration: every phase on, the six key questions required. */
export const DEFAULT_GATE_CONFIG = {
    enabled: true,
    planSuggestion: true,
    reportFile: 'gate-report.md',
    requirements: {
        enabled: true,
        checklist: [...DEFAULT_GATE_QUESTIONS],
        minConfirmed: 6,
        interrogateTool: 'ask_user_question',
    },
    tests: {
        enabled: true,
        requirePassingRun: true,
        allowFailingRuns: 0,
        requireCoverage: false,
        minCoveragePct: 80,
        coveragePattern: DEFAULT_COVERAGE_PATTERN,
    },
    consistency: {
        enabled: true,
        provider: 'fork',
        model: null,
        tools: ['read', 'glob', 'grep'],
        timeoutMs: 120000,
        maxFindings: 5,
    },
    review: {
        enabled: true,
        engine: 'auto',
        provider: 'fork',
        model: null,
        tools: ['read', 'glob', 'grep'],
        timeoutMs: 120000,
        maxFindings: 5,
    },
};
/** The delivery-gate configuration schema (the pluggable checklist + knobs). */
export const GateConfigSchema = z.object({
    enabled: z.boolean().default(true),
    planSuggestion: z.boolean().default(true),
    reportFile: z.string().min(1).default('gate-report.md'),
    requirements: z.object({
        enabled: z.boolean().default(true),
        checklist: z.array(z.object({
            id: z.string().min(1),
            question: z.string().min(1),
            specDimension: z.union([
                z.union(['goal', 'scope', 'acceptanceCriteria', 'failureModes', 'priorities', 'nonGoals']),
                z.const(null),
            ]).default(null),
            required: z.boolean().default(true),
        })).default([...DEFAULT_GATE_QUESTIONS]),
        minConfirmed: z.number().default(6),
        interrogateTool: z.string().min(1).default('ask_user_question'),
    }).default({ ...DEFAULT_GATE_CONFIG.requirements, checklist: [...DEFAULT_GATE_CONFIG.requirements.checklist] }),
    tests: z.object({
        enabled: z.boolean().default(true),
        requirePassingRun: z.boolean().default(true),
        allowFailingRuns: z.number().default(0),
        requireCoverage: z.boolean().default(false),
        minCoveragePct: z.number().default(80),
        coveragePattern: z.string().min(1).default(DEFAULT_COVERAGE_PATTERN),
    }).default({ ...DEFAULT_GATE_CONFIG.tests }),
    consistency: z.object({
        enabled: z.boolean().default(true),
        provider: z.string().min(1).default('fork'),
        model: z.union([z.string(), z.const(null)]).default(null),
        tools: z.array(z.string()).default(['read', 'glob', 'grep']),
        timeoutMs: z.number().default(120000),
        maxFindings: z.number().default(5),
    }).default({ ...DEFAULT_GATE_CONFIG.consistency }),
    review: z.object({
        enabled: z.boolean().default(true),
        engine: z.union(['auto', 'local']).default('auto'),
        provider: z.string().min(1).default('fork'),
        model: z.union([z.string(), z.const(null)]).default(null),
        tools: z.array(z.string()).default(['read', 'glob', 'grep']),
        timeoutMs: z.number().default(120000),
        maxFindings: z.number().default(5),
    }).default({ ...DEFAULT_GATE_CONFIG.review }),
}).default({
    ...DEFAULT_GATE_CONFIG,
    requirements: { ...DEFAULT_GATE_CONFIG.requirements, checklist: [...DEFAULT_GATE_CONFIG.requirements.checklist] },
    tests: { ...DEFAULT_GATE_CONFIG.tests },
    consistency: { ...DEFAULT_GATE_CONFIG.consistency },
    review: { ...DEFAULT_GATE_CONFIG.review },
});
/** The consistency reviewer's task (role statement first, kept short). */
const CONSISTENCY_TASK_EN = 'You are the implementation-consistency checker for this delivery gate. '
    + 'Map the implementation edits of the session you inherited to the committed '
    + 'doublecheck_spec dimensions: every changed file must serve a requirement, '
    + 'and every spec dimension with edits must have evidence. Answer through the '
    + 'required structured output: blocker/major objections for edits unmapped to '
    + 'any requirement or covered dimensions without evidence; an empty findings '
    + 'list when the mapping is complete. Do not invent objections.';
/** The consistency reviewer's task, zh. */
const CONSISTENCY_TASK_ZH = '你是本次交付门禁的实现一致性检查员。把你继承的会话中的实现改动映射到已提交的 '
    + 'doublecheck_spec 维度：每个改动的文件都必须服务于某条需求，每个有改动的 spec 维度'
    + '都必须有证据。通过要求的结构化输出作答：改动无法映射到任何需求、或有改动的维度缺乏'
    + '证据时给出 blocker/major 反对意见；映射完整时返回空 findings 列表。不要编造反对意见。';
/**
 * Validate the gate configuration fail-loud: checklist ids unique and
 * non-empty, valid spec-dimension bindings, bounded thresholds, compilable
 * coverage regex, and sound reviewer knobs. A bad gate config must not
 * silently produce an uncheckable checklist.
 * @param gate - the gate config block.
 */
export function validateGateConfig(gate) {
    if (gate.requirements.checklist.length === 0) {
        throw new Error('dsh-doublecheck: gate.requirements.checklist must not be empty');
    }
    const seen = new Set();
    for (const question of gate.requirements.checklist) {
        if (question.id.trim() === '')
            throw new Error('dsh-doublecheck: gate checklist ids must not be empty');
        if (seen.has(question.id))
            throw new Error(`dsh-doublecheck: duplicate gate checklist id "${question.id}"`);
        seen.add(question.id);
        if (question.specDimension !== null) {
            const dimensions = ['goal', 'scope', 'acceptanceCriteria', 'failureModes', 'priorities', 'nonGoals'];
            if (!dimensions.includes(question.specDimension)) {
                throw new Error(`dsh-doublecheck: gate checklist id "${question.id}" binds unknown spec dimension "${String(question.specDimension)}"`);
            }
        }
    }
    const required = gate.requirements.checklist.filter(question => question.required).length;
    if (!Number.isInteger(gate.requirements.minConfirmed) || gate.requirements.minConfirmed < 1) {
        throw new Error('dsh-doublecheck: gate.requirements.minConfirmed must be an integer >= 1');
    }
    if (gate.requirements.minConfirmed > required) {
        throw new Error(`dsh-doublecheck: gate.requirements.minConfirmed (${gate.requirements.minConfirmed}) exceeds the ${required} required questions`);
    }
    if (gate.requirements.interrogateTool.trim() === '') {
        throw new Error('dsh-doublecheck: gate.requirements.interrogateTool must not be empty');
    }
    if (!Number.isInteger(gate.tests.allowFailingRuns) || gate.tests.allowFailingRuns < 0) {
        throw new Error('dsh-doublecheck: gate.tests.allowFailingRuns must be an integer >= 0');
    }
    if (gate.tests.minCoveragePct < 0 || gate.tests.minCoveragePct > 100) {
        throw new Error('dsh-doublecheck: gate.tests.minCoveragePct must be within 0..100');
    }
    try {
        new RegExp(gate.tests.coveragePattern, 'i');
    }
    catch {
        throw new Error(`dsh-doublecheck: invalid gate.tests.coveragePattern "${gate.tests.coveragePattern}"`);
    }
    for (const [label, reviewer] of [['consistency', gate.consistency], ['review', gate.review]]) {
        if (!Number.isInteger(reviewer.maxFindings) || reviewer.maxFindings < 1 || reviewer.maxFindings > 20) {
            throw new Error(`dsh-doublecheck: gate.${label}.maxFindings must be within 1..20`);
        }
        if (!Number.isInteger(reviewer.timeoutMs) || reviewer.timeoutMs < 1) {
            throw new Error(`dsh-doublecheck: gate.${label}.timeoutMs must be an integer >= 1`);
        }
        assertNonEmptyNames(`gate.${label}.tools`, reviewer.tools);
        if (reviewer.provider.trim() === '') {
            throw new Error(`dsh-doublecheck: gate.${label}.provider must not be empty`);
        }
    }
}
/** Validate a name list fail-loud: non-empty, non-empty names, no duplicates. */
function assertNonEmptyNames(field, names) {
    if (names.length === 0)
        throw new Error(`dsh-doublecheck: ${field} must not be empty`);
    for (const name of names) {
        if (name.length === 0)
            throw new Error(`dsh-doublecheck: ${field} must not contain empty names`);
    }
    if (new Set(names).size !== names.length)
        throw new Error(`dsh-doublecheck: ${field} must not contain duplicates`);
}
/**
 * Run one local gate reviewer through the subagents seam and settle it to
 * structured findings. A missing seam, a rejected start, a non-completed
 * run, or a model failure settles as `findings: null` with an honest reason
 * — a broken reviewer never throws into the gate.
 * @param ctx - plugin context carrying the subagents seam.
 * @param reviewer - the reviewer knobs.
 * @param agent - the reviewed agent; its session seeds the fork.
 * @param task - the reviewer's task prompt.
 * @param label - the subagent run label.
 * @param signal - the caller's cancellation signal.
 * @returns the settled outcome.
 */
async function runLocalReviewer(ctx, reviewer, agent, task, label, signal) {
    const subagents = ctx.get('subagents');
    if (subagents === undefined) {
        ctx.logger.warn(`dsh-doublecheck: ${label} skipped: the ctx.subagents seam is not mounted`);
        return { findings: null, unavailable: 'the subagents seam is not mounted' };
    }
    const timeout = AbortSignal.timeout(reviewer.timeoutMs);
    const runSignal = AbortSignal.any([signal, timeout]);
    let run;
    try {
        run = await subagents.start(reviewer.provider, {
            label,
            prompt: [{ type: 'text', text: task }],
            parent: agent,
            signal: runSignal,
            ...reviewer.model !== null ? { agentOptions: { model: reviewer.model } } : {},
            outputSchema: GATE_FINDINGS_SCHEMA,
            toolFilter: { allow: reviewer.tools },
        });
    }
    catch (error) {
        return { findings: null, unavailable: String(error) };
    }
    try {
        let result;
        try {
            result = await run.result;
        }
        catch (error) {
            if (runSignal.aborted) {
                return { findings: null, unavailable: signal.aborted ? 'aborted' : 'timed out' };
            }
            return { findings: null, unavailable: String(error) };
        }
        if (result.stopReason !== 'completed') {
            return { findings: null, unavailable: `stopped (${result.stopReason})` };
        }
        const structured = result.structured;
        const raw = structured?.findings;
        if (!Array.isArray(raw)) {
            return { findings: null, unavailable: 'the reviewer returned no structured findings' };
        }
        return { findings: sortFindings(raw).slice(0, reviewer.maxFindings), unavailable: '' };
    }
    finally {
        await run.dispose();
    }
}
/**
 * Whether the dsh-auto-review row appears to be installed. Two weak probes:
 * its `/auto-review` command on the shared commands registry, and its
 * durable `autoReview/*` session events (its own switch writes
 * `autoReview/state` on first use). Best-effort — the durable verdict
 * records remain the actual evidence, this only shapes the degrade note.
 * @param ctx - plugin context carrying the commands service.
 * @param agent - the receiving agent.
 * @returns true when an `auto-review` command or an `autoReview/*` event exists.
 */
function autoReviewInstalled(ctx, agent) {
    const commands = ctx.get('commands');
    if (commands?.list !== undefined) {
        try {
            if (commands.list(agent).some(descriptor => descriptor.name === 'auto-review'))
                return true;
        }
        catch {
            // Fall through to the durable-event probe.
        }
    }
    return agent.session.events.some(event => event.type.startsWith('autoReview/'));
}
/**
 * Run the full delivery gate over the agent's session and settle the state.
 * The deterministic phases fold first; the two reviewer phases run in
 * parallel. Failures degrade to honest skip notices, never to throws.
 * @param ctx - plugin context (subagents, commands, fs seams).
 * @param config - the gate configuration.
 * @param detection - the compiled test-run detection knobs.
 * @param agent - the gated agent.
 * @param signal - the caller's cancellation signal.
 * @param language - prose language for the reviewer tasks.
 * @returns the settled gate state.
 */
export async function runGate(ctx, config, detection, agent, signal, language) {
    const events = agent.session.events;
    const coverageRegex = new RegExp(config.tests.coveragePattern, 'i');
    const requirements = config.requirements.enabled
        ? evaluateRequirements(foldRequirementsEvidence(events, config.requirements.interrogateTool), { checklist: config.requirements.checklist, minConfirmed: config.requirements.minConfirmed })
        : skippedPhase('requirements');
    const tests = config.tests.enabled
        ? evaluateTests(foldTestEvidence(events, detection, coverageRegex), config.tests)
        : skippedPhase('tests');
    const prose = PROSE[language];
    const consistencyTask = language === 'zh' ? CONSISTENCY_TASK_ZH : CONSISTENCY_TASK_EN;
    const consistencyPromise = config.consistency.enabled
        ? runLocalReviewer(ctx, config.consistency, agent, consistencyTask, 'doublecheck-gate-consistency', signal)
        : Promise.resolve({ findings: null, unavailable: 'disabled' });
    const localReviewPromise = config.review.enabled && config.review.engine === 'local'
        ? runLocalReviewer(ctx, config.review, agent, prose.criticTask, 'doublecheck-gate-review', signal)
        : Promise.resolve({ findings: null, unavailable: 'disabled' });
    const [consistencyOutcome, localReviewOutcome] = await Promise.all([consistencyPromise, localReviewPromise]);
    const consistency = config.consistency.enabled
        ? evaluateConsistency(consistencyOutcome.findings, consistencyOutcome.unavailable)
        : skippedPhase('consistency');
    let reviewResult;
    if (!config.review.enabled) {
        reviewResult = { result: skippedPhase('review'), engine: null };
    }
    else if (config.review.engine === 'auto') {
        // Weak dependency: the engine's durable verdict records are the evidence.
        // No records (not installed, or nothing triggered it this session) → the
        // local reviewer takes over, and an honest warn check names the degrade.
        const engine = foldAutoReviewEvidence(events);
        if (engine !== null) {
            reviewResult = evaluateReview(engine, null, '', 'auto');
        }
        else {
            const degradeNote = autoReviewInstalled(ctx, agent)
                ? 'dsh-auto-review is installed but has no verdict records in this session'
                : 'dsh-auto-review is not installed';
            const local = await runLocalReviewer(ctx, config.review, agent, prose.criticTask, 'doublecheck-gate-review', signal);
            const unavailable = local.findings === null
                ? `${degradeNote}; ${local.unavailable}`
                : local.unavailable;
            reviewResult = evaluateReview(engine, local.findings, unavailable, 'auto', degradeNote);
        }
    }
    else {
        reviewResult = evaluateReview(null, localReviewOutcome.findings, localReviewOutcome.unavailable, 'local');
    }
    const phases = { requirements, tests, consistency, review: reviewResult.result };
    return {
        verdict: deriveGateVerdict(Object.values(phases)),
        phases,
        reviewEngine: reviewResult.engine,
        at: new Date().toISOString(),
    };
}
/**
 * Settle one gate run's side effects: the durable `doublecheck/gate` session
 * event (when the host stamps `ignorable`), the observability announcement,
 * and the workspace `gate-report.md` copy. Failures of the file write never
 * fail the run — the command result and the durable event remain.
 * @param ctx - plugin context.
 * @param config - the gate configuration.
 * @param state - the settled gate state.
 * @param agent - the gated agent.
 * @param signal - the caller's cancellation signal.
 * @param stampsIgnorable - whether the host stamps the `ignorable` marker.
 */
export async function settleGate(ctx, config, state, agent, signal, stampsIgnorable) {
    if (stampsIgnorable) {
        ;
        agent.session.append('doublecheck/gate', state, { ignorable: true });
    }
    ctx.emit('doublecheck/gate', { session: agent.session, state });
    await writeGateFile(ctx, config.reportFile, state, agent, signal);
}
/** Write the gate report markdown through the filesystem seam, when one exists. */
async function writeGateFile(ctx, filePath, state, agent, signal) {
    const fs = ctx.get('fs');
    if (fs === undefined)
        return;
    let target;
    try {
        target = await fs.resolve(filePath, {
            ...agent.session.header.cwd !== undefined ? { cwd: agent.session.header.cwd } : {},
            signal,
        });
        await fs.writeText(target, renderGateReportMarkdown(state, true), undefined, signal);
    }
    catch (error) {
        signal.throwIfAborted();
        ctx.logger.debug(`dsh-doublecheck: gate report file write skipped: ${String(error)}`);
    }
}
/** The latest `doublecheck/gate` record of a session, or null before any run. */
function latestGateRecord(events) {
    for (let index = events.length - 1; index >= 0; index -= 1) {
        const event = events[index];
        if (event?.type === 'doublecheck/gate')
            return event.data;
    }
    return null;
}
/** A pending placeholder phase for the status panel (no gate run on record yet). */
function pendingPhase(phase) {
    return {
        phase,
        enabled: true,
        status: 'pending',
        checks: [{
                id: 'pending',
                phase,
                label: 'not run yet',
                status: 'pending',
                summary: 'run /gate run to settle the reviewer phases',
                suggestion: '',
            }],
    };
}
/**
 * The `/gate` command handler: `status` renders the live checklist progress
 * plus the latest settled run; `run` settles the full gate and returns the
 * PR-ready markdown report; `config` renders the effective checklist.
 * @param deps - the guard closures the handler reads.
 * @returns the command handler for `ctx.commands.register`.
 */
export function gateHandler(deps) {
    const { config, detection, prose, runGate, settleGate } = deps;
    return (invocation) => {
        const agent = invocation.agent;
        if (agent === undefined)
            return { kind: 'error', text: prose.gateCommandNoAgent };
        const session = agent.session;
        const input = invocation.rawInput.trim().toLowerCase();
        if (input === 'run') {
            return (async () => {
                try {
                    const state = await runGate(agent, invocation.signal);
                    await settleGate(state, agent, invocation.signal);
                    return { kind: 'success', text: renderGateReportMarkdown(state, config.planSuggestion) };
                }
                catch (error) {
                    return { kind: 'error', text: `gate run failed: ${String(error)}` };
                }
            })();
        }
        if (input === 'config') {
            return { kind: 'success', text: `${prose.gateConfigHeader}\n\n${renderGateConfigMarkdown(config)}` };
        }
        if (input !== 'status' && input !== '') {
            return { kind: 'error', text: prose.gateCommandUnknown(invocation.rawInput.trim()) };
        }
        const events = session.events;
        const coverageRegex = new RegExp(config.tests.coveragePattern, 'i');
        const requirements = config.requirements.enabled
            ? evaluateRequirements(foldRequirementsEvidence(events, config.requirements.interrogateTool), { checklist: config.requirements.checklist, minConfirmed: config.requirements.minConfirmed })
            : skippedPhase('requirements');
        const tests = config.tests.enabled
            ? evaluateTests(foldTestEvidence(events, detection, coverageRegex), config.tests)
            : skippedPhase('tests');
        const record = latestGateRecord(events);
        const planActive = deps.planMode === undefined ? undefined : deps.planMode.get(agent)?.active;
        const lines = [
            prose.gateStatusHeader,
            '',
            `- plan mode: ${planActive === undefined ? 'unknown' : planActive ? 'active' : 'inactive'}${record !== null && record.verdict === 'rework' && planActive === false ? ' — a red gate suggests re-opening in plan mode' : ''}`,
            '',
            '## Live checklist',
        ];
        lines.push(...renderPhaseMarkdown(requirements), '', ...renderPhaseMarkdown(tests), '');
        if (record === null) {
            lines.push('## Latest gate run — none on record', '', ...renderPhaseMarkdown(pendingPhase('consistency')), '', ...renderPhaseMarkdown(pendingPhase('review')), '', 'No full gate run on record yet; `/gate run` settles the verdict.', '');
        }
        else {
            const redCount = countRedChecks(Object.values(record.phases));
            lines.push(`## Latest gate run — ${record.at} (verdict: ${record.verdict}, ${redCount} red item(s), engine: ${record.reviewEngine ?? 'not run'})`, '', ...renderPhaseMarkdown(record.phases.consistency), '', ...renderPhaseMarkdown(record.phases.review), '');
        }
        lines.push(prose.gateStatusHint, '');
        return { kind: 'success', text: lines.join('\n') };
    };
}
/**
 * The injected gate-red notice message: short model-facing prose (role
 * statement first) with the structured verdict and red count riding the
 * durable `doublecheck-gate` message source, so the durable once-semantics
 * and the report folds read the record without re-parsing the prose.
 * @param verdict - the settled verdict.
 * @param redCount - the red-item count.
 * @param text - the model-facing notice text.
 * @returns the injection-ready user message.
 */
export function gateInjection(verdict, redCount, text) {
    const source = { kind: 'doublecheck-gate', verdict, redCount };
    return createUserMessage({ content: [{ type: 'text', text }], source });
}
/**
 * Render the effective gate configuration as markdown — the `/gate config`
 * output: the pluggable checklist, the thresholds, and the reviewer knobs.
 * Configuration contains no secrets by construction; nothing is redacted.
 * @param config - the gate configuration.
 * @returns the configuration document.
 */
export function renderGateConfigMarkdown(config) {
    const lines = [
        '# Delivery gate configuration',
        '',
        `- enabled: ${config.enabled}`,
        `- plan mode suggestion on red: ${config.planSuggestion}`,
        `- report file: ${config.reportFile}`,
        '',
        '## Requirements interrogation',
        '',
        '| # | id | key question | spec dimension | required |',
        '|---|---|---|---|---|',
    ];
    config.requirements.checklist.forEach((question, index) => {
        lines.push(`| ${index + 1} | ${question.id} | ${question.question} | ${question.specDimension ?? '—'} | ${question.required ? 'yes' : 'no'} |`);
    });
    lines.push('', `- minimum confirmed: ${config.requirements.minConfirmed}`, `- interrogation tool: ${config.requirements.interrogateTool}`, '', '## Test evidence', '', `- require passing run: ${config.tests.requirePassingRun}`, `- allowed failing runs after green: ${config.tests.allowFailingRuns}`, `- require coverage: ${config.tests.requireCoverage}`, `- minimum coverage: ${config.tests.minCoveragePct}%`, `- coverage pattern: \`${config.tests.coveragePattern}\``, '', '## Implementation consistency', '', `- enabled: ${config.consistency.enabled}`, `- reviewer provider: ${config.consistency.provider}`, `- max findings: ${config.consistency.maxFindings}`, `- tools: ${config.consistency.tools.join(', ')}`, '', '## Review conclusion', '', `- enabled: ${config.review.enabled}`, `- engine: ${config.review.engine} (auto = dsh-auto-review verdict records when present, else the local reviewer)`, `- reviewer provider: ${config.review.provider}`, `- max findings: ${config.review.maxFindings}`, `- tools: ${config.review.tools.join(', ')}`, '');
    return lines.join('\n');
}
