import { describe, expect, it } from 'vitest'
import { Context, Service } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import { SessionId } from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import { defineTool, ToolRuntime } from '@deepseek-ai/dsh-tools'
import * as guardModule from '../src/guard/index.ts'
import { compileDetection, type TestRunDetection } from '../src/domain/evidence.ts'
import {
  countRedChecks,
  DEFAULT_COVERAGE_PATTERN,
  DEFAULT_GATE_QUESTIONS,
  deriveGateVerdict,
  evaluateConsistency,
  evaluateRequirements,
  evaluateReview,
  evaluateTests,
  foldAutoReviewEvidence,
  foldRequirementsEvidence,
  foldTestEvidence,
  redactSecrets,
  renderGateReportMarkdown,
  type GateState,
} from '../src/domain/gate.ts'
import type { ReviewFinding } from '../src/domain/vocabulary.ts'
import {
  codeDispatchRun,
  fakeAgent,
  fakeSession,
  mutationCall,
  sessionEvent,
  shellCall,
  shellResult,
  specToolCall,
  toolCall,
  toolResult,
  userTask,
} from './helpers.ts'

const signal = new AbortController().signal

function detection(): TestRunDetection {
  return compileDetection({
    testToolNames: ['bash', 'pwsh'],
    testCommandPatterns: ['(?:^|[;&|]\\s*)(?:(?:pnpm|npm|npx|yarn|bun)(?:\\s+run)?\\s+(?:test|vitest|jest|mocha)(?:\\s|$))'],
    guardTools: ['edit', 'write'],
    testFilePatterns: ['(^|[\\\\/])(tests?|__tests__|specs?)([\\\\/]|$)', '\\.(test|spec)\\.[A-Za-z0-9]+$'],
  })
}

function coverageRegex(): RegExp {
  return new RegExp(DEFAULT_COVERAGE_PATTERN, 'i')
}

/** A committed-spec session: spec pair, red run, edit, green run with coverage. */
function deliveredSession(): SessionEvent[] {
  return [
    userTask('fix the bug in parser.ts'),
    specToolCall({ goal: 'ship parser fix', scope: 'parser only', acceptanceCriteria: 'tests pass', failureModes: 'invalid input', priorities: 'correctness first', nonGoals: 'no rewrite' }, 'spec-1'),
    toolResult('spec-1'),
    shellCall('bash', 'pnpm test', 't-1'),
    shellResult('t-1', '[exit code: 1]'),
    mutationCall('edit', 'src/app.ts', 'e-1'),
    shellCall('bash', 'pnpm test', 't-2'),
    shellResult('t-2', '4 passed\ncoverage: 87.5%'),
  ] as unknown as SessionEvent[]
}

