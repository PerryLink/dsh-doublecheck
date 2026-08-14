/**
 * The doublecheck report fold: consolidate the durable discipline evidence of
 * one session into report facts, derive the delivery verdict, and render the
 * model-facing report document.
 *
 * Everything here folds the session log alone — the spec (from the
 * `doublecheck_spec` call arguments), the test-run timeline (red/green
 * outcomes), the implementation edits, and the injected
 * `doublecheck-review` source records — so a report re-derived after resume
 * or fork reads identically.
 *
 * @module dsh-doublecheck/domain/report
 */

import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type { ObjectJsonSchema } from '@deepseek-ai/dsh-tools'
import type { WorkflowMeta } from '@deepseek-ai/dsh-workflow'
import {
  isTestCommand,
  isTestFilePath,
  joinTextBlocks,
  mutationTargetPath,
  parseRawArguments,
  shellCommand,
  testOutcome,
  type TestRunDetection,
} from './evidence.ts'
import { SPEC_TOOL_NAME } from './stages.ts'
import {
  VERIFY_DIMENSIONS,
  type GrilledSpec,
  type ReportVerdict,
  type ReviewFinding,
  type ReviewVerdict,
  type VerifyCheck,
} from './vocabulary.ts'

/** One timeline row of the report fold, in log order. */
export interface ReportTimelineEntry {
  /** The evidence kind this row records. */
  kind: 'spec' | 'red' | 'green' | 'review'
  /** Short human-readable detail (command, spec goal preview, or verdict). */
  detail: string
}

/** The folded discipline facts of one session. */
export interface ReportFacts {
  /** The latest committed spec, or null before any spec exists. */
  spec: GrilledSpec | null
  /** Counts of failing and passing test runs on record. */
  testRuns: { failed: number; passed: number }
  /** Spec/test/review evidence in log order. */
  timeline: ReportTimelineEntry[]
  /** Implementation edits (non-test-file mutations) on record. */
  edits: number
  /** The latest injected adversary review, or null when none ran. */
  review: { verdict: ReviewVerdict; findings: ReviewFinding[] } | null
}

/** The full canonical report value the tool returns. */
export interface ReportData extends ReportFacts {
  /** The derived delivery status. */
  verdict: ReportVerdict
  /**
   * Verification checks, when the verify workflow ran. `complete` is true
   * only when every spec dimension returned a verdict, so `proven` never
   * rests on silently missing dimensions.
   */
  verification: { checks: VerifyCheck[]; complete: boolean } | null
  /** Workspace markdown copy outcome. */
  path: string | null
  written: boolean
}

/** Maximum timeline rows rendered into the report document. */
const TIMELINE_RENDER_CAP = 20

/** Empty facts: nothing evidenced yet. */
export function emptyReportFacts(): ReportFacts {
  return { spec: null, testRuns: { failed: 0, passed: 0 }, timeline: [], edits: 0, review: null }
}

/**
 * Fold a session log into report facts.
 * @param events - the session's append-only event log.
 * @param detection - the compiled test-run/mutation detection knobs.
 * @returns the complete folded facts.
 */
export function foldReportFacts(events: readonly SessionEvent[], detection: TestRunDetection): ReportFacts {
  const facts = emptyReportFacts()
  const pendingTests = new Map<string, string>()
  /** Spec calls awaiting a result: only a successful pair commits the spec. */
  const pendingSpecs = new Map<string, GrilledSpec>()
  for (const event of events) {
    switch (event.type) {
      case 'tool/call': {
        const args = parseRawArguments(event.data.arguments)
        if (event.data.name === SPEC_TOOL_NAME) {
          const spec = readSpecFromArgs(args)
          if (spec !== null) pendingSpecs.set(event.data.callId, spec)
        }
        const command = shellCommand(event.data.name, args, detection)
        if (command !== undefined && isTestCommand(command, detection)) {
          pendingTests.set(event.data.callId, command)
        }
        const path = mutationTargetPath(event.data.name, args, detection)
        if (path !== undefined && !isTestFilePath(path, detection)) {
          facts.edits += 1
        }
        break
      }
      case 'tool/result': {
        const callId = event.data.message.source.callId
        const spec = pendingSpecs.get(callId)
        if (spec !== undefined && event.data.error === undefined) {
          pendingSpecs.delete(callId)
          facts.spec = spec
          facts.timeline.push({ kind: 'spec', detail: preview(spec.goal) })
        } else if (spec !== undefined) {
          pendingSpecs.delete(callId)
        }
        const command = pendingTests.get(callId)
        if (command === undefined) break
        pendingTests.delete(callId)
        foldTestRun(facts, command, testOutcome(joinTextBlocks(event.data.message.content), event.data.error !== undefined))
        break
      }
      case 'tool/code-dispatch': {
        const args = parseRawArguments(event.data.arguments)
        const command = shellCommand(event.data.name, args, detection)
        if (command !== undefined && isTestCommand(command, detection)) {
          foldTestRun(facts, command, testOutcome(joinTextBlocks(event.data.content), event.data.isError))
        }
        // Code Mode dispatches run through the same pre-execute policy gates,
        // so a dispatched edit is a real implementation edit and must count
        // toward the report exactly like a native call.
        const path = mutationTargetPath(event.data.name, args, detection)
        if (path !== undefined && !isTestFilePath(path, detection)) {
          facts.edits += 1
        }
        break
      }
      case 'user/message': {
        const source = event.data.source
        if ((source as { kind?: unknown }).kind !== 'doublecheck-review') break
        const record = source as unknown as { verdict: ReviewVerdict; findings: ReviewFinding[] }
        facts.review = { verdict: record.verdict, findings: [...record.findings] }
        facts.timeline.push({ kind: 'review', detail: record.verdict })
        break
      }
    }
  }
  return facts
}

