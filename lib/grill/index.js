/**
 * The grill module: dsh-doublecheck's requirements-furnace plugin.
 *
 * Registers the bundled `skills/` directory on the DSH skill registry (the
 * official skill capability seam), exposes the model-facing catalog/loader
 * tool `doublecheck_skills`, and provides the two contract tools:
 * `doublecheck_spec` (commit a grilled requirements spec to the session log
 * and a workspace markdown file) and `doublecheck_report` (v0.4: consolidate
 * the session's discipline evidence into a delivery report, optionally
 * orchestrating a per-dimension verification workflow through the DSH
 * workflow seam).
 *
 * @module dsh-doublecheck/grill
 */
import { renderSkillContent } from '@deepseek-ai/dsh-skill';
import { defineTool } from '@deepseek-ai/dsh-tools';
import z from '@deepseek-ai/schemastery';
import { DEFAULT_MUTATION_TOOLS, DEFAULT_TEST_COMMAND_PATTERNS, DEFAULT_TEST_FILE_PATTERNS, DEFAULT_TEST_TOOL_NAMES, compileDetection, } from "../domain/evidence.js";
import { SPEC_TOOL_NAME } from "../domain/stages.js";
import { buildVerifyScript, deriveReportVerdict, foldReportFacts, renderReportMarkdown, VERIFY_META, } from "../domain/report.js";
import { SPEC_FIELD_NAMES, VERIFY_DIMENSIONS } from "../domain/vocabulary.js";
import { sessionEvents } from "../session-events.js";
import { BundledSkillProvider, PROVIDER_NAME } from "./provider.js";
export const name = 'doublecheck-grill';
export const inject = ['skills', 'tools'];
export const Config = z.object({
    specFile: z.string().min(1).default('doublecheck-spec.md'),
    reportFile: z.string().min(1).default('doublecheck-report.md'),
    reportVerify: z.boolean().default(true),
    verifyProvider: z.string().min(1).default('fork'),
    verifyMode: z.union(['all', 'single']).default('all'),
    reportTestToolNames: z.array(z.string()).default([...DEFAULT_TEST_TOOL_NAMES]),
    reportTestCommandPatterns: z.array(z.string()).default([...DEFAULT_TEST_COMMAND_PATTERNS]),
    reportMutationTools: z.array(z.string()).default([...DEFAULT_MUTATION_TOOLS]),
    reportTestFilePatterns: z.array(z.string()).default([...DEFAULT_TEST_FILE_PATTERNS]),
});
/** Model-facing catalog of the package's own skills, one line per skill. */
function renderCatalog(skills) {
    if (skills.length === 0)
        return 'No doublecheck skills are currently available.';
    return [
        'The following doublecheck discipline skills are available:',
        ...skills.map(skill => `- \`${skill.name}\`: ${skill.description}`),
    ].join('\n');
}
/** The rendered spec document written to the workspace and shown to the model. */
export function renderSpecMarkdown(spec) {
    return [
        '# Doublecheck spec',
        '',
        '## Goal',
        spec.goal,
        '',
        '## Scope',
        spec.scope,
        '',
        '## Acceptance criteria',
        spec.acceptanceCriteria,
        '',
        '## Failure modes',
        spec.failureModes,
        '',
        '## Priorities',
        spec.priorities,
        '',
        '## Non-goals',
        spec.nonGoals,
        '',
    ].join('\n');
}
/**
 * Install the grill module: bundled skill provider plus its three tools.
 * @param ctx - plugin context; registrations unwind with it.
 * @param config - validated {@link Config}.
 */
