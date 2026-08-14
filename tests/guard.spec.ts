import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { CallId } from '@deepseek-ai/dsh-llm'
import type { Session } from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import { defineTool, ToolRuntime } from '@deepseek-ai/dsh-tools'
import type { PreToolDecision, ToolExecution } from '@deepseek-ai/dsh-tools'
import * as guardModule from '../src/guard/index.ts'
import { SPEC_TOOL_NAME } from '../src/domain/stages.ts'
import type { GuardIntensity } from '../src/events.ts'
import { fakeAgent, fakeSession, toolCall, toolResult, userTask } from './helpers.ts'

const signal = new AbortController().signal

function fullConfig(overrides: Partial<guardModule.Config> = {}): guardModule.Config {
  return {
    intensity: 'remind',
    modules: { grill: true, tdd: false, adversary: false },
    adversaryModel: null,
    guardTools: ['edit', 'write'],
    vagueTaskMaxChars: 200,
    remindOnce: true,
    ...overrides,
  }
}

async function setup(config: guardModule.Config = fullConfig()) {
  const ctx = new Context()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  const editTool = defineTool({
    name: 'edit',
    description: 'edit a file',
    parameters: { path: { type: 'string', required: true } },
    output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
    async execute() { return 'edited' },
  })
  ctx.tools.register(editTool)
  await ctx.plugin(guardModule, config)
  return ctx
}

