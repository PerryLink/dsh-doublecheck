/**
 * Task-vagueness detection for the discipline guard.
 *
 * A task is "vague" when it is brief and names no concrete artifact. Brief is
 * a deployment knob (`vagueTaskMaxChars`); artifact detection is a fixed
 * structural test: a file extension token, a drive-letter prefix, a
 * path-separator token, a quoted keyword, an underscore keyword, or a
 * hyphenated keyword. A task that names an artifact (or a URL) is concrete
 * enough to edit without a grill even when it is short; a long task is
 * assumed to carry its own requirements.
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
 * An identifier-style keyword containing an underscore, such as `retry_limit`
 * or `user_name`. Prose rarely uses underscores, so their presence signals a
 * concrete name (a variable, config key, or function) rather than a vague
 * wish. Requires an alphanumeric character at each end so a bare separator
 * (`_`), a pure underscore run (`___`), or a trailing `thing_` does not count.
 */
const UNDERSCORE_KEYWORD = /[A-Za-z0-9][A-Za-z0-9_]*_[A-Za-z0-9_]*[A-Za-z0-9]/;
/**
 * An identifier-style keyword containing a hyphen, such as `retry-limit`,
 * `user-name`, or a CLI flag like `--verbose=false`'s `verbose`. Mirrors
 * `UNDERSCORE_KEYWORD`: it requires an alphanumeric character at each end so
 * a bare separator (`-`), a pure hyphen run (`---`), a leading `-foo`, or a
 * trailing `thing-` does not count. Ordinary hyphenated compounds
 * (e.g. `well-known`), dates, and numeric ranges also match; that is the
 * accepted cost of recognizing config keys and option names.
 */
const HYPHENATED_KEYWORD = /[A-Za-z0-9][A-Za-z0-9-]*-[A-Za-z0-9-]*[A-Za-z0-9]/;
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
    return !(ARTIFACT_HINT.test(normalized) ||
        QUOTED_HINT.test(normalized) ||
        UNDERSCORE_KEYWORD.test(normalized) ||
        HYPHENATED_KEYWORD.test(normalized));
}
