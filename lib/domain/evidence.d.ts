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
/** Compiled red/green evidence detection knobs. */
export interface TestRunDetection {
    /** Tool names that can execute shell commands. */
    testToolNames: readonly string[];
    /** Regexes a command must match to count as a test run. */
    testCommandPatterns: readonly RegExp[];
    /** Mutation tool names (the targets the red gate watches). */
    mutationTools: readonly string[];
    /** Regexes identifying test-file paths, exempt from the red gate. */
    testFilePatterns: readonly RegExp[];
}
/** A classified test-run outcome. `undefined` = no usable evidence (infra failure, sandbox denial, background ack). */
export type TestOutcome = 'pass' | 'fail';
/** The raw knobs before regex compilation; invalid patterns fail loud at compile. */
export interface DetectionConfig {
    testToolNames: string[];
    testCommandPatterns: string[];
    guardTools: string[];
    testFilePatterns: string[];
}
/**
 * Compile the detection knobs, rejecting invalid regexes at load time.
 * @param config - the raw string knobs from the guard config.
 * @returns the compiled detection record.
 */
export declare function compileDetection(config: DetectionConfig): TestRunDetection;
/** The detection record with every list empty: test-run evidence is ignored. */
export declare function emptyDetection(): TestRunDetection;
/**
 * Parse a raw tool-call `arguments` value (a JSON string from the model, or an
 * already-normalized object from a Code Mode sub-dispatch) into a plain record.
 * @param raw - the raw arguments value from the durable event.
 * @returns the parsed record, or `undefined` when the string is not valid JSON.
 */
export declare function parseRawArguments(raw: string | unknown): Record<string, unknown> | undefined;
/**
 * The shell command a tool call would execute, when the tool is a configured
 * test runner.
 * @param name - the called tool name.
 * @param args - the parsed arguments record.
 * @param detection - the compiled detection knobs.
 * @returns the command text, or `undefined` when this call is not a shell run.
 */
export declare function shellCommand(name: string, args: Record<string, unknown> | undefined, detection: TestRunDetection): string | undefined;
/**
 * Whether a shell command is a test run under the configured patterns.
 * @param command - the command text.
 * @param detection - the compiled detection knobs.
 * @returns true when at least one pattern matches.
 */
export declare function isTestCommand(command: string, detection: TestRunDetection): boolean;
/**
 * The mutation target path of a tool call, when the tool is a configured
 * mutation tool and its arguments name a file.
 * @param name - the called tool name.
 * @param args - the parsed arguments record.
 * @param detection - the compiled detection knobs.
 * @returns the target path, or `undefined` when the call does not name one.
 */
export declare function mutationTargetPath(name: string, args: Record<string, unknown> | undefined, detection: TestRunDetection): string | undefined;
/**
 * Whether a mutation target is itself a test file (writing the failing test
 * is the red step, so test files stay editable).
 * @param path - the mutation target path.
 * @param detection - the compiled detection knobs.
 * @returns true when the path matches a test-file pattern.
 */
export declare function isTestFilePath(path: string, detection: TestRunDetection): boolean;
/**
 * Classify the durable result of one test run from its model-facing text.
 * @param text - the joined text blocks of the rendered result.
 * @param isError - whether the tool call failed at the infrastructure level.
 * @returns red/green evidence, or `undefined` when the run proves nothing.
 */
export declare function testOutcome(text: string, isError: boolean): TestOutcome | undefined;
/** Join the text blocks of a rendered result into one searchable string. */
export declare function joinTextBlocks(content: ReadonlyArray<{
    type?: unknown;
    text?: unknown;
    content?: unknown;
}>): string;
//# sourceMappingURL=evidence.d.ts.map