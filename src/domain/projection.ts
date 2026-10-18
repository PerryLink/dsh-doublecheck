/**
 * The `doublecheck` session projection: the discipline facts a client renders
 * (Web UI status row), folded from the durable session log alone.
 *
 * The state is plain JSON (the persisted-cache precondition of the projection
 * registry) and mirrors the guard's own fold: a successful `doublecheck_spec`
 * pair commits the spec goal, test runs move the color, implementation edits
 * bump the edit count, and a `doublecheck-review` source record marks the
 * delivery reviewed. Resumed and forked sessions fold to the same view.
 *
 * The WIRE value is not this state: it is one bounded single-line string this
 * module renders (`renderDoublecheckLine`), because a JSON object of these
 * eight fields is at best 126 characters and every generic one-line renderer
 * truncates it — the old object view lost `gateVerdict`/`gateRedCount`
 * outright. See {@link DOUBLECHECK_LINE_MAX}.
 *
 * @module dsh-doublecheck/domain/projection
 */

import type { SessionEvent } from '@deepseek-ai/dsh-session'
import {
  isTestCommand,
  isTestFilePath,
  joinTextBlocks,
  mutationTargetPath,
  parseRawArguments,
  ptcSettle,
  shellCommand,
  testOutcome,
  type TestRunDetection,
} from './evidence.ts'
import { SPEC_TOOL_NAME, type DisciplineStage, type TestColor } from './stages.ts'
import { countRedChecks, type GateState, type GateVerdict } from './gate.ts'
import type { DoublecheckView } from '../types.ts'

/**
 * The hard budget of the wire line, in UTF-16 code units — the same unit
 * `String#length` and every one-line renderer measure.
 *
 * 120 is not arbitrary: the WeChat bridge's generic projection renderer
 * (`dsh-wechat` `renderProjectionValue`) keeps a value only while
 * `value.length <= 120` and otherwise cuts it to 117 units plus `…`. The
 * object-shaped view this projection used to emit was 131 units when EMPTY
 * and 139 with a short goal, so it was truncated for every possible value and
 * the two fields a user reads on a phone (`gateVerdict`, `gateRedCount`) were
 * exactly the ones cut off. A single bounded line keeps the whole payload
 * inside every renderer's first line.
 */
export const DOUBLECHECK_LINE_MAX = 120

/**
 * Longest `goal:` excerpt kept on the line, in UTF-16 code units. A goal is
 * free text and is the one lossy field: it is sanitized to one line and
 * clipped (never dropped silently — a clipped excerpt ends with `…`). The
 * three fields a user reads first (`gate:`, `stage:`, `r<red>`) are never
 * clipped.
 */
export const DOUBLECHECK_GOAL_MAX = 40

/** Segment separator: visually distinct on a phone and outside the goal word charset. */
const SEGMENT = ' | '

/** Marks a value this line deliberately shortened. */
const ELLIPSIS = '…'

/** Above these counts the line prints `<max>+` instead of the exact number. */
const RED_COUNT_MAX = 9999
const EDIT_COUNT_MAX = 99999

/** The projection unit's plain-JSON fold state. */
export interface DoublecheckProjectionState {
  /** The last discipline stage a successful call or test run reached. */
  stage: DisciplineStage
  /** The latest test-run evidence: red = failing since the last pass. */
  color: TestColor
  /** Whether a successful `doublecheck_spec` call exists in the log. */
  hasSpec: boolean
  /** The goal of the latest committed spec, or '' before any spec. */
  specGoal: string
  /** Whether an adversary review record exists in the log. */
  reviewed: boolean
  /** Total implementation edits folded so far. */
  editCount: number
  /** The latest delivery-gate verdict, or 'none' before any gate run. */
  gateVerdict: 'none' | GateVerdict
  /** Red-light (failing) checks of the latest gate run. */
  gateRedCount: number
  /** Spec-tool call ids (with their goals) whose results have not been folded yet. */
  pendingSpecCalls: Record<string, string>
  /** Test-run call ids (with their commands) whose results have not been folded yet. */
  pendingTestCalls: Record<string, string>
}

/** State for the empty log. */
export function emptyDoublecheckState(): DoublecheckProjectionState {
  return {
    stage: 'grill',
    color: 'none',
    hasSpec: false,
    specGoal: '',
    reviewed: false,
    editCount: 0,
    gateVerdict: 'none',
    gateRedCount: 0,
    pendingSpecCalls: {},
    pendingTestCalls: {},
  }
}

/**
 * One-event transition of the `doublecheck` projection unit. Uninterested
 * events return the same state reference (the registry's change gate).
 * @param state - the folded state before `event`.
 * @param event - one committed session event.
 * @param detection - the compiled red/green evidence knobs.
 * @returns the next state; the same reference when the event is not a
 *   discipline fact.
 */
