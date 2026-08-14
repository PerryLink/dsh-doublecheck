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
 * @module dsh-doublecheck/domain/projection
 */

import type { SessionEvent } from '@deepseek-ai/dsh-session'
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
import { SPEC_TOOL_NAME, type DisciplineStage, type TestColor } from './stages.ts'
import type { DoublecheckView } from '../types.ts'

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
    case 'tool/code-dispatch': {
      const args = parseRawArguments(event.data.arguments)
      const command = shellCommand(event.data.name, args, detection)
      if (command !== undefined && isTestCommand(command, detection)) {
        const outcome = testOutcome(joinTextBlocks(event.data.content), event.data.isError)
        if (outcome === 'fail') return { ...state, color: 'red', stage: 'red' }
        if (outcome === 'pass') return { ...state, color: 'green', stage: 'green' }
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
 * Project the folded state to the wire payload.
 * @param state - the folded state.
 * @returns the whole current value for the `doublecheck` projection key.
 */
export function viewDoublecheck(state: DoublecheckProjectionState): DoublecheckView {
  return {
    stage: state.stage,
    color: state.color,
    hasSpec: state.hasSpec,
    specGoal: state.specGoal,
    reviewed: state.reviewed,
    editCount: state.editCount,
  }
}
