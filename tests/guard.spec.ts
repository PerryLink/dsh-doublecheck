import { describe, expect, it } from 'vitest'
import { Context, Service } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { CallId } from '@deepseek-ai/dsh-llm'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import { SessionId } from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import { defineTool, ToolRuntime } from '@deepseek-ai/dsh-tools'
import type { PreToolDecision, ToolExecution } from '@deepseek-ai/dsh-tools'
import * as guardModule from '../src/guard/index.ts'
import { SPEC_TOOL_NAME } from '../src/domain/stages.ts'
import type { GuardIntensity, ReviewFinding } from '../src/events.ts'
import { fakeAgent, fakeSession, mutationCall, shellCall, shellResult, toolCall, toolResult, userTask } from './helpers.ts'

const signal = new AbortController().signal

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

interface ReviewStub {
  findings?: ReviewFinding[]
  stopReason?: string
}

interface SetupOptions {
  /** Skip mounting the fake subagents seam (for fail-loud tests). */
  noSubagents?: boolean
  /** The settled outcome the fake critic returns. */
  review?: ReviewStub
  /** Make the critic result reject only when the review's abort signal fires. */
  reviewSignalAware?: boolean
}

async function setup(config: guardModule.Config = fullConfig(), options: SetupOptions = {}) {
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
  const registered: { name: string; description: string; handler: (invocation: unknown) => unknown }[] = []
  class FakeCommands extends Service {
    constructor(childCtx: Context) {
      super(childCtx, 'commands')
    }

    register(entry: { name: string; description: string; input?: unknown; handler: (invocation: unknown) => unknown }) {
      registered.push(entry)
    }
  }
  await ctx.plugin(FakeCommands)
  const starts: { name: string; request: unknown }[] = []
  if (!options.noSubagents) {
    class FakeSubagents extends Service {
      constructor(childCtx: Context) {
        super(childCtx, 'subagents')
      }

      async start(name: string, request: unknown) {
        starts.push({ name, request })
        const result = options.reviewSignalAware === true
          ? new Promise<never>((_, reject) => {
            const signal = (request as { signal?: AbortSignal }).signal
            if (signal === undefined || signal.aborted) reject(new Error('aborted'))
            else signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
          })
          : Promise.resolve({
            output: [{ type: 'text', text: 'critique text' }],
            structured: { findings: options.review?.findings ?? [] },
            stopReason: options.review?.stopReason ?? 'completed',
          })
        return {
          id: SessionId('child-1'),
          localAgent: undefined,
          result,
          async dispose() {},
        }
      }
    }
    await ctx.plugin(FakeSubagents)
  }
  await ctx.plugin(guardModule, config)
  return { ctx, starts, registered }
}

/** A session log that has completed the full discipline loop to green. */
function greenDeliverySession(): unknown[] {
  return [
    userTask('fix the bug in parser.ts'),
    toolCall(SPEC_TOOL_NAME, 'spec-1'),
    toolResult('spec-1'),
    shellCall('bash', 'pnpm test', 't-1'),
    shellResult('t-1', '[exit code: 1]'),
    mutationCall('edit', 'src/app.ts', 'e-1'),
    shellCall('bash', 'pnpm test', 't-2'),
    shellResult('t-2', '4 passed'),
  ]
}

/** Execute an `edit` call for a session whose log is `events`. */
async function runEdit(ctx: Context, agent: Agent, callId: string, path = 'src/app.ts') {
  return ctx.tools.execute({
    signal,
    callId: CallId(callId),
    name: 'edit',
    arguments: { file_path: path },
    agent,
  })
}

/** The guard's pre-execute decision for one synthetic execution. */
function gateDecision(ctx: Context, exec: ToolExecution): Promise<PreToolDecision> {
  return ctx.waterfall('tools/pre-execute', exec, () => Promise.resolve<PreToolDecision>({ kind: 'allow' }))
}

/** A vague-task session log: one direct user message, no spec. */
function vagueSession(): Session {
  return fakeSession([userTask('帮我做那个功能')])
}

/** A concrete-task session log: the grill gate passes it through. */
function concreteSession(): Session {
  return fakeSession([userTask('fix the bug in parser.ts')])
}

