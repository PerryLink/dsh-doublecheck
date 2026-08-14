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
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { UserMessage } from '@deepseek-ai/dsh-llm';
import type { ObjectJsonSchema } from '@deepseek-ai/dsh-tools';
import type { ReviewFinding, ReviewVerdict } from '../domain/vocabulary.ts';
/** The adversary knobs the review runner reads. */
export interface AdversaryConfig {
    adversaryProvider: string;
    adversaryModel: string | null;
    adversaryMaxFindings: number;
    adversaryTools: string[];
    adversaryTimeoutMs: number;
}
/** The settled outcome of one review run, ready for injection. */
export interface ReviewOutcome {
    verdict: ReviewVerdict;
    findings: ReviewFinding[];
    /** Model-facing prose for the injection channel. */
    text: string;
}
/**
 * Structured output the critic must satisfy: a findings list whose entries
 * carry a severity, a one-line title, and the supporting detail.
 */
export declare const REVIEW_OUTPUT_SCHEMA: ObjectJsonSchema;
/** Injected when the critic found nothing supportable. */
export declare const CLEAN_TEXT: string;
/** Render structured findings as the model-facing review text. */
export declare function renderFindings(findings: readonly ReviewFinding[]): string;
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
export declare function runAdversaryReview(ctx: Context, config: AdversaryConfig, agent: Agent): Promise<ReviewOutcome>;
/**
 * The injected review message: model-facing prose with the structured
 * findings riding the durable `doublecheck-review` message source, so the
 * doublecheck report can fold the record without re-parsing the prose.
 * @param outcome - the settled review outcome.
 * @returns the injection-ready user message.
 */
export declare function reviewInjection(outcome: ReviewOutcome): UserMessage;
//# sourceMappingURL=review.d.ts.map