export function applyDoublecheckEvent(
  state: DoublecheckProjectionState,
  event: SessionEvent,
  detection: TestRunDetection,
): DoublecheckProjectionState {
  // A settled PTC sub-dispatch is a discipline fact exactly like a native
  // call. The normalizer accepts both event generations, so the projection
  // does not depend on which one wrote the log.
  const settle = ptcSettle(event)
  if (settle !== undefined) {
    const args = parseRawArguments(settle.arguments)
    const command = shellCommand(settle.name, args, detection)
    if (command !== undefined && isTestCommand(command, detection)) {
      const outcome = testOutcome(joinTextBlocks(settle.content), settle.isError)
      if (outcome === 'fail') return { ...state, color: 'red', stage: 'red' }
      if (outcome === 'pass') return { ...state, color: 'green', stage: 'green' }
    }
    return state
  }
  switch (event.type) {
    case 'tool/call': {
      const args = parseRawArguments(event.data.arguments)
      if (event.data.name === SPEC_TOOL_NAME) {
        const goal = typeof args?.['goal'] === 'string' ? args['goal'] : ''
        return { ...state, pendingSpecCalls: { ...state.pendingSpecCalls, [event.data.callId]: goal } }
      }
      const command = shellCommand(event.data.name, args, detection)
      if (command !== undefined && isTestCommand(command, detection)) {
        return { ...state, pendingTestCalls: { ...state.pendingTestCalls, [event.data.callId]: command } }
      }
      const path = mutationTargetPath(event.data.name, args, detection)
      if (path !== undefined && !isTestFilePath(path, detection)) {
        return { ...state, editCount: state.editCount + 1 }
      }
      return state
    }
    case 'tool/result': {
      const callId = event.data.message.source.callId
      if (event.data.error === undefined && callId in state.pendingSpecCalls) {
        const pendingSpecCalls = { ...state.pendingSpecCalls }
        const goal = pendingSpecCalls[callId] ?? ''
        delete pendingSpecCalls[callId]
        return {
          ...state,
          pendingSpecCalls,
          hasSpec: true,
          specGoal: goal,
          stage: 'design',
        }
      }
      if (callId in state.pendingTestCalls) {
        const pendingTestCalls = { ...state.pendingTestCalls }
        delete pendingTestCalls[callId]
        const outcome = testOutcome(joinTextBlocks(event.data.message.content), event.data.error !== undefined)
        const next = { ...state, pendingTestCalls }
        if (outcome === 'fail') return { ...next, color: 'red', stage: 'red' }
        if (outcome === 'pass') return { ...next, color: 'green', stage: 'green' }
        return next
      }
      return state
    }
    case 'user/message': {
      const source = event.data.source as { kind?: unknown }
      if (source.kind === 'doublecheck-review' && !state.reviewed) {
        return { ...state, reviewed: true }
      }
      return state
    }
    case 'doublecheck/gate': {
      const gate = event.data as GateState
      const redCount = countRedChecks(Object.values(gate.phases))
      if (state.gateVerdict === gate.verdict && state.gateRedCount === redCount) return state
      return { ...state, gateVerdict: gate.verdict, gateRedCount: redCount }
    }
    default:
      return state
  }
}

/**
 * Fold a session log from scratch to the projection state.
 * @param events - the session's append-only event log.
 * @param detection - the compiled red/green evidence knobs.
 * @returns the complete folded state.
 */
export function foldDoublecheckState(
  events: readonly SessionEvent[],
  detection: TestRunDetection,
): DoublecheckProjectionState {
  let state = emptyDoublecheckState()
  for (const event of events) {
    state = applyDoublecheckEvent(state, event, detection)
  }
  return state
}

/**
 * Project the folded state to the wire payload: one status line.
 *
 * The line is built in priority order and every part is bounded, so the total
 * can never exceed {@link DOUBLECHECK_LINE_MAX}:
 *
 * 1. `gate:<verdict> r<red>` — the latest gate verdict and its red-light count.
 * 2. `stage:<stage>` — the discipline stage reached on durable evidence.
 * 3. `test:<color> edits:<n> spec:<yes|no> review:<yes|no>` — the supporting facts.
 * 4. `goal:<excerpt>` — only when a spec exists and the excerpt is non-empty;
 *    clipped to whatever budget parts 1–3 left, at most
 *    {@link DOUBLECHECK_GOAL_MAX} units.
 *
 * The worst case of parts 1–3 is 84 units (`gate:deliverable r9999+`,
 * `stage:design`, `test:green edits:99999+ spec:yes review:yes`), leaving at
 * least 28 units for the goal excerpt — so no part is ever dropped to make
 * room, and a final hard clamp backstops the invariant.
 * @param state - the folded state.
 * @returns the whole current value for the `doublecheck` projection key.
 */
