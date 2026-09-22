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
/**
 * Build the producer-owned source for one doublecheck notice.
 * @param summary - the stable notice summary the fold reads back.
 * @returns the `MessageSourceMap` member this package declares.
 */
export function noticeSource(summary) {
    return { kind: 'dsh-doublecheck', form: 'notice', summary };
}
/**
 * Read the notice summary out of a durable `user/message` source, or undefined
 * when the source is not a doublecheck notice.
 *
 * Three shapes are recognized, because the durable log outlives any one
 * release line:
 *
 * - `{ kind: 'dsh-doublecheck', form: 'notice', summary }` — what this package
 *   writes now.
 * - `{ kind: 'plugin:dsh-doublecheck', form: 'notice', summary }` — the host's
 *   V3→V4 migration lifts a released catch-all `plugin` wrapper to a
 *   `plugin:<name>` kind for producers it does not know, and preserves the
 *   rest of the source. A session recorded before this package adopted its own
 *   kind therefore arrives here.
 * - `{ kind: 'plugin', plugin: 'dsh-doublecheck', form: 'notice', summary }` —
 *   the released wrapper itself, kept for a log value that has not been
 *   through that migration (an in-process array from an older composition).
 *
 * @param source - one `user/message` event's source, of unknown shape.
 * @returns the summary when this is a doublecheck notice, else undefined.
 */
export function noticeSummaryOf(source) {
    if (source.form !== 'notice' || typeof source.summary !== 'string')
        return undefined;
    if (source.kind === 'dsh-doublecheck' || source.kind === 'plugin:dsh-doublecheck')
        return source.summary;
    if (source.kind === 'plugin' && source.plugin === 'dsh-doublecheck')
        return source.summary;
    return undefined;
}
