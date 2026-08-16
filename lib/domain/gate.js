/**
 * The delivery gate domain: the configurable quality-gate checklist that
 * turns one session's durable evidence into a deliverable/rework decision.
 *
 * Four phases compose the checklist:
 *
 * - **requirements** — a key-question checklist confirmed item by item
 *   against the committed spec (deterministic fold, no model calls).
 * - **tests** — test evidence from the session log: the latest run color,
 *   failing runs after green, and (optionally) a coverage percentage parsed
 *   from the test output.
 * - **consistency** — diff ↔ requirement mapping, audited by a local forked
 *   reviewer (orchestrated by the guard row; this module owns the result
 *   shape and the status fold).
 * - **review** — the delivery conclusion: the dsh-auto-review engine's
 *   durable verdict records when they exist (`engine: auto`), degraded to
 *   the local reviewer when the engine is not installed or has not run.
 *
 * Everything here is pure: the durable session log in, structured gate facts
 * out. Check summaries and suggestions are stable English audit ids (the
 * workspace documents keep English headings by package policy); the guard
 * row localizes the surrounding command chrome. Reports are audit-safe by
 * construction — counts, ids, and verdicts only — and {@link redactSecrets}
 * scrubs the model-produced finding texts before they are stored or shown.
 *
 * @module dsh-doublecheck/domain/gate
 */
import { isTestCommand, joinTextBlocks, parseRawArguments, shellCommand, testOutcome, } from "./evidence.js";
import { SPEC_TOOL_NAME } from "./stages.js";
import { SPEC_FIELD_NAMES } from "./vocabulary.js";
/** All gate phases in checklist order. */
export const GATE_PHASES = ['requirements', 'tests', 'consistency', 'review'];
/** The default key-question checklist: one question per spec dimension. */
export const DEFAULT_GATE_QUESTIONS = [
    { id: 'goal', question: 'What outcome must the delivery produce?', specDimension: 'goal', required: true },
    { id: 'scope', question: 'What is in scope, and what is out of scope?', specDimension: 'scope', required: true },
    { id: 'acceptance', question: 'Which observable checks prove the work is done?', specDimension: 'acceptanceCriteria', required: true },
    { id: 'failureModes', question: 'What can go wrong, and what is the correct behavior in each case?', specDimension: 'failureModes', required: true },
    { id: 'priorities', question: 'What is traded when goals conflict; what is optional?', specDimension: 'priorities', required: true },
    { id: 'nonGoals', question: 'What does the user explicitly not want?', specDimension: 'nonGoals', required: true },
];
/** Default regex parsing a coverage percentage from test output (one capture group, case-insensitive). */
export const DEFAULT_COVERAGE_PATTERN = 'coverage[^\\d]{0,40}(\\d+(?:\\.\\d+)?)\\s*%';
/**
 * Fold the requirements evidence: the latest committed spec (a successful
 * `doublecheck_spec` pair, from the call's own arguments) and the count of
 * interrogation tool calls on record.
 * @param events - the session's append-only event log.
 * @param interrogateTool - the tool name that counts as user interrogation.
 * @returns the folded evidence.
 */
export function foldRequirementsEvidence(events, interrogateTool) {
    let spec = null;
    let interrogations = 0;
    const pendingSpecs = new Map();
    for (const event of events) {
        switch (event.type) {
            case 'tool/call': {
                if (event.data.name === interrogateTool)
                    interrogations += 1;
                if (event.data.name !== SPEC_TOOL_NAME)
                    break;
                const args = parseRawArguments(event.data.arguments);
                const candidate = readSpecFromArgs(args);
                if (candidate !== null)
                    pendingSpecs.set(event.data.callId, candidate);
                break;
            }
            case 'tool/result': {
                const callId = event.data.message.source.callId;
                const candidate = pendingSpecs.get(callId);
                if (candidate === undefined)
                    break;
                pendingSpecs.delete(callId);
                if (event.data.error === undefined)
                    spec = candidate;
                break;
            }
        }
    }
    return { spec, interrogations };
}
/** Read the six spec fields from a spec tool call's arguments, or null when malformed. */
function readSpecFromArgs(args) {
    if (args === undefined)
        return null;
    const fields = args;
    for (const field of SPEC_FIELD_NAMES) {
        if (typeof fields[field] !== 'string')
            return null;
    }
    return {
        goal: fields.goal,
        scope: fields.scope,
        acceptanceCriteria: fields.acceptanceCriteria,
        failureModes: fields.failureModes,
        priorities: fields.priorities,
        nonGoals: fields.nonGoals,
    };
}
/**
 * Fold the test evidence: run counts, the latest outcome, the failing runs
 * since the latest green, and the best parsed coverage percentage.
 * @param events - the session's append-only event log.
 * @param detection - the compiled test-run detection knobs.
 * @param coverageRegex - regex with one capture group matching a percentage.
 * @returns the folded evidence.
 */
