/**
 * Package-internal Cordis event vocabulary.
 *
 * Both events are process-local notifications between dsh-doublecheck's own
 * plugin modules. Durable state never depends on them: the session log
 * (`tool/call` / `tool/result` / `user/message` events) remains the single
 * source of truth, and every model-visible payload they announce is recorded
 * there through the standard channels before the event fires.
 *
 * @module dsh-doublecheck/events
 */
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { Session } from '@deepseek-ai/dsh-session';
/** The six dimensions of a grilled requirements spec (v0.1 canonical fields). */
export interface GrilledSpec {
    /** What outcome the work must produce, in one verifiable sentence. */
    goal: string;
    /** What is in scope and what is out of scope for this change. */
    scope: string;
    /** Observable checks that prove the work is done. */
    acceptanceCriteria: string;
    /** What can go wrong and the correct behavior in each case. */
    failureModes: string;
    /** What to trade when goals conflict; what is optional. */
    priorities: string;
    /** What the user explicitly does not want. */
    nonGoals: string;
}
/** Guard enforcement strength. */
export type GuardIntensity = 'remind' | 'warn' | 'block';
/** Which discipline gate produced a guard reaction. */
export type GuardGate = 'grill' | 'tdd';
/** Policy outcome of one guard reaction. */
export type GuardVerdict = 'reminded' | 'held' | 'denied' | 'green-pending';
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
        'doublecheck/spec'(payload: {
            session: Session;
            spec: GrilledSpec;
            path: string | null;
            written: boolean;
        }): void;
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
            agent: Agent | undefined;
            session: Session;
            toolName?: string;
            intensity: GuardIntensity;
            gate: GuardGate;
            verdict: GuardVerdict;
            reminder?: string;
        }): void;
    }
}
//# sourceMappingURL=events.d.ts.map