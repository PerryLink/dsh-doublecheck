/**
 * The grill module: dsh-doublecheck's requirements-furnace plugin.
 *
 * Registers the bundled `skills/` directory on the DSH skill registry (the
 * official skill capability seam), exposes the model-facing catalog/loader
 * tool `doublecheck_skills`, and provides the two contract tools:
 * `doublecheck_spec` (commit a grilled requirements spec to the session log
 * and a workspace markdown file) and `doublecheck_report` (v0.4: consolidate
 * the session's discipline evidence into a delivery report, optionally
 * orchestrating a per-dimension verification workflow through the DSH
 * workflow seam).
 *
 * @module dsh-doublecheck/grill
 */
import type { Context } from '@deepseek-ai/cordis';
import type Schema from '@deepseek-ai/schemastery';
import type { GrilledSpec } from '../events.js';
export declare const name = "doublecheck-grill";
export declare const inject: string[];
/** Grill module configuration. */
export interface Config {
    /** Workspace file (relative to the session cwd) that receives the spec markdown. */
    specFile: string;
    /** Workspace file (relative to the session cwd) that receives the report markdown. */
    reportFile: string;
    /** Whether the report runs the verify workflow when the caller does not choose. */
    reportVerify: boolean;
    /** Subagent provider the verify workflow's checkers run on. */
    verifyProvider: string;
    /** Checker fan-out: one parallel checker per dimension (`all`) or one combined checker (`single`). */
    verifyMode: 'all' | 'single';
    /** Report-scoped knobs: shell tools whose commands may be test runs. */
    reportTestToolNames: string[];
    /** Report-scoped knobs: commands that count as test runs. */
    reportTestCommandPatterns: string[];
    /** Report-scoped knobs: mutation tools counted as implementation edits. */
    reportMutationTools: string[];
    /** Report-scoped knobs: paths identifying test files (not implementation edits). */
    reportTestFilePatterns: string[];
}
export declare const Config: Schema<Config>;
/** The rendered spec document written to the workspace and shown to the model. */
export declare function renderSpecMarkdown(spec: GrilledSpec): string;
/**
 * Install the grill module: bundled skill provider plus its three tools.
 * @param ctx - plugin context; registrations unwind with it.
 * @param config - validated {@link Config}.
 */
export declare function apply(ctx: Context, config: Config): void;