export function foldTestEvidence(events, detection, coverageRegex) {
    const evidence = { failed: 0, passed: 0, lastOutcome: 'none', failingAfterGreen: 0, coveragePct: null };
    const pendingTests = new Map();
    for (const event of events) {
        switch (event.type) {
            case 'tool/call': {
                const args = parseRawArguments(event.data.arguments);
                const command = shellCommand(event.data.name, args, detection);
                if (command !== undefined && isTestCommand(command, detection)) {
                    pendingTests.set(event.data.callId, undefined);
                }
                break;
            }
            case 'tool/result': {
                const callId = event.data.message.source.callId;
                if (!pendingTests.delete(callId))
                    break;
                const text = joinTextBlocks(event.data.message.content);
                foldTestEvidenceOutcome(evidence, testOutcome(text, event.data.error !== undefined), text, coverageRegex);
                break;
            }
            case 'tool/code-dispatch': {
                const args = parseRawArguments(event.data.arguments);
                const command = shellCommand(event.data.name, args, detection);
                if (command !== undefined && isTestCommand(command, detection)) {
                    const text = joinTextBlocks(event.data.content);
                    foldTestEvidenceOutcome(evidence, testOutcome(text, event.data.isError), text, coverageRegex);
                }
                break;
            }
        }
    }
    return evidence;
}
/** Fold one settled test-run outcome into the counts, the red window, and the coverage. */
function foldTestEvidenceOutcome(evidence, outcome, text, coverageRegex) {
    const pct = readCoverage(text, coverageRegex);
    if (pct !== null && (evidence.coveragePct === null || pct > evidence.coveragePct)) {
        evidence.coveragePct = pct;
    }
    if (outcome === 'fail') {
        evidence.failed += 1;
        evidence.lastOutcome = 'fail';
        evidence.failingAfterGreen += 1;
    }
    else if (outcome === 'pass') {
        evidence.passed += 1;
        evidence.lastOutcome = 'pass';
        evidence.failingAfterGreen = 0;
    }
}
/** Parse the first coverage percentage from test output, or null when absent. */
function readCoverage(text, coverageRegex) {
    const match = coverageRegex.exec(text);
    if (match === null || match[1] === undefined)
        return null;
    const parsed = Number.parseFloat(match[1]);
    return Number.isFinite(parsed) ? parsed : null;
}
/**
 * Evaluate the requirements phase: each key question is confirmed item by
 * item against the committed spec. A failed required question is a red
 * light; a failed optional question is a warning; a free-form question
 * without a spec-dimension binding is a manual-confirm warning.
 * @param evidence - the folded requirements evidence.
 * @param config - the requirements-phase tuning.
 * @returns the settled phase result.
 */
