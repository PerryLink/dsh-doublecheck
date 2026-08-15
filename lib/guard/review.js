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
import { PROSE } from "./prose.js";
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
/** Injected when the critic found nothing supportable (English contract text). */
export const CLEAN_TEXT = PROSE.en.reviewClean;
/** Severity ranks for a deterministic, blocker-first findings order. */
const SEVERITY_RANK = {
    blocker: 0,
    major: 1,
    minor: 2,
    info: 3,
};
/**
 * Sort findings blocker-first, keeping the critic's original order within a
 * severity. A deterministic order means the most threatening objection leads
 * both the injected prose and the durable record.
 * @param findings - the structured findings as produced by the critic.
 * @returns the same findings, severity-ordered.
 */
export function sortFindings(findings) {
    return [...findings].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}
/** Render structured findings as the model-facing review text. */
export function renderFindings(findings, prose = PROSE.en, totalCount = findings.length) {
    const lines = [
        prose.reviewFindingsHeader(findings.length),
        '',
    ];
    for (const finding of findings) {
        lines.push(`- [${finding.severity}] ${finding.title}`);
        lines.push(`  ${finding.detail}`);
    }
    if (totalCount > findings.length) {
        lines.push(prose.reviewHeldBack(totalCount - findings.length));
    }
    lines.push('', prose.reviewFindingsFooter);
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
 * @param turnSignal - the turn's abort signal; cancelling the turn cancels
 * the review instead of letting it run out the timeout.
 * @returns the settled review outcome.
 */
export async function runAdversaryReview(ctx, config, agent, turnSignal) {
    const prose = PROSE[config.language];
    const subagents = ctx.get('subagents');
    if (subagents === undefined) {
        ctx.logger.warn('dsh-doublecheck: adversary review skipped: the ctx.subagents seam is not mounted');
        return { verdict: 'unavailable', findings: [], text: prose.reviewUnavailableSeam };
    }
    const timeout = AbortSignal.timeout(config.adversaryTimeoutMs);
    const signal = turnSignal === undefined ? timeout : AbortSignal.any([turnSignal, timeout]);
    let run;
    try {
        run = await subagents.start(config.adversaryProvider, {
            label: 'doublecheck-adversary',
            prompt: [{ type: 'text', text: prose.criticTask }],
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
        return { verdict: 'unavailable', findings: [], text: prose.reviewUnavailableFailed(String(error)) };
    }
    try {
        const result = await settleResult(run, signal, prose, config.adversaryMaxFindings);
        return result;
    }
    finally {
        await run.dispose();
    }
}
/** Await one critic run; a rejection settles as an honest unavailable notice. */
async function settleResult(run, signal, prose, maxFindings) {
    let result;
    try {
        result = await run.result;
    }
    catch (error) {
        if (signal.aborted) {
            return { verdict: 'unavailable', findings: [], text: prose.reviewUnavailableStopped('aborted') };
        }
        // A broken critic must not throw into the turn-stopping chain.
        return { verdict: 'unavailable', findings: [], text: prose.reviewUnavailableFailed(String(error)) };
    }
    if (result.stopReason !== 'completed') {
        return {
            verdict: 'unavailable',
            findings: [],
            text: prose.reviewUnavailableStopped(result.stopReason),
        };
    }
    // The seam validates `structured` against the requested schema before a
    // completed run settles, so the typed reading needs no re-validation.
    const structured = result.structured;
    const raw = structured?.findings;
    if (!Array.isArray(raw)) {
        return { verdict: 'unavailable', findings: [], text: outputText(result.output, prose.reviewUnavailableNoFindings) };
    }
    const findings = sortFindings(raw).slice(0, maxFindings);
    if (findings.length === 0)
        return { verdict: 'clean', findings: [], text: prose.reviewClean };
    return { verdict: 'findings', findings, text: renderFindings(findings, prose, raw.length) };
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
