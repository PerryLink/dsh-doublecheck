/**
 * Durable type-table merges owned by this package.
 *
 * The `doublecheck` projection key is declared here (its one home) and
 * re-exported from the package root so consumers receive the
 * `SessionProjectionMap` merge.
 * @module dsh-doublecheck/types
 */
import { z as zod } from 'zod';
import type { DisciplineStage, TestColor } from './domain/stages.ts';
/** The whole wire value of the `doublecheck` session projection. */
export interface DoublecheckView {
    /** The last discipline stage reached on durable evidence. */
    stage: DisciplineStage;
    /** The latest test-run evidence color. */
    color: TestColor;
    /** Whether a committed requirements spec exists in the log. */
    hasSpec: boolean;
    /** The goal of the latest committed spec, or '' before any spec. */
    specGoal: string;
    /** Whether an adversary review record exists in the log. */
    reviewed: boolean;
    /** Total implementation edits folded so far. */
    editCount: number;
}
/** Validates the `doublecheck` projection's wire payload before it leaves the host. */
export declare const doublecheckViewSchema: zod.ZodObject<{
    stage: zod.ZodUnion<readonly [zod.ZodLiteral<"grill">, zod.ZodLiteral<"design">, zod.ZodLiteral<"red">, zod.ZodLiteral<"green">, zod.ZodLiteral<"review">, zod.ZodLiteral<"verify">]>;
    color: zod.ZodUnion<readonly [zod.ZodLiteral<"none">, zod.ZodLiteral<"red">, zod.ZodLiteral<"green">]>;
    hasSpec: zod.ZodBoolean;
    specGoal: zod.ZodString;
    reviewed: zod.ZodBoolean;
    editCount: zod.ZodNumber;
}, zod.core.$strip>;
declare module '@deepseek-ai/dsh-session-projection/types' {
    interface SessionProjectionMap {
        doublecheck: DoublecheckView;
    }
}