export function evaluateRequirements(evidence, config) {
    const checks = [];
    let confirmed = 0;
    for (const question of config.checklist) {
        let status;
        let summary;
        let suggestion;
        if (evidence.spec === null) {
            status = 'fail';
            summary = 'no requirements spec on record';
            suggestion = 'run the grill-requirements skill (or plan mode) and commit doublecheck_spec';
            if (evidence.interrogations > 0) {
                summary = `no spec committed; ${evidence.interrogations} interrogation(s) on record`;
                status = 'warn';
            }
        }
        else if (question.specDimension === null) {
            status = 'warn';
            summary = 'no automatic evidence binding; confirm manually';
            suggestion = `answer "${question.question}" with the user and record the outcome`;
        }
        else if (!SPEC_FIELD_NAMES.includes(question.specDimension)) {
            status = 'warn';
            summary = `unknown spec dimension binding "${question.specDimension}"; confirm manually`;
            suggestion = `answer "${question.question}" with the user and record the outcome`;
        }
        else if (evidence.spec[question.specDimension].trim() === '') {
            status = 'fail';
            summary = `spec dimension "${question.specDimension}" is empty`;
            suggestion = 'settle the dimension with the user and re-commit doublecheck_spec';
        }
        else {
            status = 'pass';
            summary = `spec dimension "${question.specDimension}" committed`;
            suggestion = '';
        }
        if (status === 'pass') {
            if (question.required)
                confirmed += 1;
        }
        else if (status === 'fail' && !question.required) {
            status = 'warn';
            summary += ' (optional question)';
        }
        checks.push({
            id: question.id,
            phase: 'requirements',
            label: question.question,
            status,
            summary,
            suggestion,
        });
    }
    const required = config.checklist.filter(question => question.required).length;
    const target = Math.min(config.minConfirmed, required);
    if (confirmed < target) {
        checks.push({
            id: 'confirmed',
            phase: 'requirements',
            label: `key questions confirmed (${confirmed}/${target})`,
            status: 'fail',
            summary: `${confirmed} of ${target} required key questions confirmed`,
            suggestion: 'answer the open key questions with the user, then commit doublecheck_spec',
        });
    }
    return { phase: 'requirements', enabled: true, status: worstStatus(checks), checks };
}
/**
 * Evaluate the tests phase: the latest run color, the open red window, and
 * (optionally) the coverage percentage. Deterministic — no model calls.
 * @param evidence - the folded test evidence.
 * @param config - the tests-phase tuning.
 * @returns the settled phase result.
 */
export function evaluateTests(evidence, config) {
    const checks = [];
    if (config.requirePassingRun) {
        let status;
        let summary;
        let suggestion = '';
        if (evidence.lastOutcome === 'pass') {
            status = 'pass';
            summary = 'latest test run passed';
        }
        else if (evidence.lastOutcome === 'fail') {
            status = 'fail';
            summary = 'latest test run failing';
            suggestion = 'fix the failing tests and re-run the suite to green';
        }
        else {
            status = 'fail';
            summary = 'no test run on record';
            suggestion = 'run the test suite to green before delivering';
        }
        checks.push({ id: 'passing-run', phase: 'tests', label: 'passing test run', status, summary, suggestion });
    }
    if (evidence.failed > 0) {
        const within = evidence.failingAfterGreen <= config.allowFailingRuns;
        checks.push({
            id: 'failing-cases',
            phase: 'tests',
            label: 'failing cases after green',
            status: within ? 'pass' : 'fail',
            summary: `${evidence.failingAfterGreen} failing run(s) after green (allowed: ${config.allowFailingRuns})`,
            suggestion: within ? '' : 'make the failing tests pass and re-run the suite',
        });
    }
    if (config.requireCoverage) {
        let status;
        let summary;
        let suggestion;
        if (evidence.coveragePct === null) {
            status = 'fail';
            summary = 'no coverage evidence in the test output';
            suggestion = 'run coverage and include its summary in the test output';
        }
        else if (evidence.coveragePct < config.minCoveragePct) {
            status = 'fail';
            summary = `${evidence.coveragePct}% coverage below the ${config.minCoveragePct}% minimum`;
            suggestion = 'raise coverage above the configured minimum';
        }
        else {
            status = 'pass';
            summary = `${evidence.coveragePct}% coverage (minimum ${config.minCoveragePct}%)`;
            suggestion = '';
        }
        checks.push({ id: 'coverage', phase: 'tests', label: 'coverage evidence', status, summary, suggestion });
    }
    return { phase: 'tests', enabled: true, status: worstStatus(checks), checks };
}
/** The structured output the consistency and local review subagents must satisfy. */
export const GATE_FINDINGS_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: ['findings'],
    properties: {
        findings: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: false,
                required: ['severity', 'title', 'detail'],
                properties: {
                    severity: { type: 'string', enum: ['blocker', 'major', 'minor', 'info'] },
                    title: { type: 'string' },
                    detail: { type: 'string' },
                },
            },
        },
    },
};
/**
 * Evaluate the consistency phase from the local reviewer's findings: blocker
 * and major findings are red lights, minor/info findings are warnings, and
 * an unavailable reviewer is an honest skip (never a red light — a broken
 * critic is not evidence of a defect, and a skipped phase keeps the verdict
 * honest instead of silent).
 * @param findings - the structured findings, or null when the reviewer could not run.
 * @param unavailableReason - why the reviewer could not run (for the skip notice).
 * @returns the settled phase result.
 */
