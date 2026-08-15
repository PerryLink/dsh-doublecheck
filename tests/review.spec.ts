import { describe, expect, it } from 'vitest'
import { assertObjectJsonSchema } from '@deepseek-ai/dsh-tools'
import type { ReviewFinding } from '../src/events.ts'
import { CLEAN_TEXT, renderFindings, REVIEW_OUTPUT_SCHEMA, sortFindings } from '../src/guard/review.ts'

const findings: ReviewFinding[] = [
  { severity: 'blocker', title: 'no acceptance evidence', detail: 'The acceptance command never ran.' },
  { severity: 'major', title: 'scope drift', detail: 'A file outside the agreed scope changed.' },
]

describe('adversary review schema and rendering', () => {
  it('satisfies the enforced JSON-schema subset', () => {
    expect(() => assertObjectJsonSchema(REVIEW_OUTPUT_SCHEMA)).not.toThrow()
  })

  it('rejects a findings payload that breaks the schema', () => {
    const bad = { ...REVIEW_OUTPUT_SCHEMA, required: ['nope'] }
    expect(() => assertObjectJsonSchema(bad)).toThrow()
  })

  it('sorts findings blocker-first, stable within a severity', () => {
    const shuffled: ReviewFinding[] = [
      { severity: 'info', title: 'i', detail: 'info' },
      { severity: 'blocker', title: 'b2', detail: 'blocker 2' },
      { severity: 'major', title: 'm', detail: 'major' },
      { severity: 'blocker', title: 'b1', detail: 'blocker 1' },
      { severity: 'minor', title: 'min', detail: 'minor' },
    ]
    expect(sortFindings(shuffled).map(finding => finding.title)).toEqual(['b2', 'b1', 'm', 'min', 'i'])
    expect(shuffled.map(finding => finding.title)).toEqual(['i', 'b2', 'm', 'b1', 'min'])
  })

  it('renders findings with severity tags and an answer directive', () => {
    const text = renderFindings(findings)
    expect(text).toContain('2 objection(s)')
    expect(text).toContain('[blocker] no acceptance evidence')
    expect(text).toContain('[major] scope drift')
    expect(text).toContain('Answer each')
  })

  it('notes findings held back by the max-findings cap', () => {
    const text = renderFindings([findings[0]!], undefined, 4)
    expect(text).toContain('3 further objection(s) held back by adversaryMaxFindings')
    expect(text).toContain('[blocker] no acceptance evidence')
    expect(text).not.toContain('[major] scope drift')
  })

  it('renders the clean verdict text', () => {
    expect(CLEAN_TEXT).toContain('no objections')
  })
})
