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
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUNDLED_SKILL_RANK, isSkillName, } from '@deepseek-ai/dsh-skill';
/** Provider name under which the registry files these skills. */
export const PROVIDER_NAME = 'doublecheck';
/** Skill origin bucket: these are host-bundled package assets. */
const SOURCE = 'bundled';
/** Invocation policy: both the model and the human slash-command surface may use these skills. */
const INVOCATION = Object.freeze({ modelInvocable: true, userInvocable: true });
/** Package skills root, resolved identically from `src/` and the built `lib/`. */
const SKILLS_ROOT = fileURLToPath(new URL('../../skills/', import.meta.url));
/**
 * SkillProvider publishing the package's bundled `skills/` directory. List
 * parses the frontmatter of every skill's SKILL.md; get re-reads the body so
 * on-disk edits appear on the next load. A malformed asset is reported as an
 * unreadable skill (skipped, logged), matching the registry's provider
 * containment contract.
 */
export class BundledSkillProvider {
    name = PROVIDER_NAME;
    ctx;
    constructor(ctx) {
        this.ctx = ctx;
    }
    /**
     * Discover the bundled skill candidates.
     * @param options - lookup options; `signal` cancels directory and file reads.
     * @returns the complete candidate list for the bundled root.
     */
    async list(options) {
        // A bundled-root listing is a single directory read plus one parallel file
        // read per skill; the abort signal still guards every read through `parse`.
        const entries = await readdir(SKILLS_ROOT, { withFileTypes: true });
        const parsedEntries = await Promise.all(entries
            .filter(entry => entry.isDirectory())
            .map(async (entry) => {
            const directory = join(SKILLS_ROOT, entry.name);
            const file = join(directory, 'SKILL.md');
            const parsed = await this.parse(file, options.signal);
            return parsed === undefined ? undefined : { parsed, file, directory };
        }));
        const candidates = [];
        for (const entry of parsedEntries) {
            if (entry === undefined)
                continue;
            const { parsed, file, directory } = entry;
            candidates.push({
                name: parsed.name,
                description: parsed.description,
                ...parsed.whenToUse !== undefined ? { whenToUse: parsed.whenToUse } : {},
                invocation: INVOCATION,
                provider: PROVIDER_NAME,
                source: SOURCE,
                rank: BUNDLED_SKILL_RANK,
                locator: { file, directory },
                resourceBase: { kind: 'directory', path: directory },
                path: file,
            });
        }
        return candidates.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    }
    /**
     * Load a complete bundled skill body.
     * @param candidate - a candidate previously returned by {@link list}.
     * @param options - lookup options; `signal` cancels the read.
     * @returns the full skill definition, or `undefined` when the file no longer parses.
     */
    async get(candidate, options) {
        const locator = candidate.locator;
        const parsed = await this.parse(locator.file, options.signal);
        if (parsed === undefined)
            return undefined;
        return {
            name: parsed.name,
            description: parsed.description,
            ...parsed.whenToUse !== undefined ? { whenToUse: parsed.whenToUse } : {},
            invocation: INVOCATION,
            provider: PROVIDER_NAME,
            source: SOURCE,
            resourceBase: { kind: 'directory', path: locator.directory },
            path: locator.file,
            content: parsed.content,
        };
    }
    async parse(file, signal) {
        let raw;
        try {
            raw = await readFile(file, { encoding: 'utf8', signal });
        }
        catch (error) {
            if (signal?.aborted === true)
                throw error;
            // A directory entry without SKILL.md is not a skill; any other read
            // failure on our own bundled asset is an installation defect and
            // propagates to the registry's provider containment.
            if (hasErrorCode(error, 'ENOENT') || hasErrorCode(error, 'ENOTDIR'))
                return undefined;
            throw error;
        }
        const parsed = parseSkillAsset(raw);
        if (parsed === undefined) {
            this.ctx.logger.warn(`dsh-doublecheck: bundled skill file ${file} is malformed and was skipped`);
            return undefined;
        }
        if (!isSkillName(parsed.name)) {
            this.ctx.logger.warn(`dsh-doublecheck: bundled skill file ${file} has invalid skill name "${parsed.name}" and was skipped`);
            return undefined;
        }
        return parsed;
    }
}
/**
 * Parse a bundled SKILL.md asset: YAML-frontmatter scalars plus the body.
 * Only the three fields this package ships are read; the frontmatter itself
 * stays standard Agent Skills YAML.
 * @param raw - the full file text.
 * @returns the parsed skill, or `undefined` when the file has no valid frontmatter.
 */
export function parseSkillAsset(raw) {
    const firstLineEnd = raw.indexOf('\n');
    if (firstLineEnd < 0)
        return undefined;
    const firstLine = raw.slice(0, firstLineEnd).replace(/\r$/, '');
    if (firstLine !== '---')
        return undefined;
    const closing = findClosingFence(raw, firstLineEnd + 1);
    if (closing === undefined)
        return undefined;
    const frontmatter = raw.slice(firstLineEnd + 1, closing.start);
    const name = scalarField(frontmatter, 'name');
    const description = scalarField(frontmatter, 'description');
    if (name === undefined || description === undefined)
        return undefined;
    const whenToUse = scalarField(frontmatter, 'whenToUse');
    return {
        name,
        description,
        ...whenToUse !== undefined ? { whenToUse } : {},
        content: raw.slice(closing.bodyStart).trim(),
    };
}
/** Locate the closing `---` fence line and the body start after it. */
function findClosingFence(raw, start) {
    let lineStart = start;
    while (lineStart <= raw.length) {
        const nextNewline = raw.indexOf('\n', lineStart);
        const lineEnd = nextNewline < 0 ? raw.length : nextNewline;
        const line = raw.slice(lineStart, lineEnd).replace(/\r$/, '');
        if (line === '---') {
            return { start: lineStart, bodyStart: nextNewline < 0 ? raw.length : nextNewline + 1 };
        }
        if (nextNewline < 0)
            return undefined;
        lineStart = nextNewline + 1;
    }
    return undefined;
}
/** Read one `key: value` scalar line, stripping one layer of matching quotes. */
function scalarField(frontmatter, key) {
    for (const line of frontmatter.split('\n')) {
        const match = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
        if (match === null || match[1] !== key)
            continue;
        const value = match[2].trim();
        if (value.length === 0)
            return undefined;
        const quote = value[0];
        if ((quote === '"' || quote === "'") && value.endsWith(quote) && value.length >= 2) {
            return value.slice(1, -1);
        }
        return value;
    }
    return undefined;
}
/** Whether an arbitrary thrown value carries the given Node error code. */
function hasErrorCode(error, code) {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}
