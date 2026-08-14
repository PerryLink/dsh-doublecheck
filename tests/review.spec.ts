import { describe, expect, it } from 'vitest'
import { assertObjectJsonSchema } from '@deepseek-ai/dsh-tools'
import type { ReviewFinding } from '../src/events.ts'
import { CLEAN_TEXT, renderFindings, REVIEW_OUTPUT_SCHEMA } from '../src/guard/review.ts'

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

  it('renders findings with severity tags and an answer directive', () => {
    const text = renderFindings(findings)
    expect(text).toContain('2 objection(s)')
    expect(text).toContain('[blocker] no acceptance evidence')
    expect(text).toContain('[major] scope drift')
    expect(text).toContain('Answer each')
  })

  it('renders the clean verdict text', () => {
    expect(CLEAN_TEXT).toContain('no objections')
  })
})
