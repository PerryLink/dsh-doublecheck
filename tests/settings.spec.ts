/**
 * The gate settings seam (`doublecheck-gate`), exercised against the real
 * `SettingsProvider` contract rather than a fake: the namespace must satisfy
 * the host's `NAMESPACE_PATTERN` (a dotted name is rejected with a
 * `TypeError`), it must surface through `ctx.settings.describe()` instead of
 * being swallowed into a mount-time warn, and the user section must actually
 * reach the gate config the `/gate` panel reads (restart semantics).
 * @module dsh-doublecheck/test/settings.spec
 */

import { Context, Service, type Fiber } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { SettingsProvider, type SettingsNamespace } from '@deepseek-ai/dsh-settings'
import { describe, expect, it } from 'vitest'
import * as guardModule from '../src/guard/index.ts'
import { GateConfigSchema, type GateConfig } from '../src/guard/gate.ts'
import { fakeAgent, fakeSession } from './helpers.ts'

/**
 * In-memory settings provider: the host base class owns namespace
 * registration, layered resolution, validation, and the write queue; the
 * subclass only stores the raw document.
 */
class MemorySettings extends SettingsProvider {
  private doc: Record<string, unknown>

  constructor(ctx: Context, options?: { doc?: Record<string, unknown> }) {
    super(ctx)
    this.doc = structuredClone(options?.doc ?? {})
  }

  get writable(): boolean {
    return true
  }

  protected load(): Promise<Record<string, unknown>> {
    return Promise.resolve(structuredClone(this.doc))
  }

  protected persist(ns: SettingsNamespace, section: Record<string, unknown>): Promise<void> {
    this.doc[ns] = structuredClone(section)
    return Promise.resolve()
  }
}

/** The command descriptor fields the guard fills and the tests read. */
interface RegisteredCommand {
  name: string
  description: string
  input?: { hint?: string }
  handler: (invocation: { agent?: Agent; rawInput: string; signal: AbortSignal }) => unknown
}

/** The guard row injects `commands`; this stands in for the host runtime. */
class FakeCommands extends Service {
  readonly registered: RegisteredCommand[] = []

  constructor(ctx: Context) {
    super(ctx, 'commands')
  }

  register(entry: RegisteredCommand): void {
    this.registered.push(entry)
  }

  list(): Array<{ name: string }> {
    return this.registered.map(entry => ({ name: entry.name }))
  }
}

interface Harness {
  ctx: Context
  fiber: Fiber
  /** The commands this mount registered. */
  commands: RegisteredCommand[]
  /** Every logger record the shared exporter captured for the whole harness. */
  logs: string[]
}

/** Capture logger records through the host exporter seam (levels: default 3 = all). */
function captureLogs(ctx: Context): string[] {
  const logs: string[] = []
  ctx.logger.exporter({
    levels: { default: 3 },
    export(message) { logs.push(message.args.map(arg => String(arg)).join(' ')) },
  })
  return logs
}

/** Mount the settings provider, the commands service, and the guard row. */
async function boot(options: { doc?: Record<string, unknown>; config?: guardModule.Config } = {}): Promise<Harness> {
  const ctx = new Context()
  await ctx.plugin(MemorySettings, { doc: options.doc })
  await ctx.plugin(FakeCommands)
  const logs = captureLogs(ctx)
  const registry = (ctx.commands as unknown as FakeCommands).registered
  const start = registry.length
  const fiber = await ctx.plugin(guardModule, options.config)
  return { ctx, fiber, commands: registry.slice(start), logs }
}

/** Re-mount the guard row on an existing harness, as a profile reload does. */
async function remount(harness: Harness): Promise<Harness> {
  const registry = (harness.ctx.commands as unknown as FakeCommands).registered
  const start = registry.length
  const fiber = await harness.ctx.plugin(guardModule)
  return { ctx: harness.ctx, fiber, commands: registry.slice(start), logs: harness.logs }
}