describe('doublecheck-guard', () => {
  it('validates its config schema: defaults and rejections', () => {
    // schemastery omits a null-defaulted key (adversaryModel) from the output
    // config; every other default is materialized.
    expect(guardModule.Config({})).toEqual({
      intensity: 'remind',
      modules: { grill: true, tdd: true, adversary: false },
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
      testCommandPatterns: [
        '(?:^|[;&|]\\s*)(?:(?:pnpm|npm|npx|yarn|bun)(?:\\s+run)?\\s+(?:test|vitest|jest|mocha)(?:\\s|$))',
        '(?:^|[;&|]\\s*)(?:(?:pytest|go\\s+test|cargo\\s+test|make\\s+test|ctest)(?:\\s|$))',
        '(?:^|[;&|]\\s*)(?:node\\s+--test(?:\\s|$))',
      ],
      testFilePatterns: ['(^|[\\\\/])(tests?|__tests__|specs?)([\\\\/]|$)', '\\.(test|spec)\\.[A-Za-z0-9]+$'],
    })
    expect(() => guardModule.Config({ intensity: 'loud' })).toThrow()
  })

  it('rejects invalid configuration at load, fail-loud', async () => {
    const cases: guardModule.Config[] = [
      fullConfig({ guardTools: [] }),
      fullConfig({ guardTools: ['edit', 'edit'] }),
      fullConfig({ vagueTaskMaxChars: 0 }),
      fullConfig({ modules: { grill: true, tdd: true, adversary: false }, testCommandPatterns: ['(unclosed'] }),
      fullConfig({ modules: { grill: true, tdd: false, adversary: true }, testCommandPatterns: ['(unclosed'] }),
      // The detection knobs always compile, so even a grill-only config fails
      // loud on a bad pattern (the /doublecheck report reads the same table).
      fullConfig({ modules: { grill: true, tdd: false, adversary: false }, testCommandPatterns: ['(unclosed'] }),
      fullConfig({ modules: { grill: true, tdd: false, adversary: true }, adversaryMaxFindings: 0 }),
      fullConfig({ modules: { grill: true, tdd: false, adversary: true }, adversaryMaxFindings: 21 }),
      fullConfig({ modules: { grill: true, tdd: false, adversary: true }, adversaryTimeoutMs: 0 }),
      fullConfig({ modules: { grill: true, tdd: false, adversary: true }, adversaryTools: [] }),
      fullConfig({ modules: { grill: true, tdd: false, adversary: true }, adversaryTools: ['read', 'read'] }),
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

  it('reminds on a vague pre-spec edit and logs the reminder through the context channel', async () => {
    const { ctx } = await setup()
    const session = vagueSession()
    const announcements: unknown[] = []
    ctx.on('doublecheck/reminder', payload => { announcements.push(payload) })
    const result = await runEdit(ctx, fakeAgent(session), 'edit-1')
    expect(result.isError).toBe(false)
    const contexts = result.additionalContexts ?? []
    expect(contexts).toHaveLength(1)
    expect(contexts[0]?.content[0]).toMatchObject({ type: 'text' })
    expect((contexts[0]?.source as { kind: string; plugin: string }).kind).toBe('plugin')
    expect((contexts[0]?.source as { kind: string; plugin: string }).plugin).toBe('dsh-doublecheck')
    expect(announcements).toHaveLength(1)
    expect(announcements[0]).toMatchObject({ toolName: 'edit', intensity: 'remind', gate: 'grill', verdict: 'reminded' })
  })

  it('leaves a concrete task alone', async () => {
    const { ctx } = await setup()
    const session = fakeSession([userTask('fix the bug in parser.ts')])
    const result = await runEdit(ctx, fakeAgent(session), 'edit-2')
    expect(result.isError).toBe(false)
    expect(result.additionalContexts).toBeUndefined()
  })

  it('leaves a session with a committed spec alone', async () => {
    const { ctx } = await setup()
    const session = fakeSession([
      userTask('帮我做那个功能'),
      toolCall(SPEC_TOOL_NAME, 'spec-1'),
      toolResult('spec-1'),
    ])
    const result = await runEdit(ctx, fakeAgent(session), 'edit-3')
    expect(result.isError).toBe(false)
    expect(result.additionalContexts).toBeUndefined()
  })

  it('reopens the grill when a new vague task arrives after the spec commit', async () => {
    const { ctx } = await setup(fullConfig({ intensity: 'block' }))
    const session = fakeSession([
      userTask('帮我做那个功能'),
      toolCall(SPEC_TOOL_NAME, 'spec-1'),
      toolResult('spec-1'),
      userTask('顺便把登录也做了'),
    ])
    const result = await runEdit(ctx, fakeAgent(session), 'regrill-1')
    expect(result.isError).toBe(true)
    if (result.isError) {
      expect(result.error.message).toContain('requirements guard')
    }
  })

  it('leaves a concrete follow-up alone after the spec commit', async () => {
    const { ctx } = await setup(fullConfig({ intensity: 'block' }))
    const session = fakeSession([
      userTask('帮我做那个功能'),
      toolCall(SPEC_TOOL_NAME, 'spec-1'),
      toolResult('spec-1'),
      userTask('fix the bug in parser.ts'),
    ])
    const result = await runEdit(ctx, fakeAgent(session), 'regrill-2')
    expect(result.isError).toBe(false)
  })

  it('leaves non-guard tools alone even on a vague pre-spec session', async () => {
    const { ctx } = await setup()
    const session = vagueSession()
    const readTool = defineTool({
      name: 'read',
      description: 'read a file',
      parameters: {},
      output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
      async execute() { return 'content' },
    })
    ctx.tools.register(readTool)
    const result = await ctx.tools.execute({
      signal,
      callId: CallId('read-1'),
      name: 'read',
      arguments: {},
      agent: fakeAgent(session),
    })
    expect(result.isError).toBe(false)
    expect(result.additionalContexts).toBeUndefined()
  })

  it('leaves agent-less direct calls alone', async () => {
    const { ctx } = await setup()
    const result = await ctx.tools.execute({
      signal,
      callId: CallId('edit-4'),
      name: 'edit',
      arguments: { file_path: 'x.ts' },
    })
    expect(result.isError).toBe(false)
    expect(result.additionalContexts).toBeUndefined()
  })

  it('reminds at most once per session under remindOnce', async () => {
    const { ctx } = await setup()
    const session = vagueSession()
    const agent = fakeAgent(session)
    const first = await runEdit(ctx, agent, 'edit-5')
    const second = await runEdit(ctx, agent, 'edit-6')
    expect(first.additionalContexts).toHaveLength(1)
    expect(second.additionalContexts).toBeUndefined()
  })

  it('reminds again after the first reminder when remindOnce is off', async () => {
    const { ctx } = await setup(fullConfig({ remindOnce: false }))
    const session = vagueSession()
    const agent = fakeAgent(session)
    const first = await runEdit(ctx, agent, 'edit-7')
    const second = await runEdit(ctx, agent, 'edit-8')
    expect(first.additionalContexts).toHaveLength(1)
    expect(second.additionalContexts).toHaveLength(1)
  })

  it('denies the edit at the policy gate under intensity block', async () => {
    const { ctx } = await setup(fullConfig({ intensity: 'block' }))
    const session = vagueSession()
    const decision = await gateDecision(ctx, {
      name: 'edit',
      arguments: { file_path: 'x.ts' },
      agent: fakeAgent(session),
    } as unknown as ToolExecution)
    expect(decision).toEqual({ kind: 'deny', reason: expect.stringContaining('requirements guard') })
  })

  it('materializes the block as an error result through the registry', async () => {
    const { ctx } = await setup(fullConfig({ intensity: 'block' }))
    const session = vagueSession()
    const result = await runEdit(ctx, fakeAgent(session), 'edit-9')
    expect(result.isError).toBe(true)
    if (result.isError) {
      expect(result.error.message).toContain('requirements guard')
    }
  })

  it('holds the edit for approval under intensity warn, and denies when no approval channel exists', async () => {
    const { ctx } = await setup(fullConfig({ intensity: 'warn' }))
    const session = vagueSession()
    const decision = await gateDecision(ctx, {
      name: 'write',
      arguments: { file_path: 'x.ts' },
      agent: fakeAgent(session),
    } as unknown as ToolExecution)
    expect(decision).toEqual({ kind: 'ask', reason: expect.stringContaining('no doublecheck spec') })

    const result = await runEdit(ctx, fakeAgent(session), 'edit-10')
    expect(result.isError).toBe(true)
    if (result.isError) {
      expect(result.error.message).toContain('no doublecheck spec')
    }
  })

  it('stays silent when both gates are off', async () => {
    const { ctx } = await setup(fullConfig({ modules: { grill: false, tdd: false, adversary: false } }))
    const session = vagueSession()
    const result = await runEdit(ctx, fakeAgent(session), 'edit-11')
    expect(result.isError).toBe(false)
    expect(result.additionalContexts).toBeUndefined()
  })

  it('recomputes its snapshot when the session log grows', async () => {
    const { ctx } = await setup()
    const session = fakeSession([userTask('帮我做那个功能')])
    const agent = fakeAgent(session)
    const first = await runEdit(ctx, agent, 'edit-12')
    expect(first.additionalContexts).toHaveLength(1)

    ;(session.events as SessionEvent[]).push(toolCall(SPEC_TOOL_NAME, 'spec-2'), toolResult('spec-2'))
    const after = await runEdit(ctx, agent, 'edit-13')
    expect(after.additionalContexts).toBeUndefined()
  })

  it('pairs a spec call and its result folded in separate snapshot batches', async () => {
    const { ctx } = await setup(fullConfig({ remindOnce: false }))
    const session = fakeSession([userTask('帮我做那个功能')])
    const agent = fakeAgent(session)
    const first = await runEdit(ctx, agent, 'edit-15')
    expect(first.additionalContexts).toHaveLength(1)

    // The spec call folds now; its result only enters the log in a later batch.
    ;(session.events as SessionEvent[]).push(toolCall(SPEC_TOOL_NAME, 'spec-3'))
    const pending = await runEdit(ctx, agent, 'edit-16')
    expect(pending.additionalContexts).toHaveLength(1)

    ;(session.events as SessionEvent[]).push(toolResult('spec-3'))
    const committed = await runEdit(ctx, agent, 'edit-17')
    expect(committed.additionalContexts).toBeUndefined()
  })

  it('emits one reminder event per reaction with the intensity verdict', async () => {
    const { ctx } = await setup(fullConfig({ intensity: 'block' }))
    const session = vagueSession()
    const announcements: unknown[] = []
    ctx.on('doublecheck/reminder', payload => { announcements.push(payload) })
    await runEdit(ctx, fakeAgent(session), 'edit-14')
    expect(announcements).toHaveLength(1)
    expect(announcements[0]).toMatchObject({ toolName: 'edit', intensity: 'block' as GuardIntensity, gate: 'grill', verdict: 'denied' })
  })

  // ── v0.2 red/green gate ──────────────────────────────────────────────────

  const tdd = (overrides: Partial<guardModule.Config> = {}): guardModule.Config => fullConfig({
    modules: { grill: true, tdd: true, adversary: false },
    ...overrides,
  })

  it('denies implementation edits without a failing test on record when tdd is on', async () => {
    const { ctx } = await setup(tdd({ intensity: 'block' }))
    const session = concreteSession()
    const result = await runEdit(ctx, fakeAgent(session), 'tdd-1')
    expect(result.isError).toBe(true)
    if (result.isError) {
      expect(result.error.message).toContain('red/green evidence gate')
    }
  })

  it('lets test-file edits through the red gate', async () => {
    const { ctx } = await setup(tdd({ intensity: 'block' }))
    const session = concreteSession()
    const result = await runEdit(ctx, fakeAgent(session), 'tdd-2', 'tests/app.spec.ts')
    expect(result.isError).toBe(false)
    expect(result.additionalContexts).toBeUndefined()
  })

  it('lets implementation edits through once a failing test is on record', async () => {
    const { ctx } = await setup(tdd({ intensity: 'block' }))
    const session = fakeSession([
      userTask('fix the bug in parser.ts'),
      shellCall('bash', 'pnpm test', 't-1'),
      shellResult('t-1', '[exit code: 1]'),
    ])
    const result = await runEdit(ctx, fakeAgent(session), 'tdd-3')
    expect(result.isError).toBe(false)
    expect(result.additionalContexts).toBeUndefined()
  })

  it('requires the red step again after a passing run', async () => {
    const { ctx } = await setup(tdd({ intensity: 'block' }))
    const session = fakeSession([
      userTask('fix the bug in parser.ts'),
      shellCall('bash', 'pnpm test', 't-1'),
      shellResult('t-1', '[exit code: 1]'),
      mutationCall('edit', 'src/app.ts', 'e-1'),
      shellCall('bash', 'pnpm test', 't-2'),
      shellResult('t-2', '4 passed'),
    ])
    const result = await runEdit(ctx, fakeAgent(session), 'tdd-4')
    expect(result.isError).toBe(true)
  })

  it('reminds at remind intensity and announces the tdd gate', async () => {
    const { ctx } = await setup(tdd())
    const session = concreteSession()
    const announcements: unknown[] = []
    ctx.on('doublecheck/reminder', payload => { announcements.push(payload) })
    const result = await runEdit(ctx, fakeAgent(session), 'tdd-5')
    expect(result.isError).toBe(false)
    expect(result.additionalContexts).toHaveLength(1)
    expect(announcements[0]).toMatchObject({ gate: 'tdd', verdict: 'reminded' })
  })

  it('holds implementation edits under warn intensity', async () => {
    const { ctx } = await setup(tdd({ intensity: 'warn' }))
    const session = concreteSession()
    const decision = await gateDecision(ctx, {
      name: 'edit',
      arguments: { file_path: 'src/app.ts' },
      agent: fakeAgent(session),
    } as unknown as ToolExecution)
    expect(decision).toEqual({ kind: 'ask', reason: expect.stringContaining('red step') })
  })

  it('injects the green reminder at turn end when edits lack a passing run', async () => {
    const { ctx } = await setup(tdd({ remindOnce: false }))
    const injections: unknown[] = []
    const session = fakeSession([
      userTask('fix the bug in parser.ts'),
      shellCall('bash', 'pnpm test', 't-1'),
      shellResult('t-1', '[exit code: 1]'),
      mutationCall('edit', 'src/app.ts', 'e-1'),
    ])
    const agent = fakeAgent(session, injections)
    const announcements: unknown[] = []
    ctx.on('doublecheck/reminder', payload => { announcements.push(payload) })
    await ctx.serial('agent/turn-stopping', { agent, turn: 1, signal })
    expect(injections).toHaveLength(1)
    expect(announcements).toHaveLength(1)
    expect(announcements[0]).toMatchObject({ gate: 'tdd', verdict: 'green-pending' })
  })

  it('stays silent at turn end after a passing run', async () => {
    const { ctx } = await setup(tdd({ remindOnce: false }))
    const injections: unknown[] = []
    const session = fakeSession([
      userTask('fix the bug in parser.ts'),
      shellCall('bash', 'pnpm test', 't-1'),
      shellResult('t-1', '[exit code: 1]'),
      mutationCall('edit', 'src/app.ts', 'e-1'),
      shellCall('bash', 'pnpm test', 't-2'),
      shellResult('t-2', '4 passed'),
    ])
    const agent = fakeAgent(session, injections)
    await ctx.serial('agent/turn-stopping', { agent, turn: 1, signal })
    expect(injections).toHaveLength(0)
  })

  it('injects the green reminder at most once under remindOnce', async () => {
    const { ctx } = await setup(tdd())
    const injections: unknown[] = []
    const session = fakeSession([
      userTask('fix the bug in parser.ts'),
      mutationCall('edit', 'src/app.ts', 'e-1'),
    ])
    const agent = fakeAgent(session, injections)
    await ctx.serial('agent/turn-stopping', { agent, turn: 1, signal })
    await ctx.serial('agent/turn-stopping', { agent, turn: 2, signal })
    expect(injections).toHaveLength(1)
  })

  it('keeps the green gate silent when tdd is off', async () => {
    const { ctx } = await setup(fullConfig())
    const injections: unknown[] = []
    const session = fakeSession([
      userTask('fix the bug in parser.ts'),
      mutationCall('edit', 'src/app.ts', 'e-1'),
    ])
    const agent = fakeAgent(session, injections)
    await ctx.serial('agent/turn-stopping', { agent, turn: 1, signal })
    expect(injections).toHaveLength(0)
  })

  // ── delivery gate ─────────────────────────────────────────────────────────

  it('reminds about the delivery report when green and no report is on record', async () => {
    const { ctx } = await setup(tdd({ remindOnce: false }))
    const injections: unknown[] = []
    const announcements: unknown[] = []
    const session = fakeSession(greenDeliverySession() as never)
    const agent = fakeAgent(session, injections)
    ctx.on('doublecheck/reminder', payload => { announcements.push(payload) })
    await ctx.serial('agent/turn-stopping', { agent, turn: 1, signal })

    expect(injections).toHaveLength(1)
    expect((injections[0] as { source: { summary?: string } }).source.summary).toBe('delivery report')
    expect(announcements[0]).toMatchObject({ gate: 'delivery', verdict: 'report-expected' })
  })

  it('stays silent about the report once a successful report is on record', async () => {
    const { ctx } = await setup(tdd({ remindOnce: false }))
    const injections: unknown[] = []
    const session = fakeSession([
      ...greenDeliverySession() as never,
      toolCall('doublecheck_report', 'report-1'),
      toolResult('report-1'),
    ])
    const agent = fakeAgent(session, injections)
    await ctx.serial('agent/turn-stopping', { agent, turn: 1, signal })
    expect(injections).toHaveLength(0)
  })

  it('keeps the delivery gate silent before green', async () => {
    const { ctx } = await setup(tdd({ remindOnce: false }))
    const injections: unknown[] = []
    const session = fakeSession([
      userTask('fix the bug in parser.ts'),
      toolCall(SPEC_TOOL_NAME, 'spec-1'),
      toolResult('spec-1'),
      mutationCall('edit', 'src/app.ts', 'e-1'),
    ])
    const agent = fakeAgent(session, injections)
    await ctx.serial('agent/turn-stopping', { agent, turn: 1, signal })
    // Only the green gate speaks (edits lack a passing run); the delivery
    // gate waits for actual green evidence.
    expect(injections).toHaveLength(1)
    expect((injections[0] as { source: { summary?: string } }).source.summary).toBe('green gate')
  })

  // ── v0.3 adversary review ────────────────────────────────────────────────

  const adversary = (overrides: Partial<guardModule.Config> = {}): guardModule.Config => fullConfig({
    modules: { grill: true, tdd: false, adversary: true },
    ...overrides,
  })

  const blockerFinding: ReviewFinding = {
    severity: 'blocker',
    title: 'acceptance criteria unverified',
    detail: 'The session never runs the acceptance command named in the spec.',
  }

  it('runs the critic when the delivery reaches green and injects its findings', async () => {
    const { ctx, starts } = await setup(adversary(), { review: { findings: [blockerFinding] } })
    const injections: unknown[] = []
    const reviews: unknown[] = []
    const session = fakeSession(greenDeliverySession() as never)
    const agent = fakeAgent(session, injections)
    ctx.on('doublecheck/review', payload => { reviews.push(payload) })
    await ctx.serial('agent/turn-stopping', { agent, turn: 1, signal })

    expect(starts).toHaveLength(1)
    expect(starts[0]?.name).toBe('fork')
    // The delivery gate injects the report-expected notice first; the review
    // rides its own durable source.
    expect(injections).toHaveLength(2)
    expect((injections[0] as { source: { kind: string; summary?: string } }).source.summary).toBe('delivery report')
    expect((injections[1] as { source: { kind: string } }).source.kind).toBe('doublecheck-review')
    expect(reviews).toHaveLength(1)
    expect(reviews[0]).toMatchObject({ verdict: 'findings', findings: [blockerFinding] })
  })

  it('forwards adversaryModel to the critic run and allows only the configured tools', async () => {
    const { ctx, starts } = await setup(adversary({ adversaryModel: 'deepseek-v4-pro' }), { review: { findings: [] } })
    const session = fakeSession(greenDeliverySession() as never)
    const agent = fakeAgent(session)
    await ctx.serial('agent/turn-stopping', { agent, turn: 1, signal })

    const request = starts[0]?.request as { agentOptions?: { model?: string }; toolFilter?: { allow?: string[] } }
    expect(request.agentOptions).toEqual({ model: 'deepseek-v4-pro' })
    expect(request.toolFilter).toEqual({ allow: ['read', 'glob', 'grep'] })
  })

  it('steers once under warn intensity when findings exist', async () => {
    const { ctx, starts } = await setup(adversary({ intensity: 'warn' }), { review: { findings: [blockerFinding] } })
    const injections: unknown[] = []
    const steers: unknown[] = []
    const session = fakeSession(greenDeliverySession() as never)
    const agent = fakeAgent(session, injections, steers)
    await ctx.serial('agent/turn-stopping', { agent, turn: 1, signal })

    expect(starts).toHaveLength(1)
    expect(injections).toHaveLength(2)
    expect(steers).toHaveLength(1)
  })

  it('steers once under block intensity when findings exist', async () => {
    const { ctx } = await setup(adversary({ intensity: 'block' }), { review: { findings: [blockerFinding] } })
    const steers: unknown[] = []
    const session = fakeSession(greenDeliverySession() as never)
    const agent = fakeAgent(session, [], steers)
    await ctx.serial('agent/turn-stopping', { agent, turn: 1, signal })

    expect(steers).toHaveLength(1)
  })

  it('injects a clean verdict without steering', async () => {
    const { ctx } = await setup(adversary({ intensity: 'block' }), { review: { findings: [] } })
    const injections: unknown[] = []
    const steers: unknown[] = []
    const reviews: unknown[] = []
    const session = fakeSession(greenDeliverySession() as never)
    const agent = fakeAgent(session, injections, steers)
    ctx.on('doublecheck/review', payload => { reviews.push(payload) })
    await ctx.serial('agent/turn-stopping', { agent, turn: 1, signal })

    expect(injections).toHaveLength(2)
    expect(steers).toHaveLength(0)
    expect(reviews[0]).toMatchObject({ verdict: 'clean', findings: [] })
  })

  it('injects an honest notice when the critic cannot complete', async () => {
    const { ctx } = await setup(adversary(), { review: { stopReason: 'aborted' } })
    const injections: unknown[] = []
    const reviews: unknown[] = []
    const session = fakeSession(greenDeliverySession() as never)
    const agent = fakeAgent(session, injections)
    ctx.on('doublecheck/review', payload => { reviews.push(payload) })
    await ctx.serial('agent/turn-stopping', { agent, turn: 1, signal })

    expect(injections).toHaveLength(2)
    expect(reviews[0]).toMatchObject({ verdict: 'unavailable', findings: [] })
  })

  it('cancels the critic run with the turn signal', async () => {
    const { ctx } = await setup(adversary(), { reviewSignalAware: true })
    const injections: unknown[] = []
    const reviews: unknown[] = []
    const session = fakeSession(greenDeliverySession() as never)
    const agent = fakeAgent(session, injections)
    ctx.on('doublecheck/review', payload => { reviews.push(payload) })
    const controller = new AbortController()
    const pending = ctx.serial('agent/turn-stopping', { agent, turn: 1, signal: controller.signal })
    // Let the listener reach the critic await, then cancel the turn.
    await Promise.resolve()
    controller.abort()
    await pending

    expect(reviews[0]).toMatchObject({ verdict: 'unavailable', findings: [] })
    expect((injections[1] as { source: { kind: string } }).source.kind).toBe('doublecheck-review')
  })

  it('skips the review when the delivery has not reached green', async () => {
    const { ctx, starts } = await setup(adversary())
    const injections: unknown[] = []
    const session = fakeSession([
      userTask('fix the bug in parser.ts'),
      toolCall(SPEC_TOOL_NAME, 'spec-1'),
      toolResult('spec-1'),
      mutationCall('edit', 'src/app.ts', 'e-1'),
    ])
    const agent = fakeAgent(session, injections)
    await ctx.serial('agent/turn-stopping', { agent, turn: 1, signal })

    expect(starts).toHaveLength(0)
    expect(injections).toHaveLength(0)
  })

  it('reviews at most once per session', async () => {
    const { ctx, starts } = await setup(adversary(), { review: { findings: [blockerFinding] } })
    const session = fakeSession(greenDeliverySession() as never)
    const agent = fakeAgent(session)
    await ctx.serial('agent/turn-stopping', { agent, turn: 1, signal })
    await ctx.serial('agent/turn-stopping', { agent, turn: 2, signal })

    expect(starts).toHaveLength(1)
  })

  it('settles as unavailable when the subagents seam is missing', async () => {
    const { ctx, starts } = await setup(adversary(), { noSubagents: true })
    const injections: unknown[] = []
    const reviews: unknown[] = []
    const session = fakeSession(greenDeliverySession() as never)
    const agent = fakeAgent(session, injections)
    ctx.on('doublecheck/review', payload => { reviews.push(payload) })
    await ctx.serial('agent/turn-stopping', { agent, turn: 1, signal })

    expect(starts).toHaveLength(0)
    expect(injections).toHaveLength(2)
    expect(reviews[0]).toMatchObject({ verdict: 'unavailable', findings: [] })
  })

  it('keeps the review silent when adversary is off', async () => {
    const { ctx, starts } = await setup(fullConfig())
    const session = fakeSession(greenDeliverySession() as never)
    const agent = fakeAgent(session)
    await ctx.serial('agent/turn-stopping', { agent, turn: 1, signal })

    expect(starts).toHaveLength(0)
  })
})