export function viewDoublecheck(state: DoublecheckProjectionState): DoublecheckView {
  return renderDoublecheckLine(state)
}

/**
 * Render the fold state as the bounded single-line wire value.
 *
 * Pure and total: any state (including a hand-built or version-mismatched one
 * with absurd counts) yields a one-line string of at most
 * {@link DOUBLECHECK_LINE_MAX} code units, never a throw.
 * @param state - the folded state.
 * @returns one line, `<= DOUBLECHECK_LINE_MAX` code units, with no newline.
 */
export function renderDoublecheckLine(state: DoublecheckProjectionState): string {
  const head = [
    `gate:${state.gateVerdict} r${boundedCount(state.gateRedCount, RED_COUNT_MAX)}`,
    `stage:${state.stage}`,
    `test:${state.color} edits:${boundedCount(state.editCount, EDIT_COUNT_MAX)}`
      + ` spec:${state.hasSpec ? 'yes' : 'no'} review:${state.reviewed ? 'yes' : 'no'}`,
  ].join(SEGMENT)
  // A goal without a committed spec would contradict `spec:no`.
  const goal = state.hasSpec ? sanitizeGoal(state.specGoal) : ''
  if (goal === '') return clampLine(head)
  const budget = DOUBLECHECK_LINE_MAX - head.length - SEGMENT.length - 'goal:'.length
  if (budget <= 0) return clampLine(head)
  const excerpt = capText(goal, Math.min(budget, DOUBLECHECK_GOAL_MAX))
  if (excerpt === '') return clampLine(head)
  return clampLine(`${head}${SEGMENT}goal:${excerpt}`)
}

/**
 * Render a count for the line: non-finite and negative inputs fold to `0`, and
 * a count above `maximum` prints `<maximum>+` so the field stays bounded.
 * @param value - the folded count.
 * @param maximum - the largest exact count the line prints.
 * @returns a bounded decimal string.
 */
function boundedCount(value: number, maximum: number): string {
  if (!Number.isFinite(value)) return '0'
  const count = Math.max(0, Math.trunc(value))
  return count > maximum ? `${maximum}+` : String(count)
}

/**
 * Flatten a free-text goal to one safe line: control characters (including
 * newlines and the C1 range) become spaces, the segment separator becomes `/`,
 * whitespace runs collapse, and the result is trimmed. The wire value must be
 * ONE line — the WeChat renderer keeps only the first line of a multi-line
 * value. `\p{Cc}` is the Unicode control category (U+0000–U+001F and
 * U+007F–U+009F), so no literal control character appears in this pattern.
 * @param goal - the raw committed spec goal.
 * @returns the sanitized single-line goal, possibly empty.
 */
function sanitizeGoal(goal: string): string {
  return goal
    .replace(/\p{Cc}/gu, ' ')
    .replace(/\|/gu, '/')
    .replace(/\s+/gu, ' ')
    .trim()
}

/**
 * Cut `text` to at most `budget` code units, marking a real cut with `…` and
 * never splitting a surrogate pair.
 * @param text - the text to bound.
 * @param budget - the maximum length of the result.
 * @returns the text, or a `…`-terminated prefix of it.
 */
function capText(text: string, budget: number): string {
  if (budget <= 0) return ''
  if (text.length <= budget) return text
  if (budget <= ELLIPSIS.length) return ELLIPSIS
  return `${text.slice(0, safeEnd(text, budget - ELLIPSIS.length))}${ELLIPSIS}`
}

/**
 * Backstop for {@link DOUBLECHECK_LINE_MAX}: the line is bounded by
 * construction, so this is unreachable today and exists so a future field
 * cannot escape the budget silently.
 * @param line - the assembled line.
 * @returns the line, or a `…`-terminated prefix within budget.
 */
function clampLine(line: string): string {
  return capText(line, DOUBLECHECK_LINE_MAX)
}

/**
 * The largest cut index that does not split a UTF-16 surrogate pair: a lone
 * surrogate is rejected by the WeChat transport (`ret=-1 invalid request`).
 * @param text - the text being cut.
 * @param end - the proposed cut index.
 * @returns `end`, or `end - 1` when it would split a pair.
 */
function safeEnd(text: string, end: number): number {
  if (end <= 0) return 0
  const previous = text.charCodeAt(end - 1)
  return previous >= 0xD800 && previous <= 0xDBFF ? end - 1 : end
}
