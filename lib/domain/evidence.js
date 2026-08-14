/**
 * Test-run evidence classification for the red/green gates.
 *
 * The durable session log is the only source of truth: a shell tool call
 * (`bash` / `pwsh`, including Code Mode sub-dispatches) whose command matches
 * the configured test patterns is a test run, and its rendered result text
 * carries the exit facts (`[exit code: N]`, timeout, signal, sandbox-denial
 * markers). A failing run is red evidence; a passing run is green evidence.
 *
 * @module dsh-doublecheck/domain/evidence
 */
/** Shared defaults: shell tools that can run tests. */
export const DEFAULT_TEST_TOOL_NAMES = ['bash', 'pwsh'];
/** Shared defaults: commands that count as test runs. */
export const DEFAULT_TEST_COMMAND_PATTERNS = [
    '(?:^|[;&|]\\s*)(?:(?:pnpm|npm|npx|yarn|bun)(?:\\s+run)?\\s+(?:test|vitest|jest|mocha)(?:\\s|$))',
    '(?:^|[;&|]\\s*)(?:(?:pytest|go\\s+test|cargo\\s+test|make\\s+test|ctest)(?:\\s|$))',
    '(?:^|[;&|]\\s*)(?:node\\s+--test(?:\\s|$))',
];
/** Shared defaults: mutation tools and test-file path patterns. */
export const DEFAULT_MUTATION_TOOLS = ['edit', 'write'];
/** Shared defaults: paths that identify test files. */
export const DEFAULT_TEST_FILE_PATTERNS = [
    '(^|[\\\\/])(tests?|__tests__|specs?)([\\\\/]|$)',
    '\\.(test|spec)\\.[A-Za-z0-9]+$',
];
/** Background bash/pwsh acknowledgements are not test outcomes. */
const BACKGROUND_ACK = /^started background job \S+/;
/** The command never ran: a sandbox denial is not a failing test. */
const SANDBOX_DENIAL = /\[sandbox: [^\]]*denied under [^\]]* mode\]/;
const TIMED_OUT = /\[timed out after \d+ms\]/;
const KILLED_BY_SIGNAL = /\[killed by signal: [^\]]+\]/;
const EXIT_CODE = /\[exit code: (\d+)\]/m;
/**
 * Compile the detection knobs, rejecting invalid regexes at load time.
 * @param config - the raw string knobs from the guard config.
 * @returns the compiled detection record.
 */
export function compileDetection(config) {
    assertNonEmptyNames('testToolNames', config.testToolNames);
    assertNonEmptyNames('guardTools', config.guardTools);
    return {
        testToolNames: [...config.testToolNames],
        testCommandPatterns: config.testCommandPatterns.map(compilePattern),
        mutationTools: [...config.guardTools],
        testFilePatterns: config.testFilePatterns.map(compilePattern),
    };
}
/** The detection record with every list empty: test-run evidence is ignored. */
export function emptyDetection() {
    return {
        testToolNames: [],
        testCommandPatterns: [],
        mutationTools: [],
        testFilePatterns: [],
    };
}
/**
 * Parse a raw tool-call `arguments` value (a JSON string from the model, or an
 * already-normalized object from a Code Mode sub-dispatch) into a plain record.
 * @param raw - the raw arguments value from the durable event.
 * @returns the parsed record, or `undefined` when the string is not valid JSON.
 */
export function parseRawArguments(raw) {
    if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
        return raw;
    }
    if (typeof raw !== 'string')
        return undefined;
    try {
        const parsed = JSON.parse(raw);
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed))
            return undefined;
        return parsed;
    }
    catch {
        // Malformed model JSON carries no usable command or path; it is not evidence.
        return undefined;
    }
}
/**
 * The shell command a tool call would execute, when the tool is a configured
 * test runner.
 * @param name - the called tool name.
 * @param args - the parsed arguments record.
 * @param detection - the compiled detection knobs.
 * @returns the command text, or `undefined` when this call is not a shell run.
 */
export function shellCommand(name, args, detection) {
    if (!detection.testToolNames.includes(name))
        return undefined;
    const command = args?.['command'];
    return typeof command === 'string' && command.length > 0 ? command : undefined;
}
/**
 * Whether a shell command is a test run under the configured patterns.
 * @param command - the command text.
 * @param detection - the compiled detection knobs.
 * @returns true when at least one pattern matches.
 */
export function isTestCommand(command, detection) {
    return detection.testCommandPatterns.some(pattern => pattern.test(command));
}
/**
 * The mutation target path of a tool call, when the tool is a configured
 * mutation tool and its arguments name a file.
 * @param name - the called tool name.
 * @param args - the parsed arguments record.
 * @param detection - the compiled detection knobs.
 * @returns the target path, or `undefined` when the call does not name one.
 */
export function mutationTargetPath(name, args, detection) {
    if (!detection.mutationTools.includes(name))
        return undefined;
    const path = args?.['file_path'];
    return typeof path === 'string' && path.length > 0 ? path : undefined;
}
/**
 * Whether a mutation target is itself a test file (writing the failing test
 * is the red step, so test files stay editable).
 * @param path - the mutation target path.
 * @param detection - the compiled detection knobs.
 * @returns true when the path matches a test-file pattern.
 */
export function isTestFilePath(path, detection) {
    return detection.testFilePatterns.some(pattern => pattern.test(path));
}
/**
 * Classify the durable result of one test run from its model-facing text.
 * @param text - the joined text blocks of the rendered result.
 * @param isError - whether the tool call failed at the infrastructure level.
 * @returns red/green evidence, or `undefined` when the run proves nothing.
 */
export function testOutcome(text, isError) {
    if (isError)
        return undefined;
    if (BACKGROUND_ACK.test(text))
        return undefined;
    if (SANDBOX_DENIAL.test(text))
        return undefined;
    if (TIMED_OUT.test(text) || KILLED_BY_SIGNAL.test(text))
        return 'fail';
    const exit = EXIT_CODE.exec(text);
    if (exit !== null)
        return exit[1] === '0' ? 'pass' : 'fail';
    // A finished shell run with no failure markers settled with exit code 0.
    return 'pass';
}
/** Join the text blocks of a rendered result into one searchable string. */
export function joinTextBlocks(content) {
    const parts = [];
    for (const block of content) {
        if (block.type === 'text' && typeof block.text === 'string') {
            parts.push(block.text);
        }
        else if (block.type === 'tool-result' && Array.isArray(block.content)) {
            // A durable ToolResultMessage wraps its text blocks in one tool-result block.
            parts.push(joinTextBlocks(block.content));
        }
    }
    return parts.join('\n');
}
function compilePattern(source) {
    try {
        return new RegExp(source);
    }
    catch {
        throw new Error(`dsh-doublecheck: invalid regex pattern "${source}" in the red/green gate configuration`);
    }
}
function assertNonEmptyNames(field, names) {
    if (names.length === 0)
        throw new Error(`dsh-doublecheck: ${field} must not be empty`);
    for (const name of names) {
        if (name.length === 0)
            throw new Error(`dsh-doublecheck: ${field} must not contain empty tool names`);
    }
    if (new Set(names).size !== names.length)
        throw new Error(`dsh-doublecheck: ${field} must not contain duplicates`);
}
//# sourceMappingURL=evidence.js.map