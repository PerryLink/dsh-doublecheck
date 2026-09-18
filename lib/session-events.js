/**
 * Session event access shared by the guard, grill, and invariant rows.
 * 0.1.2-alpha.5 renamed the `Session.events` getter to `snapshotEvents()`
 * while the peer floor (>=0.1.0-rc.8) still exposes `.events`; the runtime
 * probe below keeps both harness lines working without tightening peers.
 * @module dsh-doublecheck/session-events
 */
/**
 * The current event snapshot of one session, whichever harness line owns it.
 * @param session - the host Session (or a fixture-shaped session in tests).
 * @returns a frozen full log snapshot on alpha.5+, the `.events` array earlier.
 * @throws when the object exposes neither read face: an empty log would turn
 * every fold into a wrong "nothing happened" conclusion instead of an error.
 */
export function sessionEvents(session) {
    if (session === null || session === undefined)
        return [];
    if (typeof session.snapshotEvents === 'function')
        return session.snapshotEvents();
    const legacy = session.events;
    if (legacy !== undefined)
        return legacy;
    throw new Error('dsh-doublecheck: the session exposes neither snapshotEvents() nor an events array — '
        + 'the discipline folds cannot read the log (pass a real Session, not a partial shape)');
}
