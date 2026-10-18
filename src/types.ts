/**
 * Durable type-table merges owned by this package.
 *
 * The `doublecheck` projection key is declared here (its one home) and
 * re-exported from the package root so consumers receive the
 * `SessionProjectionMap` merge.
 * @module dsh-doublecheck/types
 */

import { z as zod } from 'zod'
import type { DoublecheckProjectionState } from './domain/projection.ts'
// Value import (the one runtime edge in this type table): the wire line's
// budget is declared once, next to the renderer that must honor it.
import { DOUBLECHECK_LINE_MAX } from './domain/projection.ts'
// Type-only side effect: pulls the projection package into the program so the
// `SessionProjectionMap` / `SessionProjectionStateMap` augmentations below
// merge into the real tables.
import type {} from '@deepseek-ai/dsh-session-projection'

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
export type DoublecheckView = string

/** Validates the `doublecheck` projection's wire payload before it leaves the host. */
export const doublecheckViewSchema = zod.string().max(DOUBLECHECK_LINE_MAX)

/** Validates the persisted `doublecheck` projection state before it seeds a fold. */
export const doublecheckStateSchema = zod.object({
  stage: zod.union([zod.literal('grill'), zod.literal('design'), zod.literal('red'), zod.literal('green'), zod.literal('review'), zod.literal('verify')]),
  color: zod.union([zod.literal('none'), zod.literal('red'), zod.literal('green')]),
  hasSpec: zod.boolean(),
  specGoal: zod.string(),
  reviewed: zod.boolean(),
  editCount: zod.number(),
  gateVerdict: zod.union([zod.literal('none'), zod.literal('deliverable'), zod.literal('rework')]),
  gateRedCount: zod.number(),
  pendingSpecCalls: zod.record(zod.string(), zod.string()),
  pendingTestCalls: zod.record(zod.string(), zod.string()),
})

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionStateMap {
    doublecheck: DoublecheckProjectionState
  }
  interface SessionProjectionMap {
    doublecheck: DoublecheckView
  }
}
