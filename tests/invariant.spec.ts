import { describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { Session } from '@deepseek-ai/dsh-session'
import * as companion from '../src/invariant.ts'
import { installInvariant, PACKAGE_NAME } from '../src/invariant.ts'
import type { TestRunDetection } from '../src/domain/evidence.ts'
import { compileDetection } from '../src/domain/evidence.ts'
import {
  evaluateConsistency,
  evaluateRequirements,
  evaluateReview,
  evaluateTests,
  foldRequirementsEvidence,
  foldTestEvidence,
  DEFAULT_GATE_QUESTIONS,
  type GateState,
} from '../src/domain/gate.ts'
import {
  fakeAgent,
  fakeSession,
  mutationCall,
  shellCall,
  shellResult,
  specToolCall,
  toolResult,
  userTask,
} from './helpers.ts'

function detection(): TestRunDetection {
  return compileDetection({
    testToolNames: ['bash', 'pwsh'],
    testCommandPatterns: ['(?:^|[;&|]\\s*)(?:(?:pnpm|npm|npx|yarn|bun)(?:\\s+run)?\\s+(?:test|vitest|jest|mocha)(?:\\s|$))'],
    guardTools: ['edit', 'write'],
    testFilePatterns: ['(^|[\\\\/])(tests?|__tests__|specs?)([\\\\/]|$)', '\\.(test|spec)\\.[A-Za-z0-9]+$'],
  })
}

/** Install the invariant body on a bare context with a recording fail. */
function install(facts: companion.InvariantFacts): { ctx: Context; fail: ReturnType<typeof vi.fn>; session: Session } {
  const ctx = new Context()
  const fail = vi.fn(() => undefined as never)
  installInvariant(facts)(ctx, fail as unknown as companion.InvariantFailure)
  return { ctx, fail, session: fakeSession([]) }
}

/** A synthetic session log that folds to green: spec → red → edit → green (no review). */
function greenLog(): ReturnType<typeof fakeSession> {
  return fakeSession([
    userTask('fix the bug in parser.ts'),
    specToolCall({ goal: 'ship parser fix', scope: 'parser', acceptanceCriteria: 'tests pass', failureModes: 'none', priorities: 'correctness', nonGoals: 'ui' }, 'spec-1'),
    toolResult('spec-1'),
    shellCall('bash', 'pnpm test', 't-1'),
    shellResult('t-1', '[exit code: 1]'),
    mutationCall('edit', 'src/app.ts', 'e-1'),
    shellCall('bash', 'pnpm test', 't-2'),
    shellResult('t-2', '4 passed'),
  ])
}

describe('standalone invariant companion', () => {
  it('registers through the host registry and disposes with the fiber', async () => {
    const ctx = new Context()
    const unregister = vi.fn()
    const register = vi.fn<(packageName: string, installer: unknown) => () => void>(() => unregister)
    const removeService = ctx.provide('invariants', { register })

    const fiber = await ctx.plugin(companion)
    expect(register).toHaveBeenCalledTimes(1)
    expect(register.mock.calls[0]?.[0]).toBe(PACKAGE_NAME)

    await fiber.dispose()
    expect(unregister).toHaveBeenCalledTimes(1)
    removeService()
  })
})

describe('installInvariant checks', () => {
  it('rejects a spec announcement with an empty field', () => {
    const { ctx, fail, session } = install({ detection })
    ctx.emit('doublecheck/spec', {
      session,
      spec: { goal: ' ', scope: 's', acceptanceCriteria: 'a', failureModes: 'f', priorities: 'p', nonGoals: 'n' },
      path: null,
      written: false,
    })
    expect(fail).toHaveBeenCalledWith(expect.stringContaining('empty "goal"'))
  })

  it('accepts a complete spec announcement', () => {
    const { ctx, fail, session } = install({ detection })
    ctx.emit('doublecheck/spec', {
      session,
      spec: { goal: 'g', scope: 's', acceptanceCriteria: 'a', failureModes: 'f', priorities: 'p', nonGoals: 'n' },
      path: null,
      written: false,
    })
    expect(fail).not.toHaveBeenCalled()
  })

  it('rejects a report verdict that contradicts the log re-derivation', () => {
    const { ctx, fail } = install({ detection })
    const session = greenLog()
    ctx.emit('doublecheck/report', { session, verdict: 'red', verification: null, path: null, written: false })
    expect(fail).toHaveBeenCalledWith(expect.stringContaining('re-derives "green"'))
  })

  it('accepts a report verdict equal to the log re-derivation', () => {
    const { ctx, fail } = install({ detection })
    const session = greenLog()
    ctx.emit('doublecheck/report', { session, verdict: 'green', verification: null, path: null, written: false })
    expect(fail).not.toHaveBeenCalled()
  })

  it('rejects a clean verification that is not reported as proven/unverified', () => {
    const { ctx, fail, session } = install({ detection })
    ctx.emit('doublecheck/report', {
      session,
      verdict: 'green',
      verification: { checks: [{ dimension: 'goal', verdict: 'pass', evidence: 'e', note: '' }], complete: false },
      path: null,
      written: false,
    })
    expect(fail).toHaveBeenCalledWith(expect.stringContaining('clean verification checks'))
  })

  it('rejects a failing verification that is not reported as challenged', () => {
    const { ctx, fail, session } = install({ detection })
    ctx.emit('doublecheck/report', {
      session,
      verdict: 'proven',
      verification: { checks: [{ dimension: 'goal', verdict: 'fail', evidence: 'e', note: '' }], complete: true },
      path: null,
      written: false,
    })
    expect(fail).toHaveBeenCalledWith(expect.stringContaining('failing verification check'))
  })

  it('rejects review findings with invalid severity or empty fields', () => {
    const { ctx, fail, session } = install({ detection })
    ctx.emit('doublecheck/review', {
      session,
      agent: fakeAgent(session),
      verdict: 'findings',
      findings: [{ severity: 'fatal' as never, title: 't', detail: 'd' }],
      text: 'review',
    })
    expect(fail).toHaveBeenCalledWith(expect.stringContaining('invalid severity'))
  })

  it('accepts well-formed review records', () => {
    const { ctx, fail, session } = install({ detection })
    ctx.emit('doublecheck/review', {
      session,
      agent: fakeAgent(session),
      verdict: 'clean',
      findings: [],
      text: 'clean',
    })
    expect(fail).not.toHaveBeenCalled()
  })

  // ── v0.7 gate announcement ──────────────────────────────────────────────

  function gateState(): GateState {
    const requirements = evaluateRequirements(
      foldRequirementsEvidence([], 'ask_user_question'),
      { checklist: DEFAULT_GATE_QUESTIONS, minConfirmed: 6 },
    )
    const tests = evaluateTests(foldTestEvidence([], detection(), /x/), { requirePassingRun: true, allowFailingRuns: 0, requireCoverage: false, minCoveragePct: 80 })
    const consistency = evaluateConsistency([], '')
    const review = evaluateReview(null, [], '', 'local').result
    return {
      verdict: 'rework',
      phases: { requirements, tests, consistency, review },
      reviewEngine: 'local',
      at: '2026-08-14T00:00:00.000Z',
    }
  }

  it('rejects a gate verdict that contradicts its own phases', () => {
    const { ctx, fail, session } = install({ detection })
    const state = gateState()
    state.verdict = 'deliverable' // its phases derive rework
    ctx.emit('doublecheck/gate', { session, state })
    expect(fail).toHaveBeenCalledWith(expect.stringContaining('derive "rework"'))
  })

  it('rejects a gate state with a missing phase', () => {
    const { ctx, fail, session } = install({ detection })
    const state = gateState()
    delete state.phases.review
    ctx.emit('doublecheck/gate', { session, state })
    expect(fail).toHaveBeenCalledWith(expect.stringContaining('no "review" phase'))
  })

  it('accepts a consistent gate state', () => {
    const { ctx, fail, session } = install({ detection })
    ctx.emit('doublecheck/gate', { session, state: gateState() })
    expect(fail).not.toHaveBeenCalled()
  })
})
