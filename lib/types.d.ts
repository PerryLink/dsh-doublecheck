/**
 * Durable type-table merges owned by this package.
 *
 * The `doublecheck` projection key is declared here (its one home) and
 * re-exported from the package root so consumers receive the
 * `SessionProjectionMap` merge.
 * @module dsh-doublecheck/types
 */
import { z as zod } from 'zod';
import type { DoublecheckProjectionState } from './domain/projection.js';
/**
 * The whole wire value of the `doublecheck` session projection: ONE bounded
 * status line, e.g.
 *
 * ```text
 * gate:rework r2 | stage:green | test:green edits:12 spec:yes review:yes | goal:ship parser fix
 * ```
 *
 * It is a string rather than an object on purpose. The eight state fields cost
 * 126 characters as compact JSON even at their shortest possible values, so no
 * object-shaped payload can survive a renderer that keeps one line under 121
 * characters — which is exactly how `gateVerdict` and `gateRedCount` used to
 * disappear. `renderDoublecheckLine` (`./domain/projection.ts`) owns the
 * format and the {@link DOUBLECHECK_LINE_MAX} budget.
 */
export type DoublecheckView = string;
/** Validates the `doublecheck` projection's wire payload before it leaves the host. */
export declare const doublecheckViewSchema: zod.ZodString;
/** Validates the persisted `doublecheck` projection state before it seeds a fold. */
export declare const doublecheckStateSchema: zod.ZodObject<{
    stage: zod.ZodUnion<readonly [zod.ZodLiteral<"grill">, zod.ZodLiteral<"design">, zod.ZodLiteral<"red">, zod.ZodLiteral<"green">, zod.ZodLiteral<"review">, zod.ZodLiteral<"verify">]>;
    color: zod.ZodUnion<readonly [zod.ZodLiteral<"none">, zod.ZodLiteral<"red">, zod.ZodLiteral<"green">]>;
    hasSpec: zod.ZodBoolean;
    specGoal: zod.ZodString;
    reviewed: zod.ZodBoolean;
    editCount: zod.ZodNumber;
    gateVerdict: zod.ZodUnion<readonly [zod.ZodLiteral<"none">, zod.ZodLiteral<"deliverable">, zod.ZodLiteral<"rework">]>;
    gateRedCount: zod.ZodNumber;
    pendingSpecCalls: zod.ZodRecord<zod.ZodString, zod.ZodString>;
    pendingTestCalls: zod.ZodRecord<zod.ZodString, zod.ZodString>;
}, zod.core.$strip>;
declare module '@deepseek-ai/dsh-session-projection/types' {
    interface SessionProjectionStateMap {
        doublecheck: DoublecheckProjectionState;
    }
    interface SessionProjectionMap {
        doublecheck: DoublecheckView;
    }
}
