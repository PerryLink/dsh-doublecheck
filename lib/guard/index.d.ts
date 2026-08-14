/**
 * The discipline guard: dsh-doublecheck's soft enforcement plugin.
 *
 * When a session's task statement is vague and no `doublecheck_spec` has been
 * committed yet, a model heading for a mutation tool (`edit` / `write` by
 * default) is intercepted on the documented `tools/pre-execute` /
 * `tools/post-execute` extension points. The configured `intensity` picks the
 * consequence:
 *
 * - `remind`: the call proceeds; a reminder rides the call's
 *   `additionalContexts`, so the agent loop records it as a `user/message`
 *   session event (model-visible ⟺ logged).
 * - `warn`: the call is held for human approval through the approval seam
 *   (`ask`); without an approval channel it denies.
 * - `block`: the call is denied with corrective feedback.
 *
 * All state derives from the session log (the durable source of truth), so a
 * resumed or forked session enforces identically. The package-internal
 * `doublecheck/reminder` event announces each reaction for observers.
 *
 * @module dsh-doublecheck/guard
 */
import type { Context } from '@deepseek-ai/cordis';
import type Schema from '@deepseek-ai/schemastery';
import type { GuardIntensity } from '../events.ts';
export declare const name = "doublecheck-guard";
/**
 * Guard configuration. `intensity` and the `modules` switches are the
 * deployment-facing knobs; the module boundary for `tdd` (v0.2) and
 * `adversary` (v0.3) exists today so configs written now survive those
 * versions, and enabling either in this build fails loud.
 */
export interface Config {
    /** Enforcement strength of the requirements guard. */
    intensity: GuardIntensity;
    /** Discipline module switches; `tdd` and `adversary` are reserved for v0.2/v0.3. */
    modules: {
        grill: boolean;
        tdd: boolean;
        adversary: boolean;
    };
    /** Model route for the future adversary critic; null means the main model self-reviews. Reserved for v0.3. */
    adversaryModel: string | null;
    /** Mutation tool names the guard watches (default `edit`, `write`). */
    guardTools: string[];
    /** Task text longer than this many characters is never treated as vague. */
    vagueTaskMaxChars: number;
    /** Inject the reminder at most once per session. */
    remindOnce: boolean;
}
export declare const Config: Schema<Config>;
/**
 * Install the guard listeners.
 * @param ctx - plugin context; listeners unwind with it.
 * @param config - validated {@link Config}; reserved-module misuse fails loud here.
 */
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map