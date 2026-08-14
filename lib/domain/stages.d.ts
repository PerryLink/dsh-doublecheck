/**
 * The dsh-doublecheck discipline state machine.
 *
 * Six stages: `grill` (settle requirements) → `design` (spec committed) →
 * `red` (failing test) → `green` (passing test) → `review` (self-review) →
 * `verify` (delivery proof). v0.1 implements the first transition; the
 * remaining stage vocabulary exists so the durable fold and every consumer
 * stay stable when v0.2+ adds gates.
 *
 * The stage is derived from the session log, never kept in process memory as
 * a parallel truth: a `doublecheck_spec` tool call with a successful
 * `tool/result` advances the session past `grill`. Resumed and forked
 * sessions therefore fold to the same stage as the live run.
 *
 * @module dsh-doublecheck/domain/stages
 */
import type { SessionEvent } from '@deepseek-ai/dsh-session';
/** The discipline stages, in execution order. */
export type DisciplineStage = 'grill' | 'design' | 'red' | 'green' | 'review' | 'verify';
/** All discipline stages in order. */
export declare const DISCIPLINE_STAGES: readonly DisciplineStage[];
/** Name of the model-facing tool that commits a grilled requirements spec. */
export declare const SPEC_TOOL_NAME = "doublecheck_spec";
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
 * Fold a session log to its current discipline stage. Only successful calls
 * advance the stage; a failed spec attempt leaves the session in `grill`.
 * v0.1 recognizes only the spec tool; the lookup table is the single place
 * v0.2+ adds red/green, review, and verify gates. One pass over the log: a
 * pending map pairs results with their calls, and a walk over the matched
 * calls (in log order) picks the last successful one.
 * @param events - the session's append-only event log.
 * @returns the last stage any successful discipline tool call reached, or `grill`.
 */
export declare function foldDisciplineStage(events: readonly SessionEvent[]): DisciplineStage;
/**
 * Whether the session's requirements grill has produced a committed spec.
 * @param events - the session's append-only event log.
 * @returns true when a successful `doublecheck_spec` call exists in the log;
 * the scan stops at the first successful pair it finds.
 */
export declare function sessionHasSpec(events: readonly SessionEvent[]): boolean;
//# sourceMappingURL=stages.d.ts.map