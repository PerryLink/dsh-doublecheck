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
import type { SessionEvent } from '@deepseek-ai/dsh-session';
import { type TestRunDetection } from './evidence.ts';
import { type DisciplineStage, type TestColor } from './stages.ts';
import type { DoublecheckView } from '../types.ts';
/** The projection unit's plain-JSON fold state. */
export interface DoublecheckProjectionState {
    /** The last discipline stage a successful call or test run reached. */
    stage: DisciplineStage;
    /** The latest test-run evidence: red = failing since the last pass. */
    color: TestColor;
    /** Whether a successful `doublecheck_spec` call exists in the log. */
    hasSpec: boolean;
    /** The goal of the latest committed spec, or '' before any spec. */
    specGoal: string;
    /** Whether an adversary review record exists in the log. */
    reviewed: boolean;
    /** Total implementation edits folded so far. */
    editCount: number;
    /** Spec-tool call ids (with their goals) whose results have not been folded yet. */
    pendingSpecCalls: Record<string, string>;
    /** Test-run call ids (with their commands) whose results have not been folded yet. */
    pendingTestCalls: Record<string, string>;
}
/** State for the empty log. */
export declare function emptyDoublecheckState(): DoublecheckProjectionState;
/**
 * One-event transition of the `doublecheck` projection unit. Uninterested
 * events return the same state reference (the registry's change gate).
 * @param state - the folded state before `event`.
 * @param event - one committed session event.
 * @param detection - the compiled red/green evidence knobs.
 * @returns the next state; the same reference when the event is not a
 *   discipline fact.
 */
export declare function applyDoublecheckEvent(state: DoublecheckProjectionState, event: SessionEvent, detection: TestRunDetection): DoublecheckProjectionState;
/**
 * Fold a session log from scratch to the projection state.
 * @param events - the session's append-only event log.
 * @param detection - the compiled red/green evidence knobs.
 * @returns the complete folded state.
 */
export declare function foldDoublecheckState(events: readonly SessionEvent[], detection: TestRunDetection): DoublecheckProjectionState;
/**
 * Project the folded state to the wire payload.
 * @param state - the folded state.
 * @returns the whole current value for the `doublecheck` projection key.
 */
export declare function viewDoublecheck(state: DoublecheckProjectionState): DoublecheckView;
