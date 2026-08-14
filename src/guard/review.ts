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

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { ContentBlock, MessageSource, UserMessage } from '@deepseek-ai/dsh-llm'
import type { SubagentRun } from '@deepseek-ai/dsh-subagent'
import type { ObjectJsonSchema } from '@deepseek-ai/dsh-tools'
import type { ReviewFinding, ReviewVerdict } from '../domain/vocabulary.ts'
import { PROSE, type GuardProse, type ProseLanguage } from './prose.ts'

/** The adversary knobs the review runner reads. */
export interface AdversaryConfig {
  adversaryProvider: string
  adversaryModel: string | null
  adversaryMaxFindings: number
  adversaryTools: string[]
  adversaryTimeoutMs: number
  /** Language of the injected review prose. */
  language: ProseLanguage
}

/** The settled outcome of one review run, ready for injection. */
export interface ReviewOutcome {
  verdict: ReviewVerdict
  findings: ReviewFinding[]
  /** Model-facing prose for the injection channel. */
  text: string
}

/**
 * Structured output the critic must satisfy: a findings list whose entries
 * carry a severity, a one-line title, and the supporting detail.
 */
export const REVIEW_OUTPUT_SCHEMA: ObjectJsonSchema = {
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
}

/**
 * The critic's task, delivered as the forked child's user message. The child
 * already holds the parent history; this prompt only sets the adversarial
 * stance and the answer discipline.
 */
const CRITIC_TASK =
  'You are the delivery reviewer for this software-engineering session. The '
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
  + 'not invent objections; the empty answer is correct when nothing is wrong.'

/** Injected when the critic found nothing supportable (English contract text). */
export const CLEAN_TEXT = PROSE.en.reviewClean

/** Render structured findings as the model-facing review text. */
export function renderFindings(findings: readonly ReviewFinding[], prose: GuardProse = PROSE.en): string {
  const lines = [
    prose.reviewFindingsHeader(findings.length),
    '',
  ]
  for (const finding of findings) {
    lines.push(`- [${finding.severity}] ${finding.title}`)
    lines.push(`  ${finding.detail}`)
  }
  lines.push('', prose.reviewFindingsFooter)
  return lines.join('\n')
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
export async function runAdversaryReview(
  ctx: Context,
  config: AdversaryConfig,
  agent: Agent,
  turnSignal?: AbortSignal,
): Promise<ReviewOutcome> {
  const prose = PROSE[config.language]
  const subagents = ctx.get('subagents')
  if (subagents === undefined) {
    ctx.logger.warn('dsh-doublecheck: adversary review skipped: the ctx.subagents seam is not mounted')
    return { verdict: 'unavailable', findings: [], text: prose.reviewUnavailableSeam }
  }
  const timeout = AbortSignal.timeout(config.adversaryTimeoutMs)
  const signal = turnSignal === undefined ? timeout : AbortSignal.any([turnSignal, timeout])
  let run: SubagentRun
  try {
    run = await subagents.start(config.adversaryProvider, {
      label: 'doublecheck-adversary',
      prompt: [{ type: 'text', text: CRITIC_TASK }],
      parent: agent,
      signal,
      ...config.adversaryModel !== null ? { agentOptions: { model: config.adversaryModel } } : {},
      outputSchema: REVIEW_OUTPUT_SCHEMA,
      toolFilter: { allow: config.adversaryTools },
    })
  } catch (error) {
    // Provider absence, capability rejection, or a child that could not be
    // composed: the review itself never ran, and the notice says so.
    return { verdict: 'unavailable', findings: [], text: prose.reviewUnavailableFailed(String(error)) }
  }
  try {
    const result = await settleResult(run, signal, prose, config.adversaryMaxFindings)
    return result
  } finally {
    await run.dispose()
  }
}

/** Await one critic run; a rejection settles as an honest unavailable notice. */
async function settleResult(run: SubagentRun, signal: AbortSignal, prose: GuardProse, maxFindings: number): Promise<ReviewOutcome> {
  let result: Awaited<typeof run.result>
  try {
    result = await run.result
  } catch (error) {
    if (signal.aborted) {
      return { verdict: 'unavailable', findings: [], text: prose.reviewUnavailableStopped('aborted') }
    }
    // A broken critic must not throw into the turn-stopping chain.
    return { verdict: 'unavailable', findings: [], text: prose.reviewUnavailableFailed(String(error)) }
  }
  if (result.stopReason !== 'completed') {
    return {
      verdict: 'unavailable',
      findings: [],
      text: prose.reviewUnavailableStopped(result.stopReason),
    }
  }
  // The seam validates `structured` against the requested schema before a
  // completed run settles, so the typed reading needs no re-validation.
  const structured = result.structured as { findings?: unknown } | undefined
  const raw = structured?.findings
  if (!Array.isArray(raw)) {
    return { verdict: 'unavailable', findings: [], text: outputText(result.output, prose.reviewUnavailableNoFindings) }
  }
  const findings = raw.slice(0, maxFindings) as ReviewFinding[]
  if (findings.length === 0) return { verdict: 'clean', findings: [], text: prose.reviewClean }
  return { verdict: 'findings', findings, text: renderFindings(findings, prose) }
}

/** Join a result's content blocks, with a fallback line when they are empty. */
function outputText(content: readonly ContentBlock[], fallback: string): string {
  const parts: string[] = []
  for (const block of content) {
    if (block.type === 'text') parts.push(block.text)
  }
  const text = parts.join('\n').trim()
  return text.length > 0 ? text : fallback
}

/**
 * The injected review message: model-facing prose with the structured
 * findings riding the durable `doublecheck-review` message source, so the
 * doublecheck report can fold the record without re-parsing the prose.
 * @param outcome - the settled review outcome.
 * @returns the injection-ready user message.
 */
export function reviewInjection(outcome: ReviewOutcome): UserMessage {
  const source: MessageSource = {
    kind: 'doublecheck-review',
    verdict: outcome.verdict,
    findings: outcome.findings,
  }
  return createUserMessage({
    content: [{ type: 'text', text: outcome.text }],
    source,
  })
}