/** Fold one settled test-run outcome into the counts and timeline. */
function foldTestRun(facts: ReportFacts, command: string, outcome: ReturnType<typeof testOutcome>): void {
  if (outcome === 'fail') {
    facts.testRuns.failed += 1
    facts.timeline.push({ kind: 'red', detail: preview(command) })
  } else if (outcome === 'pass') {
    facts.testRuns.passed += 1
    facts.timeline.push({ kind: 'green', detail: preview(command) })
  }
}

/** Read the six spec fields from a spec tool call's arguments, or null when malformed. */
function readSpecFromArgs(args: Record<string, unknown> | undefined): GrilledSpec | null {
  if (args === undefined) return null
  const { goal, scope, acceptanceCriteria, failureModes, priorities, nonGoals } = args as Record<string, unknown>
  if (typeof goal !== 'string' || typeof scope !== 'string' || typeof acceptanceCriteria !== 'string'
    || typeof failureModes !== 'string' || typeof priorities !== 'string' || typeof nonGoals !== 'string') {
    return null
  }
  return { goal, scope, acceptanceCriteria, failureModes, priorities, nonGoals }
}

/**
 * Derive the delivery verdict from the folded facts, the optional review,
 * and the optional verification outcome.
 * @param facts - the folded session facts.
 * @param verification - verification outcome when the verify workflow ran, else null.
 * @returns the report verdict.
 */
export function deriveReportVerdict(facts: ReportFacts, verification: ReportData['verification']): ReportVerdict {
  if (facts.spec === null) return 'grill'
  if (facts.edits === 0) return 'draft'
  const lastTest = facts.timeline.findLast(entry => entry.kind === 'red' || entry.kind === 'green')
  if (lastTest?.kind === 'red') return 'red'
  if (verification !== null) {
    if (verification.checks.some(check => check.verdict === 'fail')) return 'challenged'
    // A missing dimension is not a pass: `proven` requires a verdict for
    // every spec dimension.
    return verification.complete ? 'proven' : 'unverified'
  }
  if (facts.review === null || facts.review.verdict === 'unavailable') return 'green'
  return facts.review.verdict === 'findings' ? 'objections' : 'verified'
}