describe('gate domain folds', () => {
  it('folds the requirements evidence: spec pairing and interrogation counts', () => {
    const events = [
      userTask('task'),
      toolCall('ask_user_question', 'q-1'),
      specToolCall({ goal: 'g', scope: 's', acceptanceCriteria: 'a', failureModes: 'f', priorities: 'p', nonGoals: 'n' }, 'spec-1'),
      toolResult('spec-1'),
    ] as unknown as SessionEvent[]
    const evidence = foldRequirementsEvidence(events, 'ask_user_question')
    expect(evidence.interrogations).toBe(1)
    expect(evidence.spec?.goal).toBe('g')
  })

  it('ignores a failed spec commit and malformed spec arguments', () => {
    const events = [
      toolCall('doublecheck_spec', 'spec-1'),
      { ...toolResult('spec-1'), data: { ...toolResult('spec-1').data, error: { name: 'ToolCallError', code: 'boom' } } },
    ] as unknown as SessionEvent[]
    expect(foldRequirementsEvidence(events, 'ask_user_question').spec).toBeNull()
  })

  it('evaluates the requirements phase: committed dimensions pass', () => {
    const events = [
      specToolCall({ goal: 'g', scope: 's', acceptanceCriteria: 'a', failureModes: 'f', priorities: 'p', nonGoals: 'n' }, 'spec-1'),
      toolResult('spec-1'),
    ] as unknown as SessionEvent[]
    const result = evaluateRequirements(
      foldRequirementsEvidence(events, 'ask_user_question'),
      { checklist: DEFAULT_GATE_QUESTIONS, minConfirmed: 6 },
    )
    expect(result.status).toBe('pass')
    expect(result.checks.filter(check => check.status === 'pass')).toHaveLength(6)
  })

  it('evaluates the requirements phase: a missing spec fails every required question', () => {
    const result = evaluateRequirements(
      foldRequirementsEvidence([], 'ask_user_question'),
      { checklist: DEFAULT_GATE_QUESTIONS, minConfirmed: 6 },
    )
    expect(result.status).toBe('fail')
    expect(result.checks.filter(check => check.status === 'fail').length).toBeGreaterThanOrEqual(6)
    expect(result.checks[0]?.suggestion).toContain('grill-requirements')
  })

  it('softens a failed optional question to a warning and warns on free-form questions', () => {
    const events = [
      specToolCall({ goal: 'g', scope: 's', acceptanceCriteria: 'a', failureModes: 'f', priorities: 'p', nonGoals: 'n' }, 'spec-1'),
      toolResult('spec-1'),
    ] as unknown as SessionEvent[]
    const checklist = [
      ...DEFAULT_GATE_QUESTIONS,
      { id: 'extra', question: 'Anything else?', specDimension: null, required: false },
    ]
    const result = evaluateRequirements(
      foldRequirementsEvidence(events, 'ask_user_question'),
      { checklist, minConfirmed: 6 },
    )
    const extra = result.checks.find(check => check.id === 'extra')
    expect(extra?.status).toBe('warn')
    expect(result.status).toBe('warn')
  })

  it('folds test evidence: counts, the red window, and the best coverage', () => {
    const events = [
      shellCall('bash', 'pnpm test', 't-1'),
      shellResult('t-1', '[exit code: 1]'),
      shellCall('bash', 'pnpm test', 't-2'),
      shellResult('t-2', '4 passed\ncoverage: 60.0%'),
      shellCall('bash', 'pnpm test', 't-3'),
      shellResult('t-3', '4 passed\ncoverage: 92%'),
      codeDispatchRun('pnpm test', '[exit code: 1]'),
    ] as unknown as SessionEvent[]
    const evidence = foldTestEvidence(events, detection(), coverageRegex())
    expect(evidence.failed).toBe(2)
    expect(evidence.passed).toBe(2)
    expect(evidence.lastOutcome).toBe('fail')
    expect(evidence.failingAfterGreen).toBe(1)
    expect(evidence.coveragePct).toBe(92)
  })

  it('evaluates the tests phase: passing run, red window, and coverage threshold', () => {
    const delivered = foldTestEvidence(deliveredSession(), detection(), coverageRegex())
    const passing = evaluateTests(delivered, { requirePassingRun: true, allowFailingRuns: 0, requireCoverage: true, minCoveragePct: 80 })
    expect(passing.status).toBe('pass')

    const below = evaluateTests(delivered, { requirePassingRun: true, allowFailingRuns: 0, requireCoverage: true, minCoveragePct: 90 })
    expect(below.checks.find(check => check.id === 'coverage')?.status).toBe('fail')
    expect(below.status).toBe('fail')

    const none = evaluateTests(foldTestEvidence([], detection(), coverageRegex()), { requirePassingRun: true, allowFailingRuns: 0, requireCoverage: false, minCoveragePct: 80 })
    expect(none.checks.find(check => check.id === 'passing-run')?.status).toBe('fail')
  })

  it('evaluates the consistency phase from structured findings', () => {
    const blocker: ReviewFinding = { severity: 'blocker', title: 'unmapped edit', detail: 'src/app.ts serves no spec dimension' }
    expect(evaluateConsistency([blocker], '').status).toBe('fail')
    expect(evaluateConsistency([], '').status).toBe('pass')
    expect(evaluateConsistency([{ severity: 'info', title: 't', detail: 'd' }], '').status).toBe('warn')
    const skipped = evaluateConsistency(null, 'the subagents seam is not mounted')
    expect(skipped.status).toBe('skip')
    expect(skipped.checks[0]?.summary).toContain('subagents seam')
  })

  it('folds the dsh-auto-review engine evidence structurally', () => {
    const events = [
      sessionEvent('autoReview/verdict', { decision: 'allow', riskLevel: 'low' }),
      sessionEvent('autoReview/verdict', { decision: 'deny', riskLevel: 'high' }),
      sessionEvent('autoReview/rejection', {}),
    ]
    const engine = foldAutoReviewEvidence(events as unknown as SessionEvent[])
    expect(engine).toEqual({ engine: 'dsh-auto-review', approvals: 1, rejections: 2, latestRisk: 'high' })
    expect(foldAutoReviewEvidence([])).toBeNull()
  })

  it('evaluates the review phase: engine verdicts, local degrade, and rejections as red', () => {
    const approved = evaluateReview({ engine: 'dsh-auto-review', approvals: 3, rejections: 0, latestRisk: 'low' }, null, '', 'auto')
    expect(approved.engine).toBe('dsh-auto-review')
    expect(approved.result.status).toBe('pass')

    const rejected = evaluateReview({ engine: 'dsh-auto-review', approvals: 1, rejections: 1, latestRisk: 'high' }, null, '', 'auto')
    expect(rejected.result.status).toBe('fail')

    const degraded = evaluateReview(null, [], '', 'auto', 'dsh-auto-review is not installed')
    expect(degraded.engine).toBe('local')
    expect(degraded.result.status).toBe('warn')
    expect(degraded.result.checks.find(check => check.id === 'engine-degraded')?.summary).toBe('dsh-auto-review is not installed')

    const local = evaluateReview(null, [{ severity: 'blocker', title: 'broken claim', detail: 'no evidence' }], '', 'local')
    expect(local.engine).toBe('local')
    expect(local.result.status).toBe('fail')
  })

  it('derives the binary verdict and counts red items', () => {
    const requirements = evaluateRequirements(
      foldRequirementsEvidence([], 'ask_user_question'),
      { checklist: DEFAULT_GATE_QUESTIONS, minConfirmed: 6 },
    )
    const tests = evaluateTests(foldTestEvidence([], detection(), coverageRegex()), { requirePassingRun: true, allowFailingRuns: 0, requireCoverage: false, minCoveragePct: 80 })
    const consistency = evaluateConsistency([], '')
    const review = evaluateReview(null, [], '', 'local').result
    expect(deriveGateVerdict([requirements, tests, consistency, review])).toBe('rework')
    expect(countRedChecks([requirements, tests, consistency, review])).toBeGreaterThanOrEqual(7)
    expect(deriveGateVerdict([{ ...requirements, status: 'pass', checks: [] }, tests, consistency, review])).toBe('rework')
    expect(deriveGateVerdict([{ ...requirements, status: 'pass', checks: [] }, { ...tests, status: 'pass', checks: [] }, consistency, review])).toBe('deliverable')
  })

  it('redacts recognized secrets from model-produced texts', () => {
    const text = 'key AKIA1234567890ABCDEF and gh: gh_token_0123456789abcdef0123456789abcdef plus sk-abcdefghijklmnopqrstuvwx and password: hunter2 and 0123456789abcdef0123456789abcdef and -----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----'
    const redacted = redactSecrets(text)
    expect(redacted).not.toContain('AKIA1234567890ABCDEF')
    expect(redacted).not.toContain('hunter2')
    expect(redacted).not.toContain('PRIVATE KEY')
    expect(redacted).toContain('[redacted]')
  })

  it('renders the gate report markdown with verdict, red items, and the audit footer', () => {
    const requirements = evaluateRequirements(
      foldRequirementsEvidence([], 'ask_user_question'),
      { checklist: DEFAULT_GATE_QUESTIONS, minConfirmed: 6 },
    )
    const tests = evaluateTests(foldTestEvidence([], detection(), coverageRegex()), { requirePassingRun: true, allowFailingRuns: 0, requireCoverage: false, minCoveragePct: 80 })
    const consistency = evaluateConsistency([], '')
    const review = evaluateReview(null, [], '', 'local').result
    const state: GateState = {
      verdict: deriveGateVerdict([requirements, tests, consistency, review]),
      phases: { requirements, tests, consistency, review },
      reviewEngine: 'local',
      at: '2026-08-14T00:00:00.000Z',
    }
    const markdown = renderGateReportMarkdown(state, true)
    expect(markdown).toContain('# Delivery gate report')
    expect(markdown).toContain('**Verdict: rework required**')
    expect(markdown).toContain('## Red items')
    expect(markdown).toContain('Re-open the work in plan mode')
    expect(markdown).toContain('## Audit')
    expect(markdown).toContain('review engine: local')
  })
})

