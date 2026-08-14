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
import type { SessionEvent } from '@deepseek-ai/dsh-session';
import { type TestRunDetection } from './evidence.ts';
/** The discipline stages, in execution order. */
export type DisciplineStage = 'grill' | 'design' | 'red' | 'green' | 'review' | 'verify';
/** All discipline stages in order. */
export declare const DISCIPLINE_STAGES: readonly DisciplineStage[];
/** Name of the model-facing tool that commits a grilled requirements spec. */
export declare const SPEC_TOOL_NAME = "doublecheck_spec";
/** The current red/green color of the session: the latest test-run evidence. */
export type TestColor = 'none' | 'red' | 'green';
/**
 * The folded discipline facts for one session log. The `pending*` sets are
 * fold bookkeeping: calls whose results have not been folded yet, carried
 * across incremental fold batches.
 */
export interface DisciplineState {
    /** The last stage a successful discipline call or test run reached. */
    stage: DisciplineStage;
    /** Whether a successful `doublecheck_spec` call exists in the log. */
    hasSpec: boolean;
    /** The latest test-run evidence: red = failing since the last pass. */
    color: TestColor;
    /** An implementation edit happened after the latest passing test run. */
    pendingGreen: boolean;
    /** Total implementation edits folded so far (the green-gate reminder epoch). */
    editCount: number;
    /** Spec-tool call ids whose results have not been folded yet. */
    pendingSpecCalls: Set<string>;
    /** Test-run call ids whose results have not been folded yet. */
    pendingTestCalls: Set<string>;
}
/** A fresh fold state: nothing evidenced yet. */
export declare function emptyDisciplineState(): DisciplineState;
/**
 * Call ids of successful invocations of `toolName` in the given event log. A
 * call is successful when some `tool/result` pairs with its `callId` and
 * carries no error record. One pass over the log: results always follow
 * their calls, so a pending call set pairs them in place.
 * @param events - the session's append-only event log.
 * @param toolName - the tool whose successful calls are collected.
 * @returns every successful call id, in log order.
 */
export declare function successfulToolCalls(events: readonly SessionEvent[], toolName: string): string[];
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
export declare function foldDisciplineRange(state: DisciplineState, events: readonly SessionEvent[], start: number, detection: TestRunDetection): DisciplineState;
/**
 * Fold a session log from scratch to its current discipline state.
 * @param events - the session's append-only event log.
 * @param detection - the compiled red/green evidence knobs; omit to ignore test runs.
 * @returns the complete folded state.
 */
export declare function foldDisciplineState(events: readonly SessionEvent[], detection?: TestRunDetection): DisciplineState;
/**
 * Fold a session log to its current discipline stage. Only successful calls
 * and real test runs advance the stage; a failed spec attempt leaves the
 * session in `grill`, and red/green move with the latest test evidence.
 * @param events - the session's append-only event log.
 * @param detection - the compiled red/green evidence knobs; omit to ignore test runs.
 * @returns the last stage reached, or `grill`.
 */
export declare function foldDisciplineStage(events: readonly SessionEvent[], detection?: TestRunDetection): DisciplineStage;
/**
 * Whether the session's requirements grill has produced a committed spec.
 * @param events - the session's append-only event log.
 * @returns true when a successful `doublecheck_spec` call exists in the log;
 * the scan stops at the first successful pair it finds.
 */
export declare function sessionHasSpec(events: readonly SessionEvent[]): boolean;
//# sourceMappingURL=stages.d.ts.map