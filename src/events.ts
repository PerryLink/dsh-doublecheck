/**
 * Package-internal Cordis event vocabulary.
 *
 * These events are process-local notifications between dsh-doublecheck's own
 * plugin modules. Durable state never depends on them: the session log
 * (`tool/call` / `tool/result` / `user/message` events) remains the single
 * source of truth, and every model-visible payload they announce is recorded
 * there through the standard channels before the event fires. Structured
 * discipline facts that must survive the conversation ride the durable log as
 * injected `user/message` sources via the {@link MessageSourceMap} extension
 * below — never as these process-local events.
 *
 * @module dsh-doublecheck/events
 */

import type { Agent } from '@deepseek-ai/dsh-agent'
import type { Session } from '@deepseek-ai/dsh-session'
import type { GrilledSpec, ReviewFinding, ReviewVerdict, ReportVerdict, VerifyCheck } from './domain/vocabulary.ts'

export type { GrilledSpec, ReviewFinding, ReviewVerdict, ReportVerdict, VerifyCheck } from './domain/vocabulary.ts'

/** Guard enforcement strength. */
export type GuardIntensity = 'remind' | 'warn' | 'block'

/** Which discipline gate produced a guard reaction. */
export type GuardGate = 'grill' | 'tdd'

/** Policy outcome of one guard reaction. */
export type GuardVerdict = 'reminded' | 'held' | 'denied' | 'green-pending'

declare module '@deepseek-ai/dsh-llm' {
  interface MessageSourceMap {
    /**
     * The adversary review injected into the session: the durable record of
     * one settled critique. The model-facing text is the rendered findings
     * (or clean/unavailable notice); the structured findings and verdict live
     * here so the doublecheck report can fold them without re-parsing prose.
     */
    'doublecheck-review': {
      kind: 'doublecheck-review'
      verdict: ReviewVerdict
      findings: ReviewFinding[]
    }
  }
}

declare module '@deepseek-ai/cordis' {
  interface Events {
    /**
     * The grill module committed a requirements spec: the canonical spec was
     * returned to the model (and recorded as a `tool/result` session event)
     * and the workspace copy write settled. Future discipline modules consume
     * this notification to advance the shared stage state machine.
     * @param payload.session - the session the spec belongs to.
     * @param payload.spec - the six committed spec fields.
     * @param payload.path - absolute workspace path written, or null when no write happened.
     * @param payload.written - whether the markdown copy reached the workspace.
     * @mode emit
     */
    'doublecheck/spec'(payload: { session: Session; spec: GrilledSpec; path: string | null; written: boolean }): void
    /**
     * The discipline guard reacted: the grill gate hit a requirements-less
     * mutation attempt, the red gate hit an implementation edit without a
     * failing test on record, or the green gate noticed edits without a
     * passing test run at turn end. Reminders queued here ride the standard
     * context channel into the session log; held/denied outcomes happened at
     * the policy gate. Observability only — listeners must not veto or reroute.
     * @param payload.agent - the calling agent, when the call has one.
     * @param payload.session - the session the call belongs to.
     * @param payload.toolName - the intercepted mutation tool; absent for green-gate reactions.
     * @param payload.intensity - the configured enforcement strength.
     * @param payload.gate - the discipline gate that produced this reaction.
     * @param payload.verdict - the policy outcome produced by this reaction.
     * @param payload.reminder - the reminder prose, when one was queued.
     * @mode emit
     */
    'doublecheck/reminder'(payload: {
      agent: Agent | undefined
      session: Session
      toolName?: string
      intensity: GuardIntensity
      gate: GuardGate
      verdict: GuardVerdict
      reminder?: string
    }): void
    /**
     * The adversary module settled one delivery review: a forked critic
     * subagent compared the committed spec against the session's delivery
     * evidence and produced structured findings (or a clean/unavailable
     * verdict). The review text that reached the model rides the standard
     * injection channel and is recorded as a `user/message` session event
     * whose source carries the structured record. Observability only —
     * listeners must not veto or reroute.
     * @param payload.session - the reviewed session.
     * @param payload.agent - the reviewed agent.
     * @param payload.verdict - findings, clean, or unavailable.
     * @param payload.findings - the structured objections, when the critic produced any.
     * @param payload.text - the model-facing review prose, when one was injected.
     * @mode emit
     */
    'doublecheck/review'(payload: {
      session: Session
      agent: Agent
      verdict: ReviewVerdict
      findings: ReviewFinding[]
      text?: string
    }): void
    /**
     * The doublecheck report tool committed a consolidated delivery report:
     * the folded session facts, the derived verdict, the optional
     * verification checks, and the workspace copy outcome. The report the
     * model sees is the tool's own `tool/result`; this event is observability
     * only — listeners must not veto or reroute.
     * @param payload.session - the reported session.
     * @param payload.verdict - the derived delivery status.
     * @param payload.checks - the verification checks, when verification ran.
     * @param payload.path - absolute workspace path written, or null when no write happened.
     * @param payload.written - whether the markdown copy reached the workspace.
     * @mode emit
     */
    'doublecheck/report'(payload: {
      session: Session
      verdict: ReportVerdict
      checks: VerifyCheck[] | null
      path: string | null
      written: boolean
    }): void
  }
}
