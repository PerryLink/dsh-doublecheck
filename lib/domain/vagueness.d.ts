/**
 * Task-vagueness detection for the discipline guard.
 *
 * A task is "vague" when it is brief and names no concrete artifact. Brief is
 * a deployment knob (`vagueTaskMaxChars`); artifact detection is a fixed
 * structural test: a file extension token, a drive-letter prefix, a
 * path-separator token, or a quoted keyword. A task that names an artifact
 * (or a URL) is concrete enough to edit without a grill even when it is
 * short; a long task is assumed to carry its own requirements.
 *
 * @module dsh-doublecheck/domain/vagueness
 */
/** The tunable part of the vagueness test. */
export interface VaguenessConfig {
    /** Task text longer than this many characters is never considered vague. */
    vagueTaskMaxChars: number;
}
/**
 * Decide whether a user task statement needs a requirements grill.
 * @param text - the task text as given by the user.
 * @param config - the vagueness tuning.
 * @returns true when the task is brief and names no concrete artifact.
 */
export declare function isVagueTask(text: string, config: VaguenessConfig): boolean;
//# sourceMappingURL=vagueness.d.ts.map