export function apply(ctx, config) {
    ctx.skills.registerProvider(() => new BundledSkillProvider(ctx));
    const reportDetection = compileDetection({
        testToolNames: config.reportTestToolNames,
        testCommandPatterns: config.reportTestCommandPatterns,
        guardTools: config.reportMutationTools,
        testFilePatterns: config.reportTestFilePatterns,
    });
    ctx.tools.register(defineTool({
        name: 'doublecheck_skills',
        description: 'List the doublecheck engineering-discipline skills, or load the full instructions of one by its exact name. Call this before acting on a task that names or clearly matches one of them.',
        parameters: {
            name: {
                type: 'string',
                description: 'Exact skill name to load; omit to list every available doublecheck skill.',
            },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    skills: {
                        type: 'array',
                        required: true,
                        items: {
                            type: 'object',
                            additionalProperties: false,
                            properties: {
                                name: { type: 'string', required: true },
                                description: { type: 'string', required: true },
                                whenToUse: { type: 'string' },
                            },
                        },
                    },
                    name: { type: 'string' },
                    provider: { type: 'string' },
                    resourceBase: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                            kind: { type: 'string', required: true, const: 'directory' },
                            path: { type: 'string', required: true },
                        },
                    },
                    content: { type: 'string' },
                },
            },
            render: (_args, value) => {
                if (value.content === undefined || value.provider === undefined) {
                    return [{ type: 'text', text: renderCatalog(value.skills) }];
                }
                const name = value.name ?? _args.name ?? '';
                const loaded = renderSkillContent({
                    name,
                    provider: value.provider,
                    ...value.resourceBase !== undefined ? { resourceBase: value.resourceBase } : {},
                    content: value.content,
                });
                return [{ type: 'text', text: loaded }];
            },
        },
        async execute(args, exec) {
            const lookup = { cwd: exec.agent?.session.header.cwd, signal: exec.signal, scope: exec.agent };
            const summaries = (await ctx.skills.list(lookup)).filter(skill => skill.provider === PROVIDER_NAME);
            const skills = summaries.map(({ name: skillName, description, whenToUse }) => ({
                name: skillName,
                description,
                ...whenToUse !== undefined ? { whenToUse } : {},
            }));
            if (args.name === undefined)
                return { skills };
            const skill = await ctx.skills.get(args.name, lookup);
            if (skill === undefined || skill.provider !== PROVIDER_NAME) {
                throw new Error(`skill "${args.name}" is not a doublecheck skill or is no longer available`);
            }
            const resourceBase = skill.resourceBase !== undefined && skill.resourceBase.kind === 'directory'
                ? { kind: 'directory', path: skill.resourceBase.path }
                : undefined;
            return {
                skills,
                name: skill.name,
                provider: skill.provider,
                ...resourceBase !== undefined ? { resourceBase } : {},
                content: skill.content,
            };
        },
        presentCall(args) {
            return args.name === undefined
                ? { card: 'generic', title: 'List doublecheck skills', kind: 'read' }
                : { card: 'generic', title: `Load skill ${args.name}`, kind: 'read', rawInput: args.name };
        },
    }));
    ctx.tools.register(defineTool({
        name: SPEC_TOOL_NAME,
        description: 'Record the grilled requirements spec for the current task. Fill all six fields after the requirements grill reaches consensus (goal, scope, acceptance criteria, failure modes, priorities, non-goals), so the contract is kept in the session and written to the workspace before implementation starts.',
        parameters: {
            goal: { type: 'string', required: true, description: 'What outcome the work must produce, in one verifiable sentence.' },
            scope: { type: 'string', required: true, description: 'What is in scope and what is out of scope for this change.' },
            acceptanceCriteria: { type: 'string', required: true, description: 'Observable checks that prove the work is done.' },
            failureModes: { type: 'string', required: true, description: 'What can go wrong and the correct behavior in each case.' },
            priorities: { type: 'string', required: true, description: 'What to trade when goals conflict; what is optional.' },
            nonGoals: { type: 'string', required: true, description: 'What the user explicitly does not want.' },
            filePath: { type: 'string', description: 'Optional workspace path for the markdown copy. Defaults to the configured spec file in the session working directory.' },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    spec: {
                        type: 'object',
                        required: true,
                        additionalProperties: false,
                        properties: {
                            goal: { type: 'string', required: true },
                            scope: { type: 'string', required: true },
                            acceptanceCriteria: { type: 'string', required: true },
                            failureModes: { type: 'string', required: true },
                            priorities: { type: 'string', required: true },
                            nonGoals: { type: 'string', required: true },
                        },
                    },
                    path: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
                    written: { type: 'boolean', required: true },
                },
            },
            render: (_args, value) => {
                const note = value.written
                    ? `Recorded to ${value.path}.`
                    : 'No workspace copy was written; the spec is recorded in this session only.';
                return [{ type: 'text', text: `${renderSpecMarkdown(value.spec)}\n${note}` }];
            },
        },
        async execute(args, exec) {
            const spec = {
                goal: args.goal,
                scope: args.scope,
                acceptanceCriteria: args.acceptanceCriteria,
                failureModes: args.failureModes,
                priorities: args.priorities,
                nonGoals: args.nonGoals,
            };
            // Fail fast at the commit: an empty dimension would satisfy the gate
            // shape while recording an uncheckable contract. The grill must settle
            // every dimension before the spec counts.
            const empty = SPEC_FIELD_NAMES.filter(field => spec[field].trim() === '');
            if (empty.length > 0) {
                throw new Error(`doublecheck_spec: the spec dimension(s) ${empty.join(', ')} must not be empty; finish the requirements grill before committing the spec`);
            }
            const outcome = await writeSpecFile(ctx, spec, args.filePath ?? config.specFile, exec);
            if (exec.agent !== undefined) {
                ctx.emit('doublecheck/spec', { session: exec.agent.session, spec, ...outcome });
            }
            return { spec, ...outcome };
        },
        presentCall(args) {
            return {
                card: 'generic',
                title: 'Record doublecheck spec',
                kind: 'edit',
                content: [{ type: 'text', text: args.goal.length > 240 ? `${args.goal.slice(0, 240)}…` : args.goal }],
            };
        },
    }));
    ctx.tools.register(defineTool({
        name: 'doublecheck_report',
        description: 'Consolidate this session\'s doublecheck discipline evidence into a delivery report: the committed spec, the red/green test timeline, the adversary review record, and a derived verdict. With verify enabled, orchestrates one parallel checker per spec dimension through the workflow seam and folds their verdicts in. The report is written to the workspace and returned as this call\'s result.',
        parameters: {
            filePath: { type: 'string', description: 'Optional workspace path for the markdown copy. Defaults to the configured report file in the session working directory.' },
            verify: { type: 'boolean', description: 'Whether to run the per-dimension verification workflow. Defaults to the configured reportVerify.' },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    verdict: {
                        type: 'string',
                        required: true,
                        enum: ['grill', 'draft', 'red', 'green', 'objections', 'verified', 'proven', 'challenged', 'unverified'],
                    },
                    spec: {
                        oneOf: [
                            {
                                type: 'object',
                                additionalProperties: false,
                                properties: {
                                    goal: { type: 'string', required: true },
                                    scope: { type: 'string', required: true },
                                    acceptanceCriteria: { type: 'string', required: true },
                                    failureModes: { type: 'string', required: true },
                                    priorities: { type: 'string', required: true },
                                    nonGoals: { type: 'string', required: true },
                                },
                            },
                            { type: 'null' },
                        ],
                        required: true,
                    },
                    testRuns: {
                        type: 'object',
                        required: true,
                        additionalProperties: false,
                        properties: {
                            failed: { type: 'integer', required: true },
                            passed: { type: 'integer', required: true },
                        },
                    },
                    timeline: {
                        type: 'array',
                        required: true,
                        items: {
                            type: 'object',
                            additionalProperties: false,
                            properties: {
                                kind: { type: 'string', required: true, enum: ['spec', 'red', 'green', 'review'] },
                                detail: { type: 'string', required: true },
                            },
                        },
                    },
                    edits: { type: 'integer', required: true },
                    review: {
                        oneOf: [
                            {
                                type: 'object',
                                additionalProperties: false,
                                properties: {
                                    verdict: { type: 'string', required: true, enum: ['findings', 'clean', 'unavailable'] },
                                    findings: {
                                        type: 'array',
                                        required: true,
                                        items: {
                                            type: 'object',
                                            additionalProperties: false,
                                            properties: {
                                                severity: { type: 'string', required: true, enum: ['blocker', 'major', 'minor', 'info'] },
                                                title: { type: 'string', required: true },
                                                detail: { type: 'string', required: true },
                                            },
                                        },
                                    },
                                },
                            },
                            { type: 'null' },
                        ],
                        required: true,
                    },
                    verification: {
                        oneOf: [
                            {
                                type: 'object',
                                additionalProperties: false,
                                properties: {
                                    checks: {
                                        type: 'array',
                                        required: true,
                                        items: {
                                            type: 'object',
                                            additionalProperties: false,
                                            properties: {
                                                dimension: { type: 'string', required: true, enum: [...VERIFY_DIMENSIONS] },
                                                verdict: { type: 'string', required: true, enum: ['pass', 'fail'] },
                                                evidence: { type: 'string', required: true },
                                                note: { type: 'string', required: true },
                                            },
                                        },
                                    },
                                    complete: { type: 'boolean', required: true },
                                },
                            },
                            { type: 'null' },
                        ],
                        required: true,
                    },
                    verificationNote: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
                    path: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
                    written: { type: 'boolean', required: true },
                },
            },
            render: (_args, value) => {
                const note = value.written
                    ? `Recorded to ${value.path}.`
                    : 'No workspace copy was written; the report is returned in this result only.';
                return [{ type: 'text', text: `${renderReportMarkdown(value)}\n${note}` }];
            },
        },
        async execute(args, exec) {
            const session = exec.agent?.session;
            const facts = session === undefined
                ? { spec: null, testRuns: { failed: 0, passed: 0 }, timeline: [], edits: 0, review: null }
                : foldReportFacts(sessionEvents(session), reportDetection);
            const verify = args.verify ?? config.reportVerify;
            const attempt = verify
                ? await runVerifyWorkflow(ctx, config, facts.spec, exec)
                : { verification: null, note: null };
            const report = {
                ...facts,
                verdict: deriveReportVerdict(facts, attempt.verification),
                verification: attempt.verification,
                verificationNote: attempt.note,
                path: null,
                written: false,
            };
            const outcome = await writeReportFile(ctx, report, args.filePath ?? config.reportFile, exec);
            report.path = outcome.path;
            report.written = outcome.written;
            if (session !== undefined) {
                ctx.emit('doublecheck/report', { session, verdict: report.verdict, verification: report.verification, verificationNote: report.verificationNote, path: report.path, written: report.written });
            }
            return report;
        },
        presentCall(args) {
            return {
                card: 'generic',
                title: 'Assemble doublecheck report',
                kind: 'read',
                content: [{ type: 'text', text: args.verify === true ? 'verifying delivery' : 'folding session evidence' }],
            };
        },
    }));
}
/**
 * Resolve the workflow engine for this call.
 *
 * A profile-level bundle row lives in the Host realm, but the web profile
 * mounts the engine inside the calling preset's isolated `delegation` group,
 * so `ctx.get('workflowEngine')` from the plugin context returns undefined
 * even though the service is registered. `agentPresets.serviceFor()` is the
 * host's explicit cross-realm accessor (it inspects the agent's retained
 * composition), so it is tried first; the plain lookup stays as the fallback
 * for profiles that mount the engine on the host plane.
 * @param ctx - the plugin context (Host/profile realm).
 * @param agent - the calling agent, when the tool call has one.
 * @returns the engine, or a human-readable reason it is unreachable.
 */
