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
export {};
