/**
 * dsh-doublecheck package entry: the shared domain model and pure helpers.
 * The installable plugin rows live at the `./grill` and `./guard` subpath
 * exports (see cordis.patch.yml); this root exists for tools, tests, and
 * future modules that need the package's private domain vocabulary.
 *
 * @module dsh-doublecheck
 */

export type { GrilledSpec, GuardIntensity, GuardGate, GuardVerdict } from './events.ts'
export * from './domain/stages.ts'
export * from './domain/evidence.ts'
export * from './domain/vagueness.ts'
export * from './domain/vocabulary.ts'
export * from './domain/report.ts'
export { renderSpecMarkdown } from './grill/index.ts'
export { BundledSkillProvider, parseSkillAsset, PROVIDER_NAME } from './grill/provider.ts'