function resolveWorkflowEngine(ctx, agent) {
    const presets = ctx.get('agentPresets');
    if (agent?.ctx !== undefined && typeof presets?.serviceFor === 'function') {
        try {
            const scoped = presets.serviceFor(agent, 'workflowEngine');
            if (scoped !== undefined)
                return { engine: scoped };
        }
        catch (error) {
            ctx.logger.debug(`dsh-doublecheck: preset workflowEngine lookup failed: ${String(error)}`);
        }
    }
    const host = ctx.get('workflowEngine');
    if (host !== undefined)
        return { engine: host };
    return {
        why: presets === undefined
            ? 'the agent-preset registry is not mounted and the host plane has no workflowEngine'
            : typeof presets.serviceFor !== 'function'
                ? 'the mounted agentPresets service has no serviceFor() and the host plane has no workflowEngine'
                : 'the calling agent preset does not mount a workflow engine (standard/cordis enable workflow-ptc; ptc/minimal do not) and the host plane has none',
    };
}
/**
 * Run the per-dimension verification workflow through the workflow seam.
 *
 * Every way this can fail — no spec, no agent, an engine that is unreachable
 * from this realm, a rejected start, an early stop, a malformed value, a
 * rejected result — settles as `verification: null` plus a note that the
 * report renders. A missing seam must not fail the report call itself, but it
 * must not look like "the checks all passed and there was nothing to say"
 * either.
 * @returns the settled checks, or null verification with the reason.
 */
