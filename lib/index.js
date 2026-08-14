/**
 * dsh-doublecheck package entry: the shared domain model and pure helpers.
 * The installable plugin rows live at the `./grill` and `./guard` subpath
 * exports (see cordis.patch.yml); this root exists for tools, tests, and
 * future modules that need the package's private domain vocabulary.
 *
 * @module dsh-doublecheck
 */
export * from "./domain/stages.js";
export * from "./domain/evidence.js";
export * from "./domain/vagueness.js";
export * from "./domain/vocabulary.js";
export * from "./domain/report.js";
export { renderSpecMarkdown } from "./grill/index.js";
export { BundledSkillProvider, parseSkillAsset, PROVIDER_NAME } from "./grill/provider.js";