// ── guard integration ──────────────────────────────────────────────────────

function fullConfig(overrides: Partial<guardModule.Config> = {}): guardModule.Config {
  return {
    intensity: 'remind',
    modules: { grill: true, tdd: false, adversary: false },
    adversaryModel: null,
    adversaryProvider: 'fork',
    adversaryMaxFindings: 5,
    adversaryTools: ['read', 'glob', 'grep'],
    adversaryTimeoutMs: 120000,
    guardTools: ['edit', 'write'],
    vagueTaskMaxChars: 200,
    remindOnce: true,
    language: 'en',
    enableByDefault: true,
    testToolNames: ['bash', 'pwsh'],
    testCommandPatterns: ['(?:^|[;&|]\\s*)(?:(?:pnpm|npm|npx|yarn|bun)(?:\\s+run)?\\s+(?:test|vitest|jest|mocha)(?:\\s|$))'],
    testFilePatterns: ['(^|[\\\\/])(tests?|__tests__|specs?)([\\\\/]|$)', '\\.(test|spec)\\.[A-Za-z0-9]+$'],
    ...overrides,
  }
}

interface RegisteredCommand {
  name: string
  description: string
  handler: (invocation: { agent: Agent; rawInput: string; signal: AbortSignal }) => unknown
}

interface GateSetupOptions {
  /** Findings per reviewer start, consumed in start order. */
  reviews?: ReviewFinding[][]
  /** Extra command descriptors the fake commands service lists. */
  extraCommands?: string[]
  /** Fail the reviewer starts (seam missing). */
  noSubagents?: boolean
}

