/**
 * The dsh-doublecheck discipline state machine.
 *
 * Six stages: `grill` (settle requirements) → `design` (spec committed) →
 * `red` (failing test) → `green` (passing test) → `review` (self-review) →
 * `verify` (delivery proof). v0.1 implemented the first transition; v0.2 adds
 * the red/green evidence transitions folded from durable test-run records.
 *
 * The state derives from the session log, never from process memory: a
 * `doublecheck_spec` call with a successful result advances past `grill`, a
 * failing test run marks `red`, a passing run marks `green`, and any
 * implementation edit after the latest passing run re-arms the green gate.
 * Resumed and forked sessions fold to the same state as the live run.
 *
 * @module dsh-doublecheck/domain/stages
 */

import type { SessionEvent } from '@deepseek-ai/dsh-session'
import {
  emptyDetection,
  isTestCommand,
  isTestFilePath,
  joinTextBlocks,
  mutationTargetPath,
  parseRawArguments,
  shellCommand,
  testOutcome,
  type TestRunDetection,
} from './evidence.ts'

/** The discipline stages, in execution order. */
export type DisciplineStage = 'grill' | 'design' | 'red' | 'green' | 'review' | 'verify'

/** All discipline stages in order. */
export const DISCIPLINE_STAGES: readonly DisciplineStage[] = [
  'grill', 'design', 'red', 'green', 'review', 'verify',
]

/** Name of the model-facing tool that commits a grilled requirements spec. */
export const SPEC_TOOL_NAME = 'doublecheck_spec'

/** Name of the model-facing tool that consolidates the delivery report. */
export const REPORT_TOOL_NAME = 'doublecheck_report'

/** Which stage a successful call of the named tool advances the session to. */
const STAGE_BY_TOOL: Readonly<Record<string, DisciplineStage>> = {
  [SPEC_TOOL_NAME]: 'design',
  [REPORT_TOOL_NAME]: 'verify',
}

/** The current red/green color of the session: the latest test-run evidence. */
export type TestColor = 'none' | 'red' | 'green'

/**
 * The folded discipline facts for one session log. The `pending*` sets are
 * fold bookkeeping: calls whose results have not been folded yet, carried
 * across incremental fold batches.
 */
export interface DisciplineState {
  /** The last stage a successful discipline call or test run reached. */
  stage: DisciplineStage
  /** Whether a successful `doublecheck_spec` call exists in the log. */
  hasSpec: boolean
  /** The log sequence of the latest successful spec commit (0 = none). Guards compare it with the latest direct user task to reopen the grill on new tasks. */
  specSeq: number
  /** The latest test-run evidence: red = failing since the last pass. */
  color: TestColor
  /** An implementation edit happened after the latest passing test run. */
  pendingGreen: boolean
  /** Total implementation edits folded so far (the green-gate reminder epoch). */
  editCount: number
  /** Stage-tool call ids whose results have not been folded yet, mapped to the stage they advance. */
  pendingStageCalls: Map<string, DisciplineStage>
  /** Test-run call ids whose results have not been folded yet. */
  pendingTestCalls: Set<string>
}

/** A fresh fold state: nothing evidenced yet. */
export function emptyDisciplineState(): DisciplineState {
  return {
    stage: 'grill',
    hasSpec: false,
    specSeq: 0,
    color: 'none',
    pendingGreen: false,
    editCount: 0,
    pendingStageCalls: new Map(),
    pendingTestCalls: new Set(),
  }
}

/**
 * Call ids of successful invocations of `toolName` in the given event log. A
 * call is successful when some `tool/result` pairs with its `callId` and
 * carries no error record. One pass over the log: results always follow
 * their calls, so a pending call set pairs them in place.
 * @param events - the session's append-only event log.
 * @param toolName - the tool whose successful calls are collected.
 * @returns every successful call id, in log order.
 */
export function successfulToolCalls(events: readonly SessionEvent[], toolName: string): string[] {
  const pending = new Set<string>()
  const succeeded: string[] = []
  for (const event of events) {
    if (event.type === 'tool/call') {
      if (event.data.name === toolName) pending.add(event.data.callId)
    } else if (event.type === 'tool/result') {
      const callId = event.data.message.source.callId
      if (event.data.error === undefined && pending.delete(callId)) succeeded.push(callId)
    }
  }
  return succeeded
}