async function runVerifyWorkflow(ctx, config, spec, exec) {
    if (spec === null) {
        return { verification: null, note: 'no committed spec is on record; record one with doublecheck_spec before verification' };
    }
    if (exec.agent === undefined) {
        return { verification: null, note: 'the call has no owning agent, so no agent preset can supply a workflow engine' };
    }
    const { engine, why } = resolveWorkflowEngine(ctx, exec.agent);
    if (engine === undefined) {
        const note = `verification did not run: ${why}`;
        ctx.logger.warn(`dsh-doublecheck: ${note}`);
        return { verification: null, note };
    }
    let run;
    try {
        run = engine.start({
            script: buildVerifyScript(config.verifyMode),
            meta: VERIFY_META,
            args: { spec, dimensions: [...VERIFY_DIMENSIONS] },
            subagentProvider: config.verifyProvider,
            maxTotalAgents: config.verifyMode === 'single' ? 1 : VERIFY_DIMENSIONS.length,
            parent: exec.agent,
            signal: exec.signal,
        });
    }
    catch (error) {
        // Invalid script/meta or an absent verify provider: verification did not
        // run, and the report states so instead of failing the report itself.
        const note = `verification did not run: the workflow engine rejected the verify run: ${String(error)}`;
        ctx.logger.warn(`dsh-doublecheck: ${note}`);
        return { verification: null, note };
    }
    try {
        const result = await run.result;
        if (result.stopReason !== 'completed') {
            const detail = result.error === undefined ? '' : `: ${result.error}`;
            return { verification: null, note: `verification did not run: the verify workflow stopped with "${result.stopReason}" before completing${detail}` };
        }
        const value = result.value;
        if (value === null || value === undefined || !Array.isArray(value.checks)) {
            return { verification: null, note: 'verification did not run: the verify workflow completed without a structured checks array' };
        }
        const checks = [];
        for (const check of value.checks) {
            if (!VERIFY_DIMENSIONS.includes(check.dimension))
                continue;
            checks.push(check);
        }
        // `proven` requires a verdict for every spec dimension: completeness is
        // judged here so a checker that silently dropped a dimension cannot
        // upgrade the delivery.
        const complete = VERIFY_DIMENSIONS.every(dimension => checks.some(check => check.dimension === dimension));
        return { verification: { checks, complete }, note: null };
    }
    catch (error) {
        // A broken workflow engine must not fail the report call itself: the
        // delivery settles as unverified and the markdown says verification did
        // not run, with the reason.
        const note = `verification did not run: the verify workflow failed: ${String(error)}`;
        ctx.logger.warn(`dsh-doublecheck: ${note}`);
        return { verification: null, note };
    }
    finally {
        try {
            await run.dispose();
        }
        catch (error) {
            ctx.logger.warn(`dsh-doublecheck: verify run disposal failed: ${String(error)}`);
        }
    }
}
/** Write the report markdown through the filesystem seam, when one exists. */
async function writeReportFile(ctx, report, filePath, exec) {
    const fs = ctx.get('fs');
    if (fs === undefined)
        return { path: null, written: false };
    let target;
    try {
        target = await fs.resolve(filePath, {
            ...exec.agent?.session.header.cwd !== undefined ? { cwd: exec.agent.session.header.cwd } : {},
            signal: exec.signal,
        });
        await fs.writeText(target, renderReportMarkdown(report), undefined, exec.signal);
    }
    catch (error) {
        // Any write failure leaves the report in the tool result (the durable
        // snapshot); the outcome reports `written: false` instead of failing.
        exec.signal.throwIfAborted();
        ctx.logger.debug(`dsh-doublecheck: report file write skipped: ${String(error)}`);
        return { path: null, written: false };
    }
    return { path: target.displayPath, written: true };
}
/** Write the spec markdown through the filesystem seam, when one exists. */
async function writeSpecFile(ctx, spec, filePath, exec) {
    const fs = ctx.get('fs');
    if (fs === undefined)
        return { path: null, written: false };
    let target;
    try {
        target = await fs.resolve(filePath, {
            ...exec.agent?.session.header.cwd !== undefined ? { cwd: exec.agent.session.header.cwd } : {},
            signal: exec.signal,
        });
        await fs.writeText(target, renderSpecMarkdown(spec), undefined, exec.signal);
    }
    catch (error) {
        // Any write failure leaves the spec recorded in the session (the tool
        // result is the durable snapshot); the outcome reports `written: false`
        // instead of failing the commit.
        exec.signal.throwIfAborted();
        ctx.logger.debug(`dsh-doublecheck: spec file write skipped: ${String(error)}`);
        return { path: null, written: false };
    }
    return { path: target.displayPath, written: true };
}
