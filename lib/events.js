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
export {};
//# sourceMappingURL=events.js.map