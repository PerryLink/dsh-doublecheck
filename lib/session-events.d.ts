/**
 * Session event access shared by the guard, grill, and invariant rows.
 * 0.1.2-alpha.5 renamed the `Session.events` getter to `snapshotEvents()`
 * while the peer floor (>=0.1.0-rc.8) still exposes `.events`; the runtime
 * probe below keeps both harness lines working without tightening peers.
 * @module dsh-doublecheck/session-events
 */
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session';
/** A session-like that only needs to expose the events the folds read. */
export type SessionEventsSource = Session | {
    events?: readonly SessionEvent[];
};
/**
 * The current event snapshot of one session, whichever harness line owns it.
 * @param session - the host Session (or a fixture-shaped session in tests).
 * @returns a frozen full log snapshot on alpha.5+, the `.events` array earlier.
 */
export declare function sessionEvents(session: SessionEventsSource | null | undefined): readonly SessionEvent[];
