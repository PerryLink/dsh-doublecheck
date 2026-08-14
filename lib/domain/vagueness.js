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
/** Extension token, Windows drive prefix, or a leading path separator followed by a path body. */
const ARTIFACT_HINT = /(?:\.[A-Za-z][\w-]{0,10}(?:$|[\s"'`.,:;)\]])|[A-Za-z]:[\\/]|[\\/][^\s"'`]+)/;
/**
 * A quoted keyword such as `"foo"`, `'bar'`, `` `baz` ``, “关键词” or 「关键词」.
 * Requires at least one non-whitespace character between the quotes so an
 * empty pair like `""` does not make a task concrete.
 */
const QUOTED_HINT = /["'`“”「」『』][^"'`“”「」『』]*\S[^"'`“”「」『』]*["'`“”「」『』]/;
/**
 * Decide whether a user task statement needs a requirements grill.
 * @param text - the task text as given by the user.
 * @param config - the vagueness tuning.
 * @returns true when the task is brief and names no concrete artifact.
 */
export function isVagueTask(text, config) {
    const normalized = text.trim();
    if (normalized.length === 0)
        return false;
    if (normalized.length > config.vagueTaskMaxChars)
        return false;
    return !(ARTIFACT_HINT.test(normalized) || QUOTED_HINT.test(normalized));
}
//# sourceMappingURL=vagueness.js.map