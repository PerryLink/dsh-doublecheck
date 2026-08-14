/**
 * User-facing injected prose for the discipline guard, localized.
 *
 * The notice SOURCE summaries (`requirements check`, `red/green check`,
 * `green gate`) stay English: they are stable session-log ids the durable
 * once-semantics fold matches, and translating them would silently break
 * `remindOnce` after a language switch. Only the model-facing text localizes.
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
}
/** The localized prose tables by language. */
export declare const PROSE: Readonly<Record<ProseLanguage, GuardProse>>;
