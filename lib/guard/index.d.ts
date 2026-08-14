/**
 * The discipline guard: dsh-doublecheck's soft enforcement plugin.
 *
 * Two gates compose on the documented `tools/pre-execute` /
 * `tools/post-execute` / `agent/turn-stopping` extension points, both reading
 * their facts from the durable session log alone:
 *
 * - **Grill gate** (`modules.grill`): a vague task with no committed
 *   `doublecheck_spec` may not mutate implementation files.
 * - **Red/green gate** (`modules.tdd`, v0.2): an implementation edit requires
 *   a failing test run on record since the last passing run (the red step);
 *   at turn end, edits without a passing run re-arm the green reminder.
 *   Writing test files is always allowed — that is how the red step happens.
 *
 * The configured `intensity` picks the consequence for both gates:
 *
 * - `remind`: the call proceeds; a reminder rides the call's
 *   `additionalContexts`, so the agent loop records it as a `user/message`
 *   session event (model-visible ⟺ logged).
 * - `warn`: the call is held for human approval through the approval seam
 *   (`ask`); without an approval channel it denies.
 * - `block`: the call is denied with corrective feedback.
 *
 * Resumed and forked sessions enforce identically. The package-internal
 * `doublecheck/reminder` event announces each reaction for observers.
 *
 * @module dsh-doublecheck/guard
 */
import type { Context } from '@deepseek-ai/cordis';
import type Schema from '@deepseek-ai/schemastery';
import type { GuardIntensity } from '../events.ts';
export declare const name = "doublecheck-guard";
/**
 * Guard configuration. `intensity` is shared by all three gates; `modules`
 * selects them. The `adversary` module (v0.3) dispatches a forked critic
 * subagent at the turn boundary once the delivery reaches green.
 */
export interface Config {
    /** Enforcement strength of the grill, red/green, and review gates. */
    intensity: GuardIntensity;
    /** Discipline module switches. */
    modules: {
        grill: boolean;
        tdd: boolean;
        adversary: boolean;
    };
    /** Model route for the adversary critic; null means the main model self-reviews. */
    adversaryModel: string | null;
    /** Subagent provider name the critic runs on (default `fork`). */
    adversaryProvider: string;
    /** Maximum structured findings injected into the session. */
    adversaryMaxFindings: number;
    /** Tools the critic may call (read-only by default; never mutation tools). */
    adversaryTools: string[];
    /** Hard time budget for one critic run before it settles as unavailable. */
    adversaryTimeoutMs: number;
    /** Mutation tool names both gates watch (default `edit`, `write`). */
    guardTools: string[];
    /** Task text longer than this many characters is never treated as vague. */
    vagueTaskMaxChars: number;
    /** Inject each gate's reminder at most once per session. */
    remindOnce: boolean;
    /** Shell tool names that can run tests (default `bash`, `pwsh`). */
    testToolNames: string[];
    /** Regexes a shell command must match to count as a test run. */
    testCommandPatterns: string[];
    /** Regexes identifying test-file paths, exempt from the red gate. */
    testFilePatterns: string[];
}
export declare const Config: Schema<Config>;
/**
 * Install the guard listeners.
 * @param ctx - plugin context; listeners unwind with it.
 * @param config - validated {@link Config}; reserved-module misuse fails loud here.
 */
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map