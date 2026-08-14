/**
 * Shared test builders: synthetic session events and fake agents.
 * @module dsh-doublecheck/tests/helpers
 */

import { createUserMessage, CallId } from '@deepseek-ai/dsh-llm'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import type { Agent } from '@deepseek-ai/dsh-agent'

let nextSeq = 0

/** A synthetic session event with a monotonically increasing sequence number. */
export function sessionEvent(type: string, data: unknown): SessionEvent {
  return { type, seq: nextSeq++, time: 1, data } as unknown as SessionEvent
}

/** A `tool/call` event naming the given tool. */
export function toolCall(name: string, callId = CallId(`call-${nextSeq}`)): SessionEvent {
  return sessionEvent('tool/call', { turn: 1, step: 1, callId, name, arguments: '{}' })
}

/** A successful `tool/result` event paired with a call id. */
export function toolResult(callId: string, error?: { name: string; code: string }): SessionEvent {
  return sessionEvent('tool/result', {
    turn: 1,
    step: 1,
    message: {
      id: `result-${nextSeq}`,
      source: { kind: 'tool', callId },
    },
    ...error !== undefined ? { error } : {},
  })
}

/** A `user/message` event carrying direct user text. */
export function userTask(text: string): SessionEvent {
  return sessionEvent('user/message', createUserMessage({
    content: [{ type: 'text', text }],
    source: { kind: 'user' },
  }))
}

/** A session object whose log is exactly the given events; `append` records into it. */
export function fakeSession(events: readonly SessionEvent[]): Session {
  const log: SessionEvent[] = [...events]
  const session = {
    events: log,
    header: {},
    append(type: string, data: unknown) {
      const event = sessionEvent(type, data)
      log.push(event)
      return event
    },
  }
  return session as unknown as Session
}

/** An agent object carrying exactly the fields the guard reads, with inject/steer capture. */
export function fakeAgent(session: Session, injections: unknown[] = [], steers: unknown[] = []): Agent {
  return {
    session,
    inject(message: unknown) {
      injections.push(message)
      // Real injections ride the session log as `user/message` events; the
      // guard's durable once-semantics folds them back from the log, so the
      // fake mirrors that instead of keeping a detached array.
      ;(session.events as SessionEvent[]).push(sessionEvent('user/message', message))
    },
    steer(message: unknown) {
      steers.push(message)
    },
  } as unknown as Agent
}

/** A `tool/call` event for a shell command, with the raw JSON-string arguments. */
export function shellCall(name: string, command: string, callId = CallId(`shell-${nextSeq}`)): SessionEvent {
  return sessionEvent('tool/call', { turn: 1, step: 1, callId, name, arguments: JSON.stringify({ command, description: 'run tests' }) })
}

/** A `tool/call` event for a `doublecheck_spec` with the six spec fields as arguments. */
export function specToolCall(fields: Record<string, string>, callId = CallId(`spec-call-${nextSeq}`)): SessionEvent {
  return sessionEvent('tool/call', { turn: 1, step: 1, callId, name: 'doublecheck_spec', arguments: JSON.stringify(fields) })
}

/** A `user/message` event carrying the durable structured review source. */
export function reviewInjectionEvent(verdict: 'findings' | 'clean' | 'unavailable', findings: unknown[] = []): SessionEvent {
  return sessionEvent('user/message', createUserMessage({
    content: [{ type: 'text', text: `review: ${verdict}` }],
    source: { kind: 'doublecheck-review', verdict, findings },
  }))
}

/** A `tool/call` event for a mutation targeting the given file path. */
export function mutationCall(name: 'edit' | 'write', filePath: string, callId = CallId(`mutation-${nextSeq}`)): SessionEvent {
  return sessionEvent('tool/call', { turn: 1, step: 1, callId, name, arguments: JSON.stringify({ file_path: filePath }) })
}

/** A `tool/result` event whose rendered text is the given shell output. */
export function shellResult(callId: string, output: string, error?: { name: string; code: string }): SessionEvent {
  return sessionEvent('tool/result', {
    turn: 1,
    step: 1,
    message: {
      id: `shell-result-${nextSeq}`,
      source: { kind: 'tool', callId },
      content: [{ type: 'tool-result', toolCallId: callId, content: [{ type: 'text', text: output }], isError: error !== undefined }],
    },
    ...error !== undefined ? { error } : {},
  })
}

/** A Code Mode sub-dispatch event for a settled shell test run. */
export function codeDispatchRun(command: string, output: string, isError = false): SessionEvent {
  return sessionEvent('tool/code-dispatch', {
    rootCallId: CallId('root-1'),
    parentCallId: CallId('parent-1'),
    subCallId: CallId('sub-1'),
    name: 'bash',
    arguments: { command },
    isError,
    content: [{ type: 'text', text: output }],
  })
}

/** A Code Mode sub-dispatch event for a dispatched `edit` implementation change. */
export function codeDispatchEdit(filePath: string): SessionEvent {
  return sessionEvent('tool/code-dispatch', {
    rootCallId: CallId('root-2'),
    parentCallId: CallId('parent-2'),
    subCallId: CallId('sub-2'),
    name: 'edit',
    arguments: { file_path: filePath, old_string: 'a', new_string: 'b' },
    isError: false,
    content: [{ type: 'text', text: 'updated' }],
  })
}