async function setup(config: guardModule.Config = fullConfig(), options: GateSetupOptions = {}) {
  const ctx = new Context()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  const editTool = defineTool({
    name: 'edit',
    description: 'edit a file',
    parameters: { file_path: { type: 'string', required: true } },
    output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
    async execute() { return 'edited' },
  })
  ctx.tools.register(editTool)
  const registered: RegisteredCommand[] = []
  class FakeCommands extends Service {
    constructor(childCtx: Context) {
      super(childCtx, 'commands')
    }

    register(entry: RegisteredCommand) {
      registered.push(entry)
    }

    list() {
      return [...registered.map(entry => ({ name: entry.name })), ...(options.extraCommands ?? []).map(name => ({ name }))]
    }
  }
  await ctx.plugin(FakeCommands)
  const starts: { name: string; request: unknown }[] = []
  if (!options.noSubagents) {
    const queue = [...(options.reviews ?? [])]
    class FakeSubagents extends Service {
      constructor(childCtx: Context) {
        super(childCtx, 'subagents')
      }

      async start(name: string, request: unknown) {
        starts.push({ name, request })
        const findings = queue.shift() ?? []
        return {
          id: SessionId(`child-${starts.length}`),
          localAgent: undefined,
          result: Promise.resolve({
            output: [{ type: 'text', text: 'review' }],
            structured: { findings },
            stopReason: 'completed',
          }),
          async dispose() {},
        }
      }
    }
    await ctx.plugin(FakeSubagents)
  }
  await ctx.plugin(guardModule, config)
  return { ctx, registered, starts }
}

const gateCommand = (registered: RegisteredCommand[]): RegisteredCommand => {
  const entry = registered.find(command => command.name === 'gate')
  if (entry === undefined) throw new Error('gate command not registered')
  return entry
}

