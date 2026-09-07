/**
 * dsh-doublecheck package entry: the shared domain model and pure helpers.
 * The installable plugin rows live at the `./grill` and `./guard` subpath
 * exports (see cordis.patch.yml); this root exists for tools, tests, and
 * future modules that need the package's private domain vocabulary.
 *
 * @module dsh-doublecheck
 */

// Service Definition: the package's shared domain vocabulary — event/contract types, domain folds, and the grill/guard gate types re-exported below for both plugin rows.
export type { GrilledSpec, GuardIntensity, GuardGate, GuardVerdict } from './events.ts'
export * from './domain/stages.ts'
export * from './domain/evidence.ts'
export * from './domain/vagueness.ts'
export * from './domain/vocabulary.ts'
export * from './domain/report.ts'
export * from './domain/gate.ts'
// Consumer: the grill/guard rows consume the domain folds above; renderSpecMarkdown turns specs into model-facing text for the contract tools.
export { renderSpecMarkdown } from './grill/index.ts'
// Service Provider: BundledSkillProvider supplies the bundled grill-requirements skill to the doublecheck-grill row.
export { BundledSkillProvider, parseSkillAsset, PROVIDER_NAME } from './grill/provider.ts'
// Type-only re-export: keeps the `doublecheck` SessionProjectionMap merge
// edge in the emitted index.d.ts, so consumers receive the projection key's type.
export type * from './types.ts'
