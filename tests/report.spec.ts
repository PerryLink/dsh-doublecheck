import { describe, expect, it } from 'vitest'
import { assertObjectJsonSchema } from '@deepseek-ai/dsh-tools'
import { compileDetection } from '../src/domain/evidence.ts'
import {
  buildVerifyScript,
  deriveReportVerdict,
  emptyReportFacts,
  foldReportFacts,
  renderReportMarkdown,
  VERIFY_CHECK_SCHEMA,
  VERIFY_META,
  type ReportData,
} from '../src/domain/report.ts'
import type { ReviewFinding, VerifyCheck } from '../src/domain/vocabulary.ts'
import { codeDispatchRun, mutationCall, reviewInjectionEvent, shellCall, shellResult, specToolCall, userTask } from './helpers.ts'

const specFields = {
  goal: 'Ship the widget.',
  scope: 'Only the widget package.',
  acceptanceCriteria: 'All tests pass.',
  failureModes: 'Invalid input is rejected.',
  priorities: 'Correctness over speed.',
  nonGoals: 'No archive format changes.',
}

function detection() {
  return compileDetection({
    testToolNames: ['bash', 'pwsh'],
    testCommandPatterns: ['(?:^|[;&|]\\s*)(?:(?:pnpm|npm|npx|yarn|bun)(?:\\s+run)?\\s+(?:test|vitest|jest|mocha)(?:\\s|$))'],
    guardTools: ['edit', 'write'],
    testFilePatterns: ['(^|[\\\\/])(tests?|__tests__|specs?)([\\\\/]|$)', '\\.(test|spec)\\.[A-Za-z0-9]+$'],
  })
}

function reportData(facts = emptyReportFacts(), checks: VerifyCheck[] | null = null): ReportData {
  return {
    ...facts,
    verdict: deriveReportVerdict(facts, checks),
    verification: checks === null ? null : { checks },
    path: null,
    written: false,
  }
}

describe('foldReportFacts', () => {
  it('folds the spec, test timeline, edits, and review record in log order', () => {
    const events = [
      userTask('fix the bug in parser.ts'),
      specToolCall(specFields, 'spec-1'),
      shellCall('bash', 'pnpm test', 't-1'),
      shellResult('t-1', '[exit code: 1]'),
      mutationCall('edit', 'src/app.ts', 'e-1'),
      mutationCall('write', 'tests/app.spec.ts', 'w-1'),
      shellCall('bash', 'pnpm test', 't-2'),
      shellResult('t-2', '4 passed'),
      reviewInjectionEvent('findings', [{ severity: 'minor', title: 'x', detail: 'y' }]),
    ]
    const facts = foldReportFacts(events as never, detection())
    expect(facts.spec).toEqual(specFields)
    expect(facts.testRuns).toEqual({ failed: 1, passed: 1 })
    expect(facts.edits).toBe(1)
    expect(facts.timeline.map(entry => entry.kind)).toEqual(['spec', 'red', 'green', 'review'])
    expect(facts.review?.verdict).toBe('findings')
    expect(facts.review?.findings).toHaveLength(1)
  })

  it('ignores malformed spec calls and non-test commands', () => {
    const events = [
      specToolCall({ goal: 'only goal' }, 'spec-1'),
      shellCall('bash', 'pnpm build', 'b-1'),
      shellResult('b-1', '[exit code: 1]'),
    ]
    const facts = foldReportFacts(events as never, detection())
    expect(facts.spec).toBeNull()
    expect(facts.testRuns).toEqual({ failed: 0, passed: 0 })
    expect(facts.timeline).toHaveLength(0)
  })

  it('folds Code Mode test runs into the timeline', () => {
    const facts = foldReportFacts([codeDispatchRun('pnpm test', '[exit code: 2]')] as never, detection())
    expect(facts.testRuns).toEqual({ failed: 1, passed: 0 })
    expect(facts.timeline[0]?.kind).toBe('red')
  })

  it('tracks the latest review record', () => {
    const events = [
      reviewInjectionEvent('findings', [{ severity: 'blocker', title: 'a', detail: 'b' }]),
      reviewInjectionEvent('clean'),
    ]
    const facts = foldReportFacts(events as never, detection())
    expect(facts.review?.verdict).toBe('clean')
    expect(facts.review?.findings).toHaveLength(0)
  })
})

describe('deriveReportVerdict', () => {
  const empty = emptyReportFacts()

  it('walks the ladder from grill to verified', () => {
    expect(deriveReportVerdict(empty, null)).toBe('grill')
    const spec = { ...empty, spec: specFields }
    expect(deriveReportVerdict(spec, null)).toBe('draft')
    const edited = { ...spec, edits: 1 }
    const red = { ...edited, timeline: [{ kind: 'red' as const, detail: 'pnpm test' }] }
    expect(deriveReportVerdict(red, null)).toBe('red')
    const green = { ...edited, timeline: [{ kind: 'green' as const, detail: 'pnpm test' }] }
    expect(deriveReportVerdict(green, null)).toBe('green')
    const objectionable = { ...green, review: { verdict: 'findings' as const, findings: [] } }
    expect(deriveReportVerdict(objectionable, null)).toBe('objections')
    const verified = { ...green, review: { verdict: 'clean' as const, findings: [] } }
    expect(deriveReportVerdict(verified, null)).toBe('verified')
  })

  it('verification overrides with proven or challenged', () => {
    const facts = { ...emptyReportFacts(), spec: specFields, edits: 2, timeline: [{ kind: 'green' as const, detail: 'x' }] }
    const pass = (dimension: string): VerifyCheck => ({ dimension: dimension as VerifyCheck['dimension'], verdict: 'pass', evidence: 'e', note: '' })
    expect(deriveReportVerdict(facts, [pass('goal'), pass('scope')])).toBe('proven')
    expect(deriveReportVerdict(facts, [pass('goal'), { ...pass('scope'), verdict: 'fail' as const }])).toBe('challenged')
  })
})

describe('verify workflow artifacts', () => {
  it('builds a script that fans out one checker per dimension', () => {
    const script = buildVerifyScript()
    expect(script).toContain("phase('doublecheck verify')")
    expect(script).toContain('args.dimensions.map')
    expect(script).toContain('args.spec[dimension]')
    expect(script).toContain('checks.filter(Boolean)')
    expect(VERIFY_META.name).toBe('doublecheck-verify')
    expect(() => assertObjectJsonSchema(VERIFY_CHECK_SCHEMA)).not.toThrow()
  })
})

describe('renderReportMarkdown', () => {
  it('renders every section of the report', () => {
    const findings: ReviewFinding[] = [{ severity: 'major', title: 'scope drift', detail: 'a file outside scope changed.' }]
    const facts = {
      ...emptyReportFacts(),
      spec: specFields,
      edits: 3,
      testRuns: { failed: 1, passed: 2 },
      timeline: [
        { kind: 'spec' as const, detail: specFields.goal },
        { kind: 'red' as const, detail: 'pnpm test' },
        { kind: 'green' as const, detail: 'pnpm test' },
        { kind: 'review' as const, detail: 'findings' },
      ],
      review: { verdict: 'findings' as const, findings },
    }
    const markdown = renderReportMarkdown(reportData(facts))
    expect(markdown).toContain('# Doublecheck report')
    expect(markdown).toContain('Verdict: **objections**')
    expect(markdown).toContain('## Spec')
    expect(markdown).toContain('## Test evidence')
    expect(markdown).toContain('[major] scope drift')
    expect(markdown).toContain('## Verification')
    expect(markdown).toContain('## Delivery')
  })
})
