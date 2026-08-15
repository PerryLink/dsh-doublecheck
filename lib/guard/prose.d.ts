/**
 * User-facing injected prose for the discipline guard, localized.
 *
 * The notice SOURCE summaries (`requirements check`, `red/green check`,
 * `green gate`) stay English: they are stable session-log ids the durable
 * once-semantics fold matches, and translating them would silently break
 * `remindOnce` after a language switch. Only the model-facing text localizes.
 *
 * Scope of localization: every model-visible string the package injects or
 * answers with (gate prose, the critic task, `/doublecheck` replies, the
 * switch notice) is localized. The workspace documents (`doublecheck-spec.md`
 * / `doublecheck-report.md`) keep their English section headings: they are
 * stable artifacts whose structure other tooling may match.
 * @module dsh-doublecheck/guard/prose
 */
/** Supported prose languages for guard injections. */
export type ProseLanguage = 'en' | 'zh';
/** Every user-facing string one language provides. */
export interface GuardProse {
    grillReminder: string;
    grillDeny: string;
    grillAsk: string;
    tddReminder: string;
    tddDeny: string;
    tddAsk: string;
    greenReminder: string;
    greenReminderStrict: string;
    reportExpected: string;
    reviewSteer: string;
    reviewSteerStrict: string;
    reviewClean: string;
    reviewUnavailableSeam: string;
    reviewUnavailableFailed: (reason: string) => string;
    reviewUnavailableStopped: (reason: string) => string;
    reviewUnavailableNoFindings: string;
    reviewFindingsHeader: (count: number) => string;
    reviewFindingsFooter: string;
    reviewHeldBack: (held: number) => string;
    /** The critic's task prompt (model-facing behavior of the review run). */
    criticTask: string;
    switchOnDurable: string;
    switchOnLocal: string;
    switchOffDurable: string;
    switchOffLocal: string;
    commandNoAgent: string;
    commandUnknown: (input: string) => string;
    commandAlreadyOn: string;
    commandAlreadyOff: string;
    commandOnDurable: string;
    commandOnLocal: string;
    commandOffDurable: string;
    commandOffLocal: string;
    commandStatus: (facts: CommandStatusFacts) => string;
}
/** The folded facts the localized `/doublecheck status` reply renders. */
export interface CommandStatusFacts {
    /** The effective session switch. */
    enabled: boolean;
    /** The configured default for sessions without a state record. */
    defaultEnabled: boolean;
    /** Configured module switches. */
    modules: {
        grill: boolean;
        tdd: boolean;
        adversary: boolean;
    };
    /** Configured enforcement strength. */
    intensity: string;
    /** Whether reminder repetition is capped per session. */
    remindOnce: boolean;
    /** Whether a committed spec exists in the log. */
    hasSpec: boolean;
    /** The latest test-run color (`none` / `red` / `green`). */
    color: string;
    /** Whether an adversary review record exists in the log. */
    reviewed: boolean;
    /** Total implementation edits folded so far. */
    editCount: number;
}
/** The localized prose tables by language. */
export declare const PROSE: Readonly<Record<ProseLanguage, GuardProse>>;
