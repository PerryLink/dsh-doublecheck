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

import type { SessionEvent } from '@deepseek-ai/dsh-session'

/** The discipline stages, in execution order. */
export type DisciplineStage = 'grill' | 'design' | 'red' | 'green' | 'review' | 'verify'

/** All discipline stages in order. */
export const DISCIPLINE_STAGES: readonly DisciplineStage[] = [
  'grill', 'design', 'red', 'green', 'review', 'verify',
]

/** Name of the model-facing tool that commits a grilled requirements spec. */
export const SPEC_TOOL_NAME = 'doublecheck_spec'

/** Which stage a successful call of the named tool advances the session to. */
const STAGE_BY_TOOL: Readonly<Record<string, DisciplineStage>> = {
  [SPEC_TOOL_NAME]: 'design',
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
 * Fold a session log to its current discipline stage. Only successful calls
 * advance the stage; a failed spec attempt leaves the session in `grill`.
 * v0.1 recognizes only the spec tool; the lookup table is the single place
 * v0.2+ adds red/green, review, and verify gates. One pass over the log: a
 * pending map pairs results with their calls, and a walk over the matched
 * calls (in log order) picks the last successful one.
 * @param events - the session's append-only event log.
 * @returns the last stage any successful discipline tool call reached, or `grill`.
 */
export function foldDisciplineStage(events: readonly SessionEvent[]): DisciplineStage {
  const pending = new Map<string, DisciplineStage>()
  const resolved = new Set<string>()
  const ordered: { callId: string; stage: DisciplineStage }[] = []
  for (const event of events) {
    if (event.type === 'tool/call') {
      const stage = STAGE_BY_TOOL[event.data.name]
      if (stage === undefined) continue
      pending.set(event.data.callId, stage)
      ordered.push({ callId: event.data.callId, stage })
    } else if (event.type === 'tool/result' && event.data.error === undefined) {
      const callId = event.data.message.source.callId
      if (pending.delete(callId)) resolved.add(callId)
    }
  }
  for (let index = ordered.length - 1; index >= 0; index -= 1) {
    const entry = ordered[index]
    if (entry === undefined) continue
    if (resolved.has(entry.callId)) return entry.stage
  }
  return 'grill'
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
