/**
 * The grill module: dsh-doublecheck's requirements-furnace plugin.
 *
 * Registers the bundled `skills/` directory on the DSH skill registry (the
 * official skill capability seam), exposes the model-facing catalog/loader
 * tool `doublecheck_skills`, and provides `doublecheck_spec` — the tool that
 * commits a grilled requirements spec to the session log (via its own
 * `tool/result`) and to a workspace markdown file.
 *
 * @module dsh-doublecheck/grill
 */
import type { Context } from '@deepseek-ai/cordis';
import type Schema from '@deepseek-ai/schemastery';
import type { GrilledSpec } from '../events.ts';
export declare const name = "doublecheck-grill";
export declare const inject: string[];
/** Grill module configuration. */
export interface Config {
    /** Workspace file (relative to the session cwd) that receives the spec markdown. */
    specFile: string;
}
export declare const Config: Schema<Config>;
/** The rendered spec document written to the workspace and shown to the model. */
export declare function renderSpecMarkdown(spec: GrilledSpec): string;
/**
 * Install the grill module: bundled skill provider plus its two tools.
 * @param ctx - plugin context; registrations unwind with it.
 * @param config - validated {@link Config}.
 */
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map