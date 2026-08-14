import { describe, expect, it } from 'vitest'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import { compileDetection } from '../src/domain/evidence.ts'
import { deriveReportVerdict, foldReportFacts } from '../src/domain/report.ts'
import reportLoop from './fixtures/report-loop.json'
import reviewLoop from './fixtures/review-loop.json'

/**
 * Shape regression over REAL session transcripts (recorded from the v0.3 /
 * v0.4 headless acceptance runs). The fixtures pin the exact durable event
 * shapes the folds consume, so a harness vocabulary change breaks here
 * instead of silently misreading live sessions.
 */

function detection() {
  return compileDetection({
    testToolNames: ['bash', 'pwsh'],
    testCommandPatterns: ['(?:^|[;&|]\\s*)(?:(?:pnpm|npm|npx|yarn|bun)(?:\\s+run)?\\s+(?:test|vitest|jest|mocha)(?:\\s|$))'],
    guardTools: ['edit', 'write'],
    testFilePatterns: ['(^|[\\\\/])(tests?|__tests__|specs?)([\\\\/]|$)', '\\.(test|spec)\\.[A-Za-z0-9]+$'],
  })
}

describe('real-transcript regression', () => {
  it('folds the v0.4 report run: spec, red, green, edits, report call', () => {
    const events = reportLoop as unknown as SessionEvent[]
    expect(events.length).toBeGreaterThan(0)
    expect(events.some(event => event.type === 'tool/call' && event.data.name === 'doublecheck_report')).toBe(true)

    const facts = foldReportFacts(events, detection())
    expect(facts.spec).not.toBeNull()
    expect(facts.testRuns.failed).toBeGreaterThanOrEqual(1)
    expect(facts.testRuns.passed).toBeGreaterThanOrEqual(1)
    expect(facts.edits).toBeGreaterThanOrEqual(1)
    expect(deriveReportVerdict(facts, null)).toBe('green')
  })

  it('folds the v0.3 review run: spec, reds, edits; the pre-v0.4 review source shape is ignored by design', () => {
    const events = reviewLoop as unknown as SessionEvent[]
    const facts = foldReportFacts(events, detection())
    expect(facts.spec).not.toBeNull()
    expect(facts.testRuns.failed).toBeGreaterThanOrEqual(1)
    expect(facts.edits).toBeGreaterThanOrEqual(1)
    // That run predates the structured `doublecheck-review` message source:
    // its plugin-shaped injection is not a review record for the fold.
    expect(facts.review).toBeNull()
  })
})