describe('/gate command', () => {
  it('registers the gate command with a status|run|config hint', async () => {
    const { registered } = await setup()
    const gate = gateCommand(registered)
    expect(gate.description).toContain('quality gate')
  })

  it('status renders the live deterministic phases and the pending reviewer phases', async () => {
    const { registered } = await setup()
    const handler = gateCommand(registered).handler
    const session = fakeSession(deliveredSession())
    const result = handler({ agent: fakeAgent(session), rawInput: 'status', signal }) as { kind: string; text: string }
    expect(result.kind).toBe('success')
    expect(result.text).toContain('Delivery gate panel')
    expect(result.text).toContain('## Live checklist')
    expect(result.text).toContain('Requirements interrogation — PASS')
    expect(result.text).toContain('Test evidence — PASS')
    expect(result.text).toContain('Latest gate run — none on record')
    expect(result.text).toContain('/gate run` settles the verdict')
    expect(result.text).toContain('plan mode: unknown')
  })

  it('status shows the latest durable gate run when one is on record', async () => {
    const { registered } = await setup()
    const handler = gateCommand(registered).handler
    const requirements = evaluateRequirements(
      foldRequirementsEvidence([], 'ask_user_question'),
      { checklist: DEFAULT_GATE_QUESTIONS, minConfirmed: 6 },
    )
    const tests = evaluateTests(foldTestEvidence([], detection(), coverageRegex()), { requirePassingRun: true, allowFailingRuns: 0, requireCoverage: false, minCoveragePct: 80 })
    const consistency = evaluateConsistency([], '')
    const review = evaluateReview({ engine: 'dsh-auto-review', approvals: 2, rejections: 0, latestRisk: 'low' }, null, '', 'auto').result
    const state: GateState = {
      verdict: deriveGateVerdict([requirements, tests, consistency, review]),
      phases: { requirements, tests, consistency, review },
      reviewEngine: 'dsh-auto-review',
      at: '2026-08-14T00:00:00.000Z',
    }
    const session = fakeSession([sessionEvent('doublecheck/gate', state) as SessionEvent])
    const result = handler({ agent: fakeAgent(session), rawInput: 'status', signal }) as { kind: string; text: string }
    expect(result.text).toContain('Latest gate run — 2026-08-14T00:00:00.000Z')
    expect(result.text).toContain('Review conclusion — PASS')
    expect(result.text).toContain('engine: dsh-auto-review')
  })

  it('run settles the full gate: deterministic phases, local reviewers, and the durable record', async () => {
    const { registered } = await setup(fullConfig(), { reviews: [[], []] })
    const handler = gateCommand(registered).handler
    const injections: unknown[] = []
    const session = fakeSession(deliveredSession())
    const agent = fakeAgent(session, injections)
    const result = (await handler({ agent, rawInput: 'run', signal })) as { kind: string; text: string }
    expect(result.kind).toBe('success')
    expect(result.text).toContain('# Delivery gate report')
    expect(result.text).toContain('**Verdict: deliverable**')
    expect(result.text).toContain('Implementation consistency — PASS')
    expect(result.text).toContain('Review conclusion — WARN')
    expect(result.text).toContain('dsh-auto-review is not installed')
    // The gate record is not durable on rc.6 hosts (no ignorable stamp).
    expect(session.events.filter(event => event.type === 'doublecheck/gate')).toHaveLength(0)
  })

  it('run folds the engine verdict records when dsh-auto-review judged this session', async () => {
    const { registered } = await setup(fullConfig(), { reviews: [[]], extraCommands: ['auto-review'] })
    const handler = gateCommand(registered).handler
    const session = fakeSession([
      ...deliveredSession(),
      sessionEvent('autoReview/verdict', { decision: 'allow', riskLevel: 'low' }),
    ] as unknown as SessionEvent[])
    const result = (await handler({ agent: fakeAgent(session), rawInput: 'run', signal })) as { kind: string; text: string }
    expect(result.text).toContain('Review conclusion — PASS')
    expect(result.text).toContain('1 call(s) approved by dsh-auto-review')
    expect(result.text).toContain('review engine: dsh-auto-review')
  })

  it('run reports "installed but has no verdict records" when the engine only has state events', async () => {
    const { registered } = await setup(fullConfig(), { reviews: [[]] })
    const handler = gateCommand(registered).handler
    const session = fakeSession([
      ...deliveredSession(),
      sessionEvent('autoReview/state', { enabled: true }),
    ] as unknown as SessionEvent[])
    const result = (await handler({ agent: fakeAgent(session), rawInput: 'run', signal })) as { kind: string; text: string }
    expect(result.text).toContain('dsh-auto-review is installed but has no verdict records in this session')
    expect(result.text).toContain('review engine: local')
  })

  it('run degrades honestly when the reviewer seam is missing', async () => {
    const { registered } = await setup(fullConfig(), { noSubagents: true })
    const handler = gateCommand(registered).handler
    const session = fakeSession(deliveredSession())
    const result = (await handler({ agent: fakeAgent(session), rawInput: 'run', signal })) as { kind: string; text: string }
    expect(result.kind).toBe('success')
    expect(result.text).toContain('Implementation consistency — SKIP')
    expect(result.text).toContain('the subagents seam is not mounted')
  })

  it('config renders the pluggable checklist and thresholds', async () => {
    const { registered } = await setup()
    const handler = gateCommand(registered).handler
    const result = handler({ agent: fakeAgent(fakeSession([])), rawInput: 'config', signal }) as { kind: string; text: string }
    expect(result.text).toContain('# Delivery gate configuration')
    expect(result.text).toContain('| 1 | goal | What outcome must the delivery produce? | goal | yes |')
    expect(result.text).toContain('minimum coverage: 80%')
    expect(result.text).toContain('engine: auto')
  })

  it('rejects unknown arguments and answers in zh', async () => {
    const { registered } = await setup(fullConfig({ language: 'zh' }))
    const handler = gateCommand(registered).handler
    const unknown = handler({ agent: fakeAgent(fakeSession([])), rawInput: 'maybe', signal }) as { kind: string; text: string }
    expect(unknown.kind).toBe('error')
    expect(unknown.text).toContain('未知的 /gate 参数')
  })

  it('rejects invalid gate configuration at load, fail-loud', async () => {
    const baseGate = (): guardModule.Config['gate'] => guardModule.Config(fullConfig()).gate
    const cases: guardModule.Config[] = [
      fullConfig({ gate: { ...baseGate(), requirements: { ...baseGate().requirements, checklist: [] } } }),
      fullConfig({ gate: { ...baseGate(), requirements: { ...baseGate().requirements, checklist: [{ id: 'a', question: 'q', specDimension: null, required: true }, { id: 'a', question: 'q2', specDimension: null, required: true }] } } }),
      fullConfig({ gate: { ...baseGate(), requirements: { ...baseGate().requirements, minConfirmed: 7 } } }),
      fullConfig({ gate: { ...baseGate(), tests: { ...baseGate().tests, coveragePattern: '(unclosed' } } }),
      fullConfig({ gate: { ...baseGate(), consistency: { ...baseGate().consistency, tools: [] } } }),
    ]
    for (const config of cases) {
      const ctx = new Context()
      await ctx.plugin(SystemPrompt)
      await ctx.plugin(ToolRuntime)
      class FakeCommands extends Service {
        constructor(childCtx: Context) {
          super(childCtx, 'commands')
        }

        register() {}
      }
      await ctx.plugin(FakeCommands)
      await expect(ctx.plugin(guardModule, config)).rejects.toThrow(/dsh-doublecheck/)
    }
  })
})