/**
 * Fold `events[start..end)` into the discipline state. Each event is folded
 * once; the state's pending sets carry unmatched calls across batches, so the
 * caller can advance an existing state over the newly appended tail instead
 * of refolding the whole log.
 * @param state - the state to advance (start one via {@link emptyDisciplineState}).
 * @param events - the session's append-only event log.
 * @param start - first index to fold.
 * @param detection - the compiled red/green evidence knobs.
 * @returns the same state instance, advanced.
 */
export function foldDisciplineRange(
  state: DisciplineState,
  events: readonly SessionEvent[],
  start: number,
  detection: TestRunDetection,
): DisciplineState {
  for (let index = start; index < events.length; index += 1) {
    const event = events[index]
    if (event === undefined) continue
    switch (event.type) {
      case 'tool/call': {
        const args = parseRawArguments(event.data.arguments)
        const stage = STAGE_BY_TOOL[event.data.name]
        if (stage !== undefined) {
          state.pendingStageCalls.set(event.data.callId, stage)
        }
        const command = shellCommand(event.data.name, args, detection)
        if (command !== undefined && isTestCommand(command, detection)) {
          state.pendingTestCalls.add(event.data.callId)
        }
        const path = mutationTargetPath(event.data.name, args, detection)
        if (path !== undefined && !isTestFilePath(path, detection)) {
          state.pendingGreen = true
          state.editCount += 1
        }
        break
      }
      case 'tool/result': {
        const callId = event.data.message.source.callId
        const stage = state.pendingStageCalls.get(callId)
        if (stage !== undefined) {
          state.pendingStageCalls.delete(callId)
          if (event.data.error === undefined) {
            if (stage === 'design') {
              state.hasSpec = true
              state.specSeq = event.seq
            }
            state.stage = stage
          }
        }
        if (state.pendingTestCalls.delete(callId)) {
          foldTestOutcome(state, testOutcome(joinTextBlocks(event.data.message.content), event.data.error !== undefined))
        }
        break
      }
      case 'tool/code-dispatch': {
        const args = parseRawArguments(event.data.arguments)
        const command = shellCommand(event.data.name, args, detection)
        if (command !== undefined && isTestCommand(command, detection)) {
          foldTestOutcome(state, testOutcome(joinTextBlocks(event.data.content), event.data.isError))
        }
        // Code Mode dispatches run through the same pre-execute policy gates,
        // so a dispatched edit is a real implementation edit and must count
        // toward the green gate and the report exactly like a native call.
        const path = mutationTargetPath(event.data.name, args, detection)
        if (path !== undefined && !isTestFilePath(path, detection)) {
          state.pendingGreen = true
          state.editCount += 1
        }
        break
      }
    }
  }
  return state
}

/** Apply one test-run outcome to the color and the green gate. */
function foldTestOutcome(state: DisciplineState, outcome: ReturnType<typeof testOutcome>): void {
  if (outcome === 'fail') {
    state.color = 'red'
    state.stage = 'red'
  } else if (outcome === 'pass') {
    state.color = 'green'
    state.stage = 'green'
    state.pendingGreen = false
  }
}

/**
 * Fold a session log from scratch to its current discipline state.
 * @param events - the session's append-only event log.
 * @param detection - the compiled red/green evidence knobs; omit to ignore test runs.
 * @returns the complete folded state.
 */
export function foldDisciplineState(events: readonly SessionEvent[], detection: TestRunDetection = emptyDetection()): DisciplineState {
  return foldDisciplineRange(emptyDisciplineState(), events, 0, detection)
}

/**
 * Fold a session log to its current discipline stage. Only successful calls
 * and real test runs advance the stage; a failed spec attempt leaves the
 * session in `grill`, and red/green move with the latest test evidence.
 * @param events - the session's append-only event log.
 * @param detection - the compiled red/green evidence knobs; omit to ignore test runs.
 * @returns the last stage reached, or `grill`.
 */
export function foldDisciplineStage(events: readonly SessionEvent[], detection: TestRunDetection = emptyDetection()): DisciplineStage {
  return foldDisciplineState(events, detection).stage
}

/**
 * Whether the session's requirements grill has produced a committed spec.
 * @param events - the session's append-only event log.
 * @returns true when a successful `doublecheck_spec` call exists in the log;
 * the scan stops at the first successful pair it finds.
 */
export function sessionHasSpec(events: readonly SessionEvent[]): boolean {
  const pending = new Set<string>()
  for (const event of events) {
    if (event.type === 'tool/call') {
      if (event.data.name === SPEC_TOOL_NAME) pending.add(event.data.callId)
    } else if (event.type === 'tool/result') {
      if (event.data.error === undefined && pending.delete(event.data.message.source.callId)) return true
    }
  }
  return false
}
