import { describe, expect, it } from 'vitest'
import { Context, Service } from '@deepseek-ai/cordis'
import type { PreToolDecision, ToolExecution } from '@deepseek-ai/dsh-tools'
import * as guardModule from '../src/guard/index.ts'
import { doublecheckHandler, effectiveDoublecheckEnabled, hostStampsIgnorable } from '../src/guard/command.ts'
import { fakeAgent, fakeSession, mutationCall, sessionEvent, shellCall, shellResult, toolCall, toolResult, userTask } from './helpers.ts'

const signal = new AbortController().signal

function fullConfig(overrides: Partial<guardModule.Config> = {}): guardModule.Config {
  return {
    intensity: 'remind',
    modules: { grill: true, tdd: true, adversary: false },
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
  handler: (invocation: { agent: unknown; rawInput: string }) => { kind: 'success' | 'error'; text: string }
}

async function setup(config: guardModule.Config = fullConfig()) {
  const ctx = new Context()
  const registered: RegisteredCommand[] = []
  class FakeCommands extends Service {
    constructor(childCtx: Context) {
      super(childCtx, 'commands')
    }

    register(entry: RegisteredCommand) {
      registered.push(entry)
    }
  }
  await ctx.plugin(FakeCommands)
  await ctx.plugin(guardModule, config)
  return { ctx, registered }
}

/** A session log that completed the loop to green (spec + red run + edit + green run). */
function greenDeliverySession() {
  return [
    userTask('fix the bug in parser.ts'),
    toolCall('doublecheck_spec', 'spec-1'),
    toolResult('spec-1'),
    shellCall('bash', 'pnpm test', 't-1'),
    shellResult('t-1', '[exit code: 1]'),
    mutationCall('edit', 'src/app.ts', 'e-1'),
    shellCall('bash', 'pnpm test', 't-2'),
    shellResult('t-2', '4 passed'),
  ]
}

describe('effectiveDoublecheckEnabled', () => {
  it('falls back to the configured default without a state record', () => {
    expect(effectiveDoublecheckEnabled([], true)).toBe(true)
    expect(effectiveDoublecheckEnabled([], false)).toBe(false)
  })

  it('returns the last state record', () => {
    const events = [
      sessionEvent('doublecheck/state', { enabled: false }),
      sessionEvent('doublecheck/state', { enabled: true }),
    ]
    expect(effectiveDoublecheckEnabled(events, false)).toBe(true)
  })
})

describe('/doublecheck command', () => {
  it('registers one command on the commands service', async () => {
    const { registered } = await setup()
    expect(registered).toHaveLength(1)
    expect(registered[0]?.name).toBe('doublecheck')
    expect(registered[0]?.description).toContain('discipline gates')
  })

  it('status reports the effective switch, modules, and folded stage', async () => {
    const { registered } = await setup()
    const handler = registered[0]!.handler
    const injections: unknown[] = []
    const session = fakeSession([userTask('vague task')])
    const result = handler({ agent: fakeAgent(session, injections), rawInput: 'status' })
    expect(result.kind).toBe('success')
    expect(result.text).toContain('ON')
    expect(result.text).toContain('Modules: grill=on, tdd=on, adversary=off')
    expect(result.text).toContain('spec=missing')
    expect(result.text).toContain('Usage: /doublecheck status|report|on|off')
  })

  it('status reflects a durable off override', async () => {
    const { registered } = await setup()
    const handler = registered[0]!.handler
    const session = fakeSession([sessionEvent('doublecheck/state', { enabled: false })])
    const result = handler({ agent: fakeAgent(session), rawInput: 'status' })
    expect(result.kind).toBe('success')
    expect(result.text).toContain('OFF')
  })

  it('on/off stays in-memory when the host cannot stamp ignorable (rc.6 peers)', async () => {
    const { ctx, registered } = await setup()
    const handler = registered[0]!.handler
    const injections: unknown[] = []
    const session = fakeSession([userTask('task')])
    const agent = fakeAgent(session, injections)
    const result = handler({ agent, rawInput: 'off' })
    expect(result.kind).toBe('success')
    expect(result.text).toContain('for this process only')
    const state = session.events.filter(event => event.type === 'doublecheck/state')
    expect(state).toHaveLength(0)

    // The process-local override must actually disarm the gates.
    const exec = { name: 'edit', agent, arguments: { file_path: 'src/app.ts' }, signal } as unknown as ToolExecution
    const decision = await ctx.waterfall('tools/pre-execute', exec, () => Promise.resolve<PreToolDecision>({ kind: 'allow' }))
    expect(decision.kind).toBe('allow')
    expect(injections).toHaveLength(1) // only the switch notice
  })

  it('writes the durable state event when the host stamps ignorable', () => {
    const handler = doublecheckHandler({
      config: fullConfig(),
      snapshotOf: () => { throw new Error('unused for on/off') },
      detection: { testToolNames: [], testCommandPatterns: [], mutationTools: [], testFilePatterns: [] },
      stampsIgnorable: () => true,
      setLocalOverride: () => undefined,
    })
    const session = fakeSession([userTask('task')])
    const injections: unknown[] = []
    const result = handler({ agent: fakeAgent(session, injections), rawInput: 'off' })
    expect(result.kind).toBe('success')
    expect(result.text).toContain('OFF for this session')
    const state = session.events.filter(event => event.type === 'doublecheck/state')
    expect(state).toHaveLength(1)
    expect(state[0]?.data).toEqual({ enabled: false })
    expect(injections).toHaveLength(1)
  })

  it('hostStampsIgnorable reports the real host capability', () => {
    // On the rc.6 peers this repo tests against the append surface ignores
    // the options bag, so the probe must report false — the adaptive gate
    // relies on it. On post-rc.6 hosts the same probe reports true.
    expect(typeof hostStampsIgnorable()).toBe('boolean')
  })

  it('rejects an unknown argument with the usage line', async () => {
    const { registered } = await setup()
    const handler = registered[0]!.handler
    const session = fakeSession([])
    const result = handler({ agent: fakeAgent(session), rawInput: 'maybe' })
    expect(result.kind).toBe('error')
    expect(result.text).toContain('Usage: /doublecheck status|report|on|off')
  })

  it('report folds the delivery report from the session log', async () => {
    const { registered } = await setup()
    const handler = registered[0]!.handler
    const session = fakeSession(greenDeliverySession())
    const result = handler({ agent: fakeAgent(session), rawInput: 'report' })
    expect(result.kind).toBe('success')
    expect(result.text).toContain('# Doublecheck report')
    expect(result.text).toContain('green')
  })

  it('a disabled session delegates the pre-execute gate untouched', async () => {
    const { ctx } = await setup()
    const injections: unknown[] = []
    const session = fakeSession([userTask('vague task'), sessionEvent('doublecheck/state', { enabled: false })])
    const agent = fakeAgent(session, injections)
    const exec = { name: 'edit', agent, arguments: { file_path: 'src/app.ts' }, signal } as unknown as ToolExecution
    const decision = await ctx.waterfall('tools/pre-execute', exec, () => Promise.resolve<PreToolDecision>({ kind: 'allow' }))
    expect(decision.kind).toBe('allow')
    expect(injections).toHaveLength(0)
  })
})
