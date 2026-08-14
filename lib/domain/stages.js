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
/** All discipline stages in order. */
export const DISCIPLINE_STAGES = [
    'grill', 'design', 'red', 'green', 'review', 'verify',
];
/** Name of the model-facing tool that commits a grilled requirements spec. */
export const SPEC_TOOL_NAME = 'doublecheck_spec';
/** Which stage a successful call of the named tool advances the session to. */
const STAGE_BY_TOOL = {
    [SPEC_TOOL_NAME]: 'design',
};
/**
 * Call ids of successful invocations of `toolName` in the given event log. A
 * call is successful when some `tool/result` pairs with its `callId` and
 * carries no error record.
 * @param events - the session's append-only event log.
 * @param toolName - the tool whose successful calls are collected.
 * @returns every successful call id, in log order.
 */
export function successfulToolCalls(events, toolName) {
    const calls = [];
    for (const event of events) {
        if (event.type === 'tool/call' && event.data.name === toolName)
            calls.push(event.data.callId);
    }
    if (calls.length === 0)
        return [];
    const pending = new Set(calls);
    const succeeded = [];
    for (const event of events) {
        if (event.type !== 'tool/result' || event.data.error !== undefined)
            continue;
        const callId = event.data.message.source.callId;
        if (!pending.has(callId))
            continue;
        pending.delete(callId);
        succeeded.push(callId);
    }
    return succeeded;
}
/**
 * Fold a session log to its current discipline stage. Only successful calls
 * advance the stage; a failed spec attempt leaves the session in `grill`.
 * v0.1 recognizes only the spec tool; the lookup table is the single place
 * v0.2+ adds red/green, review, and verify gates.
 * @param events - the session's append-only event log.
 * @returns the last stage any successful discipline tool call reached, or `grill`.
 */
export function foldDisciplineStage(events) {
    const succeeded = new Set();
    for (const tool of Object.keys(STAGE_BY_TOOL)) {
        for (const callId of successfulToolCalls(events, tool))
            succeeded.add(callId);
    }
    let stage = 'grill';
    for (const event of events) {
        if (event.type !== 'tool/call')
            continue;
        const next = STAGE_BY_TOOL[event.data.name];
        if (next === undefined || !succeeded.has(event.data.callId))
            continue;
        stage = next;
    }
    return stage;
}
/**
 * Whether the session's requirements grill has produced a committed spec.
 * @param events - the session's append-only event log.
 * @returns true when a successful `doublecheck_spec` call exists in the log.
 */
export function sessionHasSpec(events) {
    return successfulToolCalls(events, SPEC_TOOL_NAME).length > 0;
}
//# sourceMappingURL=stages.js.map