/**
 * Package-owned invariant companion for dsh-doublecheck.
 *
 * Three post-commit diagnostic checks over the events this package's write
 * paths produce (all three target events are committed before dispatch, so a
 * violation is reported — via the host registry's `fail` — rather than
 * vetoed):
 *
 * 1. Every `doublecheck/spec` announcement carries six non-empty spec fields.
 * 2. Every `doublecheck/report` announcement's verdict is consistent with the
 *    log re-derivation. When verification did not run, the two must be equal;
 *    when verification ran, a failing check must report `challenged` and a
 *    clean one must report `proven` or `unverified` (the `complete` fact rides
 *    the tool result, not this event, so equality is not checkable there).
 * 3. Every `doublecheck/review` announcement's findings satisfy the
 *    structured finding shape (severity enum, non-empty title and detail).
 *
 * The guard registers a facts-bearing installer from its own context; the
 * `./invariant` export is the standalone companion usable through a separate
 * profile row.
 * @module dsh-doublecheck/invariant
 */
import type { Context } from '@deepseek-ai/cordis';
import type { TestRunDetection } from './domain/evidence.ts';
/** Full npm package name owning the reported failures. */
export declare const PACKAGE_NAME = "dsh-doublecheck";
/** A package-attributed invariant failure reported by the host registry. */
export type InvariantFailure = (message: string) => never;
/** Facts the installer needs beyond the event stream. */
export interface InvariantFacts {
    /** The compiled red/green detection backing the report re-derivation. */
    detection(): TestRunDetection;
}
/** Installer callback accepted by the host's invariant registry. */
export type InvariantInstaller = (ctx: Context, fail: InvariantFailure) => void | Promise<void>;
/** Minimal runtime contract used by the companion without a source checkout. */
export interface InvariantRegistry {
    register(packageName: string, installer: InvariantInstaller): () => void;
}
/** Cordis companion plugin name. */
export declare const name = "dsh-doublecheck-invariant";
/** Service required before the companion can reserve package ownership. */
export declare const inject: string[];
/**
 * Build the installer over a facts source. The standalone companion and the
 * main plugin share this body; only the facts differ.
 * @param facts - the report re-derivation knobs.
 * @returns the installer the host registry activates in its child context.
 */
export declare function installInvariant(facts: InvariantFacts): InvariantInstaller;
/**
 * Register the standalone companion with envelope-only facts.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export declare const apply: (ctx: Context) => Promise<() => void>;
