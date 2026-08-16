/**
 * Durable type-table merges owned by this package.
 *
 * The `doublecheck` projection key is declared here (its one home) and
 * re-exported from the package root so consumers receive the
 * `SessionProjectionMap` merge.
 * @module dsh-doublecheck/types
 */
import { z as zod } from 'zod';
/** Validates the `doublecheck` projection's wire payload before it leaves the host. */
export const doublecheckViewSchema = zod.object({
    stage: zod.union([zod.literal('grill'), zod.literal('design'), zod.literal('red'), zod.literal('green'), zod.literal('review'), zod.literal('verify')]),
    color: zod.union([zod.literal('none'), zod.literal('red'), zod.literal('green')]),
    hasSpec: zod.boolean(),
    specGoal: zod.string(),
    reviewed: zod.boolean(),
    editCount: zod.number(),
    gateVerdict: zod.union([zod.literal('none'), zod.literal('deliverable'), zod.literal('rework')]),
    gateRedCount: zod.number(),
});