export function evaluateConsistency(findings, unavailableReason) {
    if (findings === null) {
        return {
            phase: 'consistency',
            enabled: true,
            status: 'skip',
            checks: [{
                    id: 'consistency-review',
                    phase: 'consistency',
                    label: 'diff ↔ requirement mapping',
                    status: 'skip',
                    summary: unavailableReason,
                    suggestion: 'run /gate run again once the reviewer seam is available',
                }],
        };
    }
    if (findings.length === 0) {
        return {
            phase: 'consistency',
            enabled: true,
            status: 'pass',
            checks: [{
                    id: 'consistency-review',
                    phase: 'consistency',
                    label: 'diff ↔ requirement mapping',
                    status: 'pass',
                    summary: 'edits map to the committed spec; no unmapped changes found',
                    suggestion: '',
                }],
        };
    }
    const checks = findings.map((finding, index) => ({
        id: `finding-${index + 1}`,
        phase: 'consistency',
        label: finding.title,
        status: finding.severity === 'blocker' || finding.severity === 'major' ? 'fail' : 'warn',
        summary: `[${finding.severity}] ${redactSecrets(finding.detail)}`,
        suggestion: redactSecrets(finding.title),
    }));
    return { phase: 'consistency', enabled: true, status: worstStatus(checks), checks };
}
/**
 * Fold the dsh-auto-review engine's durable verdict records
 * (`autoReview/verdict` / `autoReview/rejection`) from the session log. The
 * engine row provides no service, so its verdict events ARE the weak
 * dependency: records present means the engine is installed and has judged
 * this session's calls; no records means it did not run, and the gate
 * degrades to the local reviewer.
 * @param events - the session's append-only event log.
 * @returns the engine evidence, or null when the engine has no records here.
 */
export function foldAutoReviewEvidence(events) {
    let approvals = 0;
    let rejections = 0;
    let latestRisk = null;
    for (const event of events) {
        // The engine's vocabulary is foreign (dsh-auto-review is not a dependency
        // of this package), so the fold reads it structurally by type name.
        const type = event.type;
        if (type !== 'autoReview/verdict' && type !== 'autoReview/rejection')
            continue;
        const data = event.data;
        if (type === 'autoReview/verdict') {
            if (data.decision === 'allow')
                approvals += 1;
            else if (data.decision === 'deny')
                rejections += 1;
            if (typeof data.riskLevel === 'string' && data.riskLevel.length > 0)
                latestRisk = data.riskLevel;
        }
        else {
            rejections += 1;
        }
    }
    if (approvals === 0 && rejections === 0)
        return null;
    return { engine: 'dsh-auto-review', approvals, rejections, latestRisk };
}
/**
 * Evaluate the review conclusion phase. With `engine: auto`, the engine's
 * durable verdict records are the evidence; when the engine has no records
 * (not installed, or nothing triggered it this session), the phase degrades
 * to the local reviewer's findings with a warn check naming the degrade
 * reason. With `engine: local`, the local reviewer is always the evidence.
 * A rejected engine call is a red light.
 * @param engine - the engine evidence, or null.
 * @param localFindings - the local reviewer's findings, or null when it could not run.
 * @param localUnavailable - why the local reviewer could not run.
 * @param engineConfigured - the configured engine preference.
 * @param degradeNote - why the engine was not used (for the warn check).
 * @returns the settled phase result and the engine that produced it.
 */
