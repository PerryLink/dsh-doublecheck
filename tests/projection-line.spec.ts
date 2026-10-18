/**
 * The `doublecheck` wire line's one hard contract: WORST CASE <= 120 code
 * units, so no one-line renderer can ever truncate it.
 *
 * Why 120 is the acceptance number: the WeChat bridge renders an unknown
 * projection key through its generic renderer, which returns a string value
 * unchanged only while `value.length <= 120`; over that it cuts to 117 units
 * plus `…` (`dsh-wechat` `renderProjectionValue` / `truncateForWeChat`). The
 * object-shaped view this projection used to emit was 131 units when empty, so
 * `gateVerdict` and `gateRedCount` — the two facts a user opens `/status` on a
 * phone to see — were cut off for EVERY possible value. This suite pins the
 * replacement: the budget is asserted for a full sweep of extreme inputs, not
 * just one example.
 * @module dsh-doublecheck/test/projection-line
 */

import { describe, expect, it } from 'vitest'
import {
  DOUBLECHECK_GOAL_MAX,
  DOUBLECHECK_LINE_MAX,
  emptyDoublecheckState,
  renderDoublecheckLine,
  type DoublecheckProjectionState,
} from '../src/domain/projection.ts'
import { doublecheckViewSchema } from '../src/types.ts'
import type { DisciplineStage, TestColor } from '../src/domain/stages.ts'

const STAGES: readonly DisciplineStage[] = ['grill', 'design', 'red', 'green', 'review', 'verify']
const COLORS: readonly TestColor[] = ['none', 'red', 'green']
const VERDICTS: readonly DoublecheckProjectionState['gateVerdict'][] = ['none', 'deliverable', 'rework']

/** Count inputs that used to be unbounded: caps, sentinels, and non-finite values. */
const COUNTS: readonly number[] = [0, 1, 9999, 10000, 99999, 100000, Number.MAX_SAFE_INTEGER, -7, 1.7, Number.NaN, Number.POSITIVE_INFINITY]

/** Goals aimed at the field's failure modes: huge, multi-line, separators, astral, CJK. */
const GOALS: readonly string[] = [
  '',
  'ship the parser fix',
  'a'.repeat(10_000),
  'line one\nline two\r\nline three',
  'pipe | inside | the goal',
  '🚀'.repeat(500),
  '修复解析器中的截断缺陷，并保证最坏情况不超过一百二十个字符',
  'tab\there and \u0000 a NUL and \u2028 a separator',
  `astral at the cut boundary ${'🐙'.repeat(30)}`,
  'x'.repeat(DOUBLECHECK_LINE_MAX),
]

/** A state with every field forced to its longest / largest legal value. */
function worstCaseState(overrides: Partial<DoublecheckProjectionState> = {}): DoublecheckProjectionState {
  return {
    ...emptyDoublecheckState(),
    stage: 'design',
    color: 'green',
    hasSpec: true,
    specGoal: 'a'.repeat(10_000),
    reviewed: true,
    editCount: Number.MAX_SAFE_INTEGER,
    gateVerdict: 'deliverable',
    gateRedCount: Number.MAX_SAFE_INTEGER,
    ...overrides,
  }
}

/** The `gate:... r...` first segment, where the red-light count lives. */
function headOf(state: DoublecheckProjectionState): string {
  return renderDoublecheckLine(state).split(' | ')[0] ?? ''
}

