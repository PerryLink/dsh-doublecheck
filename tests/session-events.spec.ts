/**
 * The shared session-event read: both harness read faces stay supported, and an
 * object with neither face fails loud instead of folding an empty log (a silent
 * empty read turns every discipline fold into a wrong "nothing happened"
 * conclusion rather than an error).
 * @module dsh-doublecheck/test/session-events.spec
 */

import { describe, expect, it } from 'vitest'
import { sessionEvents } from '../src/session-events.ts'

describe('sessionEvents', () => {
  it('reads through snapshotEvents() when the session exposes it', () => {
    const events = [{ type: 'user/message', seq: 0 }]
    const session = { snapshotEvents: () => events }
    expect(sessionEvents(session as never)).toBe(events)
  })

  it('still reads the legacy .events array on the older peer floor', () => {
    const events = [{ type: 'user/message', seq: 0 }]
    expect(sessionEvents({ events } as never)).toBe(events)
  })

  it('returns no events for a missing session', () => {
    expect(sessionEvents(null)).toEqual([])
    expect(sessionEvents(undefined)).toEqual([])
  })

  it('fails loud when the object exposes neither read face', () => {
    expect(() => sessionEvents({} as never)).toThrow(/neither snapshotEvents\(\) nor an events array/)
  })
})