export function evaluateReview(engine, localFindings, localUnavailable, engineConfigured, degradeNote = null) {
    if (engineConfigured === 'auto' && engine !== null) {
        let status = 'pass';
        let summary;
        let suggestion = '';
        if (engine.rejections > 0) {
            status = 'fail';
            summary = `${engine.rejections} call(s) rejected by dsh-auto-review`;
            suggestion = 'address the rejected calls, then re-run /gate run';
        }
        else {
            summary = `${engine.approvals} call(s) approved by dsh-auto-review`;
            if (engine.latestRisk !== null)
                summary += ` (latest risk: ${engine.latestRisk})`;
        }
        return {
            engine: 'dsh-auto-review',
            result: {
                phase: 'review',
                enabled: true,
                status,
                checks: [{ id: 'engine-review', phase: 'review', label: 'dsh-auto-review conclusion', status, summary, suggestion }],
            },
        };
    }
    const degraded = engineConfigured === 'auto' && engine === null;
    return {
        engine: 'local',
        result: evaluateLocalReview(localFindings, localUnavailable, degraded, degradeNote),
    };
}
/** The local reviewer's settled phase result (shared by both engine modes). */
function evaluateLocalReview(findings, unavailableReason, degraded, degradeNote) {
    const checks = [];
    if (degraded && degradeNote !== null) {
        checks.push({
            id: 'engine-degraded',
            phase: 'review',
            label: 'review engine',
            status: 'warn',
            summary: degradeNote,
            suggestion: 'install dsh-auto-review, or re-run /gate run after it has judged this session\'s calls',
        });
    }
    if (findings === null) {
        checks.push({
            id: 'local-review',
            phase: 'review',
            label: 'local review',
            status: 'skip',
            summary: unavailableReason,
            suggestion: 'run /gate run again once the reviewer seam is available',
        });
        return { phase: 'review', enabled: true, status: worstStatus(checks), checks };
    }
    if (findings.length === 0) {
        checks.push({
            id: 'local-review',
            phase: 'review',
            label: 'local review',
            status: 'pass',
            summary: 'the reviewer found no objections the evidence can support',
            suggestion: '',
        });
        return { phase: 'review', enabled: true, status: worstStatus(checks), checks };
    }
    for (const [index, finding] of findings.entries()) {
        checks.push({
            id: `finding-${index + 1}`,
            phase: 'review',
            label: finding.title,
            status: finding.severity === 'blocker' || finding.severity === 'major' ? 'fail' : 'warn',
            summary: `[${finding.severity}] ${redactSecrets(finding.detail)}`,
            suggestion: redactSecrets(finding.title),
        });
    }
    return { phase: 'review', enabled: true, status: worstStatus(checks), checks };
}
/** A disabled phase: present in the report as skipped, contributing nothing. */
export function skippedPhase(phase) {
    return { phase, enabled: false, status: 'skip', checks: [] };
}
/** The worst status among the checks (fail > warn > skip > pending > pass). */
function worstStatus(checks) {
    let worst = 'pass';
    for (const check of checks) {
        if (check.status === 'fail')
            return 'fail';
        if (check.status === 'warn')
            worst = 'warn';
        else if (check.status === 'skip' && worst === 'pass')
            worst = 'skip';
        else if (check.status === 'pending' && worst === 'pass')
            worst = 'pending';
    }
    return worst;
}
/**
 * Derive the gate's binary decision: any enabled phase with a failing check
 * means rework. Warnings and skipped phases never flip the decision — a
 * skipped review keeps the report honest ("not reviewed") without inventing
 * a red light.
 * @param phases - the settled phase results.
 * @returns the gate verdict.
 */
export function deriveGateVerdict(phases) {
    return phases.some(phase => phase.enabled && phase.status === 'fail') ? 'rework' : 'deliverable';
}
/**
 * The count of red-light (failing) checks across the phases.
 * @param phases - the settled phase results.
 * @returns the red-item count.
 */
export function countRedChecks(phases) {
    let count = 0;
    for (const phase of phases) {
        for (const check of phase.checks) {
            if (check.status === 'fail')
                count += 1;
        }
    }
    return count;
}
/**
 * Redact secrets from a model-produced text. The gate report is auditable
 * by policy: counts, ids, and verdicts only. This scrubber catches the
 * common credential shapes (cloud keys, GitHub tokens, OpenAI-style keys,
 * Slack tokens, bearer tokens, private-key blocks, password assignments,
 * and long hex/base64 runs) before a finding title or detail is stored or
 * shown, so a reviewer quoting evidence cannot leak a credential.
 * @param text - the text to scrub.
 * @returns the text with recognized secrets replaced by `[redacted]`.
 */