describe('doublecheck projection line budget', () => {
  // THE acceptance test: every extreme combination stays inside the budget.
  it('stays <= 120 code units for every extreme value combination', () => {
    let over = 0
    let firstOver = ''
    let longest = 0
    let longestLine = ''
    let cases = 0
    for (const stage of STAGES) {
      for (const color of COLORS) {
        for (const gateVerdict of VERDICTS) {
          for (const hasSpec of [false, true]) {
            for (const reviewed of [false, true]) {
              for (const count of COUNTS) {
                for (const goal of GOALS) {
                  const line = renderDoublecheckLine({
                    ...emptyDoublecheckState(),
                    stage, color, gateVerdict, hasSpec, reviewed, specGoal: goal,
                    gateRedCount: count, editCount: count,
                  })
                  cases += 1
                  if (line.length > DOUBLECHECK_LINE_MAX) {
                    over += 1
                    if (firstOver === '') firstOver = `${String(line.length)}: ${line}`
                  }
                  if (line.length > longest) {
                    longest = line.length
                    longestLine = line
                  }
                }
              }
            }
          }
        }
      }
    }
    expect(firstOver).toBe('')
    expect(over).toBe(0)
    // Non-vacuous: a large sweep really ran, and the budget really is reached
    // (a line that never approached 120 would make the bound meaningless).
    expect(cases).toBe(23_760)
    expect(longest).toBe(DOUBLECHECK_LINE_MAX)
    expect(longestLine.length).toBe(120)
  })

  it('stays exactly at budget for the single worst case', () => {
    const line = renderDoublecheckLine(worstCaseState())
    const head = 'gate:deliverable r9999+ | stage:design | test:green edits:99999+ spec:yes review:yes'
    expect(head.length).toBe(84)
    expect(line.slice(0, head.length)).toBe(head)
    // 28 units of goal budget: 27 characters plus the clipping ellipsis.
    expect(line.slice(head.length)).toBe(` | goal:${'a'.repeat(27)}…`)
    expect(line.length).toBe(DOUBLECHECK_LINE_MAX)
  })

  it('leaves at least 28 code units of goal budget after the worst fixed head', () => {
    // The worst head is the one that also has to pay for `spec:yes`.
    const worstHead = 'gate:deliverable r9999+ | stage:design | test:green edits:99999+ spec:yes review:yes'
    expect(worstHead.length).toBe(84)
    const line = renderDoublecheckLine(worstCaseState())
    expect(line.slice(0, worstHead.length)).toBe(worstHead)
    expect(DOUBLECHECK_LINE_MAX - worstHead.length - ' | goal:'.length).toBe(28)
    // The 28 units are really used: the goal is clipped to fill them exactly.
    expect(line.length).toBe(DOUBLECHECK_LINE_MAX)
    // Without a committed spec there is no goal segment, and `spec:no` is one
    // unit shorter, so that line can never be the longest one.
    const noSpec = renderDoublecheckLine(worstCaseState({ hasSpec: false }))
    expect(noSpec).toBe(worstHead.replace('spec:yes', 'spec:no'))
    expect(noSpec.length).toBe(83)
  })

  it('renders the empty fold state as a readable 64-unit line', () => {
    const line = renderDoublecheckLine(emptyDoublecheckState())
    expect(line).toBe('gate:none r0 | stage:grill | test:none edits:0 spec:no review:no')
    expect(line.length).toBe(64)
  })

  it('never emits a second line, a control character, or a forged goal separator', () => {
    for (const goal of GOALS.filter(candidate => candidate.trim() !== '')) {
      const line = renderDoublecheckLine(worstCaseState({ specGoal: goal }))
      // No control category character (newline, tab, NUL, C1 range) survives...
      expect(line).not.toMatch(/\p{Cc}/u)
      // ...and neither does a Unicode line/paragraph separator.
      expect(line).not.toMatch(/[\u2028\u2029]/u)
      // Exactly four segments: the goal cannot forge a fifth.
      expect(line.split(' | ').length).toBe(4)
      expect(line.split(' | ')[0]).toBe('gate:deliverable r9999+')
    }
  })

  it('keeps the three first-read facts lossless, led by the gate verdict', () => {
    const line = renderDoublecheckLine(worstCaseState({ gateVerdict: 'rework', gateRedCount: 2, stage: 'review', editCount: 12 }))
    expect(line.startsWith('gate:rework r2 | stage:review')).toBe(true)
    expect(line).toContain('edits:12')
    expect(line).toContain('goal:')
  })

  it('marks a clipped goal with an ellipsis and keeps a short goal whole', () => {
    const short = renderDoublecheckLine(worstCaseState({ specGoal: 'fix it' }))
    expect(short.endsWith('| goal:fix it')).toBe(true)
    const clipped = renderDoublecheckLine(worstCaseState({
      specGoal: 'c'.repeat(500), gateVerdict: 'none', gateRedCount: 0, editCount: 0, stage: 'red', color: 'none',
    }))
    expect(clipped.endsWith('…')).toBe(true)
    expect(clipped).toContain('goal:ccc')
  })

  it('never splits a surrogate pair at the cut', () => {
    // The worst head leaves 28 units, so the cut lands at goal unit 27.
    // (a) An astral character straddling unit 27 is dropped whole.
    const straddling = renderDoublecheckLine(worstCaseState({ specGoal: `${'d'.repeat(26)}🐙tail` }))
    expect(straddling.slice(straddling.indexOf('goal:') + 'goal:'.length)).toBe(`${'d'.repeat(26)}…`)
    expect(straddling.length).toBe(119)
    // (b) An astral character ending exactly at unit 27 survives whole, and the
    // clip lands after it.
    const kept = renderDoublecheckLine(worstCaseState({ specGoal: `${'d'.repeat(25)}🐙tail` }))
    expect(kept.slice(kept.indexOf('goal:') + 'goal:'.length)).toBe(`${'d'.repeat(25)}🐙…`)
    expect(kept.length).toBe(DOUBLECHECK_LINE_MAX)
    for (const line of [straddling, kept]) {
      // No dangling high surrogate before the ellipsis (iLink rejects it).
      const before = line.charCodeAt(line.length - 2)
      expect(before >= 0xD800 && before <= 0xDBFF).toBe(false)
    }
  })

  it('caps the goal at 40 units even when the remaining budget would allow more', () => {
    const shortHead = {
      stage: 'red' as const, color: 'none' as const, gateVerdict: 'none' as const,
      reviewed: false, editCount: 0, gateRedCount: 0, hasSpec: true,
    }
    const exact = renderDoublecheckLine(worstCaseState({ ...shortHead, specGoal: 'g'.repeat(DOUBLECHECK_GOAL_MAX) }))
    expect(exact.endsWith(`goal:${'g'.repeat(DOUBLECHECK_GOAL_MAX)}`)).toBe(true)
    const over = renderDoublecheckLine(worstCaseState({ ...shortHead, specGoal: 'g'.repeat(DOUBLECHECK_GOAL_MAX + 8) }))
    expect(over.endsWith(`goal:${'g'.repeat(DOUBLECHECK_GOAL_MAX - 1)}…`)).toBe(true)
    // A short head leaves slack, so this line stays well under the hard budget.
    expect(over.length).toBeLessThan(DOUBLECHECK_LINE_MAX)
  })

  it('degrades non-finite and negative counts instead of growing the line', () => {
    expect(headOf(worstCaseState({ gateRedCount: Number.NaN }))).toBe('gate:deliverable r0')
    expect(headOf(worstCaseState({ gateRedCount: Number.POSITIVE_INFINITY }))).toBe('gate:deliverable r0')
    expect(headOf(worstCaseState({ gateRedCount: -7 }))).toBe('gate:deliverable r0')
    expect(headOf(worstCaseState({ gateRedCount: 1.7 }))).toBe('gate:deliverable r1')
    expect(renderDoublecheckLine(worstCaseState({ editCount: Number.MAX_SAFE_INTEGER }))).toContain('edits:99999+')
  })

  it('drops the goal segment when no spec was committed, even if a goal is present', () => {
    const line = renderDoublecheckLine(worstCaseState({ hasSpec: false, specGoal: 'orphan goal' }))
    expect(line).not.toContain('goal:')
    expect(line).toContain('spec:no')
  })
})

describe('doublecheck wire schema enforces the same budget', () => {
  it('accepts every swept line', () => {
    for (const stage of STAGES) {
      for (const goal of GOALS) {
        const line = renderDoublecheckLine(worstCaseState({ stage, specGoal: goal }))
        expect(doublecheckViewSchema.parse(line)).toBe(line)
      }
    }
  })

  it('rejects a line one unit over budget, so a future field fails loud', () => {
    expect(doublecheckViewSchema.safeParse('x'.repeat(DOUBLECHECK_LINE_MAX)).success).toBe(true)
    expect(doublecheckViewSchema.safeParse('x'.repeat(DOUBLECHECK_LINE_MAX + 1)).success).toBe(false)
  })

  it('rejects the retired object payload', () => {
    expect(doublecheckViewSchema.safeParse({ stage: 'grill', gateVerdict: 'none' }).success).toBe(false)
  })
})
