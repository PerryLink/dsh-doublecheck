/**
 * Adversary review: a forked critic subagent audits the delivery against the
 * committed spec.
 *
 * The critic is a one-shot `ctx.subagents` run on the configured provider
 * (default `fork`): the child inherits the parent session's completed-turn
 * prefix, so it sees the `doublecheck_spec` record, the red/green test
 * evidence, and every edit without any extra plumbing. A structured output
 * schema forces the findings shape; `agentOptions.model` routes the critic to
 * `adversaryModel` when one is configured. The critic may read (never mutate)
 * through an explicit tool allowlist.
 *
 * @module dsh-doublecheck/guard/review
 */
import { createUserMessage } from '@deepseek-ai/dsh-llm';
/**
 * Structured output the critic must satisfy: a findings list whose entries
 * carry a severity, a one-line title, and the supporting detail.
 */
export const REVIEW_OUTPUT_SCHEMA = {
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
                    severity: {
                        type: 'string',
                        enum: ['blocker', 'major', 'minor', 'info'],
                    },
                    title: { type: 'string' },
                    detail: { type: 'string' },
                },
            },
        },
    },
};
/**
 * The critic's task, delivered as the forked child's user message. The child
 * already holds the parent history; this prompt only sets the adversarial
 * stance and the answer discipline.
 */
const CRITIC_TASK = 'You are the delivery reviewer for this software-engineering session. The '
    + 'conversation you inherited contains a requirements spec recorded with the '
    + 'doublecheck_spec tool (six dimensions: goal, scope, acceptance criteria, '
    + 'failure modes, priorities, non-goals), followed by the implementation '
    + 'work and its test evidence. Assume the delivery FAILS its own spec. Hunt '
    + 'for the strongest objections you can actually support from this session: '
    + 'dimensions the work did not meet, acceptance criteria with no evidence, '
    + 'scope or non-goal violations, failure modes left unhandled. Answer '
    + 'through the required structured output, one entry per objection, citing '
    + 'what in the session supports it. If — and only if — the evidence '
    + 'genuinely satisfies every dimension, return an empty findings list. Do '
    + 'not invent objections; the empty answer is correct when nothing is wrong.';
/** Injected when the critic found nothing supportable. */
export const CLEAN_TEXT = 'Adversary review: the critic found no objections the session evidence can '
    + 'support. The delivery satisfies its spec as far as the review can tell.';
/** Render structured findings as the model-facing review text. */
export function renderFindings(findings) {
    const lines = [
        `Adversary review found ${findings.length} objection(s) the delivery must answer:`,
        '',
    ];
    for (const finding of findings) {
        lines.push(`- [${finding.severity}] ${finding.title}`);
        lines.push(`  ${finding.detail}`);
    }
    lines.push('', 'Answer each: fix what is real, and state plainly what is false.');
    return lines.join('\n');
}
/**
 * Run one adversary review for the given agent and settle it to an
 * injectable outcome. Failures of the review mechanism itself (provider
 * missing, run aborted, model failure) settle as `unavailable` with an
 * honest notice instead of blocking the turn boundary on a broken critic.
 * @param ctx - plugin context carrying the subagents seam.
 * @param config - the adversary knobs.
 * @param agent - the reviewed agent; its session seeds the forked critic.
 * @returns the settled review outcome.
 */
export async function runAdversaryReview(ctx, config, agent) {
    const subagents = ctx.get('subagents');
    if (subagents === undefined) {
        ctx.logger.warn('dsh-doublecheck: adversary review skipped: the ctx.subagents seam is not mounted');
        return { verdict: 'unavailable', findings: [], text: 'Adversary review did not run: the subagents seam is not mounted.' };
    }
    const signal = AbortSignal.timeout(config.adversaryTimeoutMs);
    let run;
    try {
        run = await subagents.start(config.adversaryProvider, {
            label: 'doublecheck-adversary',
            prompt: [{ type: 'text', text: CRITIC_TASK }],
            parent: agent,
            signal,
            ...config.adversaryModel !== null ? { agentOptions: { model: config.adversaryModel } } : {},
            outputSchema: REVIEW_OUTPUT_SCHEMA,
            toolFilter: { allow: config.adversaryTools },
        });
    }
    catch (error) {
        // Provider absence, capability rejection, or a child that could not be
        // composed: the review itself never ran, and the notice says so.
        return { verdict: 'unavailable', findings: [], text: `Adversary review did not run: ${String(error)}` };
    }
    try {
        const result = await run.result;
        if (result.stopReason !== 'completed') {
            return {
                verdict: 'unavailable',
                findings: [],
                text: `Adversary review did not complete (${result.stopReason}); treat the delivery as unreviewed.`,
            };
        }
        // The seam validates `structured` against the requested schema before a
        // completed run settles, so the typed reading needs no re-validation.
        const structured = result.structured;
        const raw = structured?.findings;
        if (!Array.isArray(raw)) {
            return { verdict: 'unavailable', findings: [], text: outputText(result.output, 'Adversary review returned no structured findings.') };
        }
        const findings = raw.slice(0, config.adversaryMaxFindings);
        if (findings.length === 0)
            return { verdict: 'clean', findings: [], text: CLEAN_TEXT };
        return { verdict: 'findings', findings, text: renderFindings(findings) };
    }
    finally {
        await run.dispose();
    }
}
/** Join a result's content blocks, with a fallback line when they are empty. */
function outputText(content, fallback) {
    const parts = [];
    for (const block of content) {
        if (block.type === 'text')
            parts.push(block.text);
    }
    const text = parts.join('\n').trim();
    return text.length > 0 ? text : fallback;
}
/**
 * The injected review message: model-facing prose with the structured
 * findings riding the durable `doublecheck-review` message source, so the
 * doublecheck report can fold the record without re-parsing the prose.
 * @param outcome - the settled review outcome.
 * @returns the injection-ready user message.
 */
export function reviewInjection(outcome) {
    const source = {
        kind: 'doublecheck-review',
        verdict: outcome.verdict,
        findings: outcome.findings,
    };
    return createUserMessage({
        content: [{ type: 'text', text: outcome.text }],
        source,
    });
}
//# sourceMappingURL=review.js.map