/** Render the report facts as the model-facing markdown document. */
export function renderReportMarkdown(data: ReportData): string {
  const lines: string[] = [
    '# Doublecheck report',
    '',
    `> Verdict: **${data.verdict}**`,
    '',
    '## Spec',
  ]
  if (data.spec === null) {
    lines.push('No spec recorded; the requirements grill has not committed anything yet.', '')
  } else {
    lines.push(
      `- Goal: ${data.spec.goal}`,
      `- Scope: ${data.spec.scope}`,
      `- Acceptance criteria: ${data.spec.acceptanceCriteria}`,
      `- Failure modes: ${data.spec.failureModes}`,
      `- Priorities: ${data.spec.priorities}`,
      `- Non-goals: ${data.spec.nonGoals}`,
      '',
    )
  }
  lines.push(
    '## Test evidence',
    `- failing runs: ${data.testRuns.failed}`,
    `- passing runs: ${data.testRuns.passed}`,
    '',
  )
  const rows = data.timeline.slice(-TIMELINE_RENDER_CAP)
  lines.push(...rows.map(row => `- [${row.kind}] ${row.detail}`))
  if (data.timeline.length > rows.length) {
    lines.push(`- … ${data.timeline.length - rows.length} earlier rows omitted`)
  }
  lines.push('', '## Adversary review')
  if (data.review === null) {
    lines.push('No adversary review ran for this session.')
  } else if (data.review.verdict === 'findings') {
    lines.push(...data.review.findings.map(finding => `- [${finding.severity}] ${finding.title} — ${finding.detail}`))
  } else {
    lines.push(`Verdict: ${data.review.verdict}`)
  }
  lines.push('', '## Verification')
  if (data.verification === null) {
    lines.push('Not run.')
  } else {
    for (const check of data.verification.checks) {
      lines.push(`- [${check.verdict}] ${check.dimension}: ${check.evidence} ${check.note.length > 0 ? `(${check.note})` : ''}`.trim())
    }
    if (!data.verification.complete) {
      lines.push(`- … not every spec dimension returned a verdict; the delivery is not proven.`)
    }
  }
  lines.push('', `## Delivery`, `- implementation edits: ${data.edits}`, '')
  return lines.join('\n')
}

/** The structured output each verification child must satisfy. */
export const VERIFY_CHECK_SCHEMA: ObjectJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['dimension', 'verdict', 'evidence', 'note'],
  properties: {
    dimension: { type: 'string', enum: [...VERIFY_DIMENSIONS] },
    verdict: { type: 'string', enum: ['pass', 'fail'] },
    evidence: { type: 'string' },
    note: { type: 'string' },
  },
}

/** How the verify workflow fans its checkers out. */
export type VerifyMode = 'all' | 'single'

/** The verify workflow identity block. */
export const VERIFY_META: WorkflowMeta = {
  name: 'doublecheck-verify',
  description: 'Verify a doublecheck delivery across the six spec dimensions and return one check per dimension.',
  phases: [{ title: 'doublecheck verify' }],
}

/**
 * The single-checker structured output: one agent auditing every spec
 * dimension and returning a check per dimension. Mirrors the parallel
 * mode's `{ checks: [...] }` result shape so the fold is identical.
 */
const VERIFY_BATCH_SCHEMA: ObjectJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['checks'],
  properties: {
    checks: { type: 'array', items: VERIFY_CHECK_SCHEMA },
  },
}

/**
 * Build the verify workflow script body.
 * @param mode - `all` fans out one parallel checker per spec dimension;
 * `single` runs one checker over every dimension (cheaper, one subagent).
 * @returns the plain-JS script body for `WorkflowStartRequest.script`.
 */
export function buildVerifyScript(mode: VerifyMode): string {
  if (mode === 'single') {
    return [
      "phase('doublecheck verify')",
      'const checks = await agent(',
      "  'You verify every dimension of a requirements spec against the session you inherited. "
        + "The spec: ' + JSON.stringify(args.spec) + '. "
        + 'Assume the delivery FAILS each dimension. Examine the inherited session for evidence: '
        + 'the recorded spec, the red/green test runs, the edits, and any review findings. '
        + 'Answer through the required structured output: one check per dimension; pass only when the session evidence '
        + 'satisfies that dimension, fail otherwise, with evidence cited from the session '
        + "and a note on what to fix.',",
      '  { label: \'verify-all\', schema: ' + JSON.stringify(VERIFY_BATCH_SCHEMA) + ' })',
      'return { checks: checks.checks.filter(Boolean) }',
    ].join('\n')
  }
  return [
    "phase('doublecheck verify')",
    'const checks = await parallel(args.dimensions.map(function (dimension) {',
    '  return function () {',
    "    return agent('You verify one dimension of a requirements spec against the session you inherited. "
      + "The dimension: ' + dimension + '. The spec says: ' + args.spec[dimension] + '. "
      + "Assume the delivery FAILS this dimension. Examine the inherited session for evidence: "
      + "the recorded spec, the red/green test runs, the edits, and any review findings. "
      + "Answer through the required structured output: pass only when the session evidence "
      + "satisfies the dimension; fail otherwise, with evidence cited from the session "
      + "and a note on what to fix.',",
    `    { label: 'verify-' + dimension, schema: ${JSON.stringify(VERIFY_CHECK_SCHEMA)} })`,
    '  }',
    '}))',
    'return { checks: checks.filter(Boolean) }',
  ].join('\n')
}

/** Truncate a spec goal for timeline rows. */
function preview(text: string): string {
  return text.length > 120 ? `${text.slice(0, 120)}…` : text
}
