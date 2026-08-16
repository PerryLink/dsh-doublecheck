/**
 * Durable type-table merges owned by this package.
 *
 * The `doublecheck` projection key is declared here (its one home) and
 * re-exported from the package root so consumers receive the
 * `SessionProjectionMap` merge.
 * @module dsh-doublecheck/types
 */

import { z as zod } from 'zod'
import type { DisciplineStage, TestColor } from './domain/stages.ts'
import type { GateVerdict } from './domain/gate.ts'
// Type-only side effect: pulls the projection package into the program so the
// `SessionProjectionMap` augmentation below merges into the real table.
import type {} from '@deepseek-ai/dsh-session-projection'

/** The whole wire value of the `doublecheck` session projection. */
export interface DoublecheckView {
  /** The last discipline stage reached on durable evidence. */
  stage: DisciplineStage
  /** The latest test-run evidence color. */
  color: TestColor
  /** Whether a committed requirements spec exists in the log. */
  hasSpec: boolean
  /** The goal of the latest committed spec, or '' before any spec. */
  specGoal: string
  /** Whether an adversary review record exists in the log. */
  reviewed: boolean
  /** Total implementation edits folded so far. */
  editCount: number
  /** The latest delivery-gate verdict, or 'none' before any gate run. */
  gateVerdict: 'none' | GateVerdict
  /** Red-light (failing) checks of the latest gate run. */
  gateRedCount: number
}

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
})

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionMap {
    doublecheck: DoublecheckView
  }
}