/** Execute an `edit` call for a session whose log is `events`. */
async function runEdit(ctx: Context, agent: Agent, callId: string) {
  return ctx.tools.execute({
    signal,
    callId: CallId(callId),
    name: 'edit',
    arguments: { path: 'src/app.ts' },
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

describe('doublecheck-guard', () => {
  it('validates its config schema: defaults and rejections', () => {
    // schemastery omits a null-defaulted key (adversaryModel) from the output
    // config; every other default is materialized.
    expect(guardModule.Config({})).toEqual({
      intensity: 'remind',
      modules: { grill: true, tdd: false, adversary: false },
      guardTools: ['edit', 'write'],
      vagueTaskMaxChars: 200,
      remindOnce: true,
    })
    expect(() => guardModule.Config({ intensity: 'loud' })).toThrow()
  })

  it('rejects reserved module misuse at load, fail-loud', async () => {
    const cases: guardModule.Config[] = [
      fullConfig({ modules: { grill: true, tdd: true, adversary: false } }),
      fullConfig({ modules: { grill: true, tdd: false, adversary: true } }),
      fullConfig({ adversaryModel: 'deepseek-v4-flash' }),
      fullConfig({ guardTools: [] }),
      fullConfig({ guardTools: ['edit', 'edit'] }),
      fullConfig({ vagueTaskMaxChars: 0 }),
    ]
    for (const config of cases) {
      const ctx = new Context()
      await expect(ctx.plugin(guardModule, config)).rejects.toThrow(/dsh-doublecheck/)
    }
  })

  it('reminds on a vague pre-spec edit and logs the reminder through the context channel', async () => {
    const ctx = await setup()
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
    expect(announcements[0]).toMatchObject({ toolName: 'edit', intensity: 'remind', verdict: 'reminded' })
  })

  it('leaves a concrete task alone', async () => {
    const ctx = await setup()
    const session = fakeSession([userTask('fix the bug in parser.ts')])
    const result = await runEdit(ctx, fakeAgent(session), 'edit-2')
    expect(result.isError).toBe(false)
    expect(result.additionalContexts).toBeUndefined()
  })

  it('leaves a session with a committed spec alone', async () => {
    const ctx = await setup()
    const session = fakeSession([
      userTask('帮我做那个功能'),
      toolCall(SPEC_TOOL_NAME, 'spec-1'),
      toolResult('spec-1'),
    ])
    const result = await runEdit(ctx, fakeAgent(session), 'edit-3')
    expect(result.isError).toBe(false)
    expect(result.additionalContexts).toBeUndefined()
  })

  it('leaves non-guard tools alone even on a vague pre-spec session', async () => {
    const ctx = await setup()
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
    const ctx = await setup()
    const result = await ctx.tools.execute({
      signal,
      callId: CallId('edit-4'),
      name: 'edit',
      arguments: { path: 'x.ts' },
    })
    expect(result.isError).toBe(false)
    expect(result.additionalContexts).toBeUndefined()
  })

  it('reminds at most once per session under remindOnce', async () => {
    const ctx = await setup()
    const session = vagueSession()
    const agent = fakeAgent(session)
    const first = await runEdit(ctx, agent, 'edit-5')
    const second = await runEdit(ctx, agent, 'edit-6')
    expect(first.additionalContexts).toHaveLength(1)
    expect(second.additionalContexts).toBeUndefined()
  })

  it('reminds again after the first reminder when remindOnce is off', async () => {
    const ctx = await setup(fullConfig({ remindOnce: false }))
    const session = vagueSession()
    const agent = fakeAgent(session)
    const first = await runEdit(ctx, agent, 'edit-7')
    const second = await runEdit(ctx, agent, 'edit-8')
    expect(first.additionalContexts).toHaveLength(1)
    expect(second.additionalContexts).toHaveLength(1)
  })

  it('denies the edit at the policy gate under intensity block', async () => {
    const ctx = await setup(fullConfig({ intensity: 'block' }))
    const session = vagueSession()
    const decision = await gateDecision(ctx, {
      name: 'edit',
      arguments: { path: 'x.ts' },
      agent: fakeAgent(session),
    } as unknown as ToolExecution)
    expect(decision).toEqual({ kind: 'deny', reason: expect.stringContaining('requirements guard') })
  })

  it('materializes the block as an error result through the registry', async () => {
    const ctx = await setup(fullConfig({ intensity: 'block' }))
    const session = vagueSession()
    const result = await runEdit(ctx, fakeAgent(session), 'edit-9')
    expect(result.isError).toBe(true)
    if (result.isError) {
      expect(result.error.message).toContain('requirements guard')
    }
  })

  it('holds the edit for approval under intensity warn, and denies when no approval channel exists', async () => {
    const ctx = await setup(fullConfig({ intensity: 'warn' }))
    const session = vagueSession()
    const decision = await gateDecision(ctx, {
      name: 'write',
      arguments: { path: 'x.ts' },
      agent: fakeAgent(session),
    } as unknown as ToolExecution)
    expect(decision).toEqual({ kind: 'ask', reason: expect.stringContaining('no doublecheck spec') })

    const result = await runEdit(ctx, fakeAgent(session), 'edit-10')
    expect(result.isError).toBe(true)
    if (result.isError) {
      expect(result.error.message).toContain('no doublecheck spec')
    }
  })

  it('stays silent when modules.grill is off', async () => {
    const ctx = await setup(fullConfig({ modules: { grill: false, tdd: false, adversary: false } }))
    const session = vagueSession()
    const result = await runEdit(ctx, fakeAgent(session), 'edit-11')
    expect(result.isError).toBe(false)
    expect(result.additionalContexts).toBeUndefined()
  })

  it('recomputes its snapshot when the session log grows', async () => {
    const ctx = await setup()
    const events = [userTask('帮我做那个功能')]
    const session = fakeSession(events)
    const agent = fakeAgent(session)
    const first = await runEdit(ctx, agent, 'edit-12')
    expect(first.additionalContexts).toHaveLength(1)

    events.push(toolCall(SPEC_TOOL_NAME, 'spec-2'), toolResult('spec-2'))
    const after = await runEdit(ctx, agent, 'edit-13')
    expect(after.additionalContexts).toBeUndefined()
  })

  it('emits one reminder event per reaction with the intensity verdict', async () => {
    const ctx = await setup(fullConfig({ intensity: 'block' }))
    const session = vagueSession()
    const announcements: unknown[] = []
    ctx.on('doublecheck/reminder', payload => { announcements.push(payload) })
    await runEdit(ctx, fakeAgent(session), 'edit-14')
    expect(announcements).toHaveLength(1)
    expect(announcements[0]).toMatchObject({ toolName: 'edit', intensity: 'block' as GuardIntensity, verdict: 'denied' })
  })
})