export function redactSecrets(text) {
    return text
        .replace(/-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+ PRIVATE KEY-----/gi, '[redacted]')
        .replace(/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g, '[redacted]')
        .replace(/\bgh[pousr]_[A-Za-z0-9]{20,}\b/g, '[redacted]')
        .replace(/\bsk-[A-Za-z0-9_-]{20,}\b/g, '[redacted]')
        .replace(/\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g, '[redacted]')
        .replace(/\bBearer\s+[A-Za-z0-9._-]{16,}\b/gi, 'Bearer [redacted]')
        .replace(/\b(?:password|passwd|pwd|secret|token|api[_-]?key)\s*[:=]\s*\S+/gi, '$1: [redacted]')
        .replace(/\b[0-9a-f]{32,}\b/gi, '[redacted]')
        .replace(/\b[A-Za-z0-9+/_-]{40,}\b/g, '[redacted]');
}
/** The status glyph of one checklist item for the markdown renderers. */
function statusGlyph(status) {
    switch (status) {
        case 'pass': return '✔';
        case 'fail': return '✖';
        case 'warn': return '⚠';
        case 'skip': return '–';
        case 'pending': return '…';
    }
}
/** The phase-order index (for deterministic rendering). */
function phaseOrder(phase) {
    return GATE_PHASES.indexOf(phase);
}
/**
 * Render the settled gate state as the model/human-facing markdown report —
 * the `/gate run` output, ready to paste into a PR description.
 * @param state - the settled gate state.
 * @param planSuggestion - whether to append the plan-mode re-check suggestion.
 * @returns the report document.
 */
export function renderGateReportMarkdown(state, planSuggestion) {
    const redCount = countRedChecks(Object.values(state.phases));
    const lines = [
        '# Delivery gate report',
        '',
        `> **Verdict: ${state.verdict === 'rework' ? 'rework required' : 'deliverable'}**${redCount > 0 ? ` — ${redCount} red item(s)` : ''}`,
        '',
    ];
    if (state.verdict === 'rework' && planSuggestion) {
        lines.push('> The gate is red. Re-open the work in plan mode to re-check the open items before delivering.', '');
    }
    for (const phase of GATE_PHASES) {
        const result = state.phases[phase];
        if (result === undefined)
            continue;
        lines.push(...renderPhaseMarkdown(result), '');
    }
    const reds = [];
    for (const phase of GATE_PHASES) {
        const result = state.phases[phase];
        if (result === undefined)
            continue;
        for (const check of result.checks) {
            if (check.status === 'fail')
                reds.push(`1. **${phase}/${check.id}** — ${check.summary} — *rework: ${check.suggestion}*`);
        }
    }
    if (reds.length > 0) {
        lines.push('## Red items', '', ...reds, '');
    }
    lines.push('## Audit', `- review engine: ${state.reviewEngine ?? 'not run'}`, `- generated at: ${state.at}`, '- counts, ids, and verdicts only: no file contents or session text are embedded, and recognized secrets are redacted.', '');
    return lines.join('\n');
}
/**
 * Render one phase's checklist as markdown lines (shared by the full report
 * and the `/gate status` panel).
 * @param result - the phase result to render.
 * @returns the markdown lines, without the trailing blank line.
 */
export function renderPhaseMarkdown(result) {
    const lines = [`## ${phaseOrder(result.phase) + 1}. ${phaseLabel(result.phase)} — ${result.status.toUpperCase()}`];
    if (!result.enabled) {
        lines.push('- disabled in the gate configuration');
    }
    else if (result.checks.length === 0) {
        lines.push('- no evidence folded');
    }
    else {
        for (const check of result.checks) {
            lines.push(`- [${statusGlyph(check.status)}] **${check.label}** — ${check.summary}${check.suggestion !== '' ? ` — rework: ${check.suggestion}` : ''}`);
        }
    }
    return lines;
}
/** Human-readable phase headings (stable English audit ids). */
export function phaseLabel(phase) {
    switch (phase) {
        case 'requirements': return 'Requirements interrogation';
        case 'tests': return 'Test evidence';
        case 'consistency': return 'Implementation consistency';
        case 'review': return 'Review conclusion';
    }
}