describe('gate turn-boundary red notice', () => {
  const reworkState = (): GateState => {
    const requirements = evaluateRequirements(
      foldRequirementsEvidence([], 'ask_user_question'),
      { checklist: DEFAULT_GATE_QUESTIONS, minConfirmed: 6 },
    )
    const tests = evaluateTests(foldTestEvidence([], detection(), coverageRegex()), { requirePassingRun: true, allowFailingRuns: 0, requireCoverage: false, minCoveragePct: 80 })
    const consistency = evaluateConsistency([], '')
    const review = evaluateReview(null, [], '', 'local').result
    return {
      verdict: deriveGateVerdict([requirements, tests, consistency, review]),
      phases: { requirements, tests, consistency, review },
      reviewEngine: 'local',
      at: '2026-08-14T00:00:00.000Z',
    }
  }

  it('injects the short role-statement notice once when the latest gate run is rework', async () => {
    const { ctx } = await setup()
    const injections: unknown[] = []
    const session = fakeSession([sessionEvent('doublecheck/gate', reworkState()) as SessionEvent])
    const agent = fakeAgent(session, injections)
    const announcements: unknown[] = []
    ctx.on('doublecheck/reminder', payload => { announcements.push(payload) })
    await ctx.serial('agent/turn-stopping', { agent, turn: 1, signal })

    expect(injections).toHaveLength(1)
    const source = (injections[0] as { source: { kind: string; verdict: string } }).source
    expect(source.kind).toBe('doublecheck-gate')
    expect(source.verdict).toBe('rework')
    expect(announcements[0]).toMatchObject({ gate: 'gate', verdict: 'gate-red' })
  })

  it('stays silent after the first red notice (durable once-semantics)', async () => {
    const { ctx } = await setup()
    const injections: unknown[] = []
    const session = fakeSession([sessionEvent('doublecheck/gate', reworkState()) as SessionEvent])
    const agent = fakeAgent(session, injections)
    await ctx.serial('agent/turn-stopping', { agent, turn: 1, signal })
    await ctx.serial('agent/turn-stopping', { agent, turn: 2, signal })
    expect(injections).toHaveLength(1)
  })

  it('stays silent for a deliverable verdict and for a disabled session', async () => {
    const { ctx } = await setup()
    const injections: unknown[] = []
    const deliverable = { ...reworkState(), verdict: 'deliverable' as const }
    const session = fakeSession([sessionEvent('doublecheck/gate', deliverable) as SessionEvent])
    const agent = fakeAgent(session, injections)
    await ctx.serial('agent/turn-stopping', { agent, turn: 1, signal })
    expect(injections).toHaveLength(0)

    const off = fakeSession([
      sessionEvent('doublecheck/state', { enabled: false }),
      sessionEvent('doublecheck/gate', reworkState()) as SessionEvent,
    ])
    const offInjections: unknown[] = []
    await ctx.serial('agent/turn-stopping', { agent: fakeAgent(off, offInjections), turn: 1, signal })
    expect(offInjections).toHaveLength(0)
  })
})
