/**
 * Bundled skill provider for dsh-doublecheck's own `skills/` directory.
 *
 * The directory keeps the generic Agent Skills layout (`<name>/SKILL.md` with
 * YAML frontmatter) so the assets stay liftable into any other Agent Skills
 * ecosystem; this provider is the DSH-facing adapter that publishes them on
 * `ctx.skills`.
 *
 * @module dsh-doublecheck/grill/provider
 */
import type { Context } from '@deepseek-ai/cordis';
import { type SkillCandidate, type SkillDefinition, type SkillLookupOptions, type SkillProvider } from '@deepseek-ai/dsh-skill';
/** Provider name under which the registry files these skills. */
export declare const PROVIDER_NAME = "doublecheck";
/** One parsed skill asset: metadata from the frontmatter and the instruction body. */
interface ParsedSkill {
    name: string;
    description: string;
    whenToUse?: string;
    content: string;
}
/**
 * SkillProvider publishing the package's bundled `skills/` directory. List
 * parses the frontmatter of every skill's SKILL.md; get re-reads the body so
 * on-disk edits appear on the next load. A malformed asset is reported as an
 * unreadable skill (skipped, logged), matching the registry's provider
 * containment contract.
 */
export declare class BundledSkillProvider implements SkillProvider {
    readonly name = "doublecheck";
    private readonly ctx;
    constructor(ctx: Context);
    /**
     * Discover the bundled skill candidates.
     * @param options - lookup options; `signal` cancels directory and file reads.
     * @returns the complete candidate list for the bundled root.
     */
    list(options: SkillLookupOptions): Promise<SkillCandidate[]>;
    /**
     * Load a complete bundled skill body.
     * @param candidate - a candidate previously returned by {@link list}.
     * @param options - lookup options; `signal` cancels the read.
     * @returns the full skill definition, or `undefined` when the file no longer parses.
     */
    get(candidate: SkillCandidate, options: SkillLookupOptions): Promise<SkillDefinition | undefined>;
    private parse;
}
/**
 * Parse a bundled SKILL.md asset: YAML-frontmatter scalars plus the body.
 * Only the three fields this package ships are read; the frontmatter itself
 * stays standard Agent Skills YAML.
 * @param raw - the full file text.
 * @returns the parsed skill, or `undefined` when the file has no valid frontmatter.
 */
export declare function parseSkillAsset(raw: string): ParsedSkill | undefined;
export {};
//# sourceMappingURL=provider.d.ts.map