const gateCommand = (commands: RegisteredCommand[]): RegisteredCommand => {
  const entry = commands.findLast(command => command.name === 'gate')
  if (entry === undefined) throw new Error('gate command not registered')
  return entry
}

const gateDescriptor = (ctx: Context) => ctx.settings.describe().find(descriptor => descriptor.ns === 'doublecheck-gate')

describe('settings namespace', () => {
  it('rejects the old dotted namespace at the host service', async () => {
    const { ctx } = await boot()
    // Widened to `string`: a literal is already refused at compile time by the
    // host type (`SettingsNamespaceInput`), so only the runtime rule is left.
    const dotted: string = 'doublecheck.gate'
    expect(() => ctx.settings.register(dotted, GateConfigSchema)).toThrow(TypeError)
    expect(() => ctx.settings.register(dotted, GateConfigSchema)).toThrow(/must match/)
    // The rejected name never reaches the registry the settings surfaces read.
    expect(ctx.settings.describe().map(descriptor => descriptor.ns)).not.toContain('doublecheck.gate')
  })

  it('registers doublecheck-gate and surfaces it through describe()', async () => {
    const { ctx } = await boot()
    expect(ctx.settings.describe().map(descriptor => descriptor.ns)).toContain('doublecheck-gate')
    const gate = gateDescriptor(ctx)
    expect(gate).toBeDefined()
    expect(gate!.ns).toMatch(/^[a-z][a-z0-9-]*$/)
    expect(gate!.applies).toBe('restart')
    // base = the composition gate config the row was loaded with.
    expect(gate!.base).toMatchObject({ enabled: true, reportFile: 'gate-report.md' })
    const resolved = ctx.settings.get('doublecheck-gate') as GateConfig
    expect(resolved).toBeDefined()
    expect(resolved.requirements.minConfirmed).toBe(6)
    expect(resolved.tests.requirePassingRun).toBe(true)
  })

  it('mounts without the "namespace skipped" warning', async () => {
    const { ctx, logs } = await boot()
    // Prove the capture works before trusting its emptiness.
    ctx.logger.warn('settings.spec capture probe')
    expect(logs.some(line => line.includes('capture probe'))).toBe(true)
    expect(logs.filter(line => line.includes('gate settings namespace skipped'))).toHaveLength(0)
  })

  it('feeds the user section into the gate config read at load', async () => {
    const first = await boot()
    await first.ctx.settings.update('doublecheck-gate', { requirements: { minConfirmed: 2 } })
    expect((first.ctx.settings.get('doublecheck-gate') as GateConfig).requirements.minConfirmed).toBe(2)
    expect(gateDescriptor(first.ctx)?.user).toMatchObject({ requirements: { minConfirmed: 2 } })
    // Restart semantics: a profile reload disposes the row and mounts it again.
    await first.fiber.dispose()
    const second = await remount(first)
    const result = gateCommand(second.commands).handler({
      agent: fakeAgent(fakeSession([])),
      rawInput: 'config',
      signal: new AbortController().signal,
    }) as { kind: string; text: string }
    expect(result.kind).toBe('success')
    expect(result.text).toContain('- minimum confirmed: 2')
  })

  it('refuses a user section the gate could not act on', async () => {
    const { ctx } = await boot()
    // `specDimension: null` is restated per item: schemastery drops a falsy
    // `default(null)` inside the checklist item schema, so the owner check is
    // what reports the duplicate id.
    await expect(ctx.settings.update('doublecheck-gate', {
      requirements: {
        checklist: [
          { id: 'a', question: 'q', specDimension: null },
          { id: 'a', question: 'q2', specDimension: null },
        ],
      },
    })).rejects.toThrow(/duplicate gate checklist id/)
    // The rejected write left the last good value in place.
    expect((ctx.settings.get('doublecheck-gate') as GateConfig).requirements.minConfirmed).toBe(6)
  })
})
