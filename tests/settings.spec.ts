/**
 * The gate settings seam after the harness replaced its settings-namespace
 * registry with `SettingsForms`.
 *
 * The removed contract is gone on purpose: `@deepseek-ai/dsh-settings` no
 * longer exports `SettingsProvider`, and `installSection` / `settings.register`
 * / `SettingsNamespace` / `SettingsScope` no longer exist anywhere in the
 * harness. A row's settings surface is now its own Config, addressed by profile
 * entry id, and only the fields it marks `.volatile()` are editable — so these
 * tests pin the three things this package actually owns:
 *
 * - the live-field declaration (`gate`, and nothing else),
 * - the presentation policy the row registers on the settings service,
 * - the restart-scoped read of the resolved block (an edit lands in the
 *   profile patch and is picked up on the next load, exactly as the removed
 *   `doublecheck-gate` namespace behaved with `applies: 'restart'`).
 *
 * The real `SettingsForms` needs `configEditor` and `profileContext` (a loader
 * and a profile directory), so the service is stood in for here; the schema
 * half is asserted against the real schema, which is the half the host's own
 * `volatileForm()` / `isVolatilePath()` read.
 * @module dsh-doublecheck/test/settings.spec
 */

import { Context, Service, type Fiber } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { describe, expect, it } from 'vitest'
import * as guardModule from '../src/guard/index.ts'
import { fakeAgent, fakeSession } from './helpers.ts'

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

/** One presentation policy the row registered, with the disposer it handed back. */
interface Presentation {
  presentation: { auto?: boolean }
  owner: Fiber | undefined
}

/**
 * The settings service stand-in. It implements the one method the row uses —
 * `configure(presentation, owner)` — and tracks the policies that are live, so
 * a test can prove the registration unwinds with the row.
 */
class FakeSettings extends Service {
  readonly recorded: Presentation[] = []
  readonly live = new Set<Presentation>()

  constructor(ctx: Context) {
    super(ctx, 'settings')
  }

  configure(presentation: { auto?: boolean }, owner?: Fiber): () => void {
    const entry: Presentation = { presentation: { ...presentation }, owner }
    this.recorded.push(entry)
    this.live.add(entry)
    return () => { this.live.delete(entry) }
  }
}

/**
 * The pre-`SettingsForms` settings service stand-in: the namespace registry had
 * no `configure`, so this proves the row mounts anyway.
 */
class LegacySettings extends Service {
  constructor(ctx: Context) {
    super(ctx, 'settings')
  }
}

interface Harness {
  ctx: Context
  fiber: Fiber
  /** The commands this mount registered. */
  commands: RegisteredCommand[]
  /** Every logger record the shared exporter captured for the whole harness. */
  logs: string[]
  /** The mounted live-field settings stand-in, or undefined for the other cases. */
  settings: FakeSettings | undefined
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

/** Let queued microtasks (effect setup/teardown) settle. */
async function settle(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0))
}

/**
 * Mount the settings stand-in, the commands service, and the guard row.
 * @param options.settings - `false` mounts nothing, `'legacy'` mounts the
 * pre-live-field service, omitted mounts the `SettingsForms` stand-in.
 * @param options.config - the row config to load.
 */
async function boot(options: { settings?: boolean | 'legacy'; config?: guardModule.Config } = {}): Promise<Harness> {
  const ctx = new Context()
  if (options.settings === 'legacy') await ctx.plugin(LegacySettings)
  else if (options.settings !== false) await ctx.plugin(FakeSettings)
  await ctx.plugin(FakeCommands)
  const settings = options.settings === undefined
    ? (ctx as unknown as { settings: FakeSettings }).settings
    : undefined
  const logs = captureLogs(ctx)
  const registry = (ctx.commands as unknown as FakeCommands).registered
  const start = registry.length
  const fiber = await ctx.plugin(guardModule, options.config)
  await settle()
  return { ctx, fiber, commands: registry.slice(start), logs, settings }
}

/** Re-mount the guard row on an existing harness, as a profile reload does. */
async function remount(harness: Harness, config?: guardModule.Config): Promise<Harness> {
  const registry = (harness.ctx.commands as unknown as FakeCommands).registered
  const start = registry.length
  const fiber = await harness.ctx.plugin(guardModule, config)
  await settle()
  return { ...harness, fiber, commands: registry.slice(start) }
}

const gateCommand = (commands: RegisteredCommand[]): RegisteredCommand => {
  const entry = commands.findLast(command => command.name === 'gate')
  if (entry === undefined) throw new Error('gate command not registered')
  return entry
}

/** The `/gate config` panel text for a freshly mounted harness. */
function gateConfigText(harness: Harness): string {
  const result = gateCommand(harness.commands).handler({
    agent: fakeAgent(fakeSession([])),
    rawInput: 'config',
    signal: new AbortController().signal,
  }) as { kind: string; text: string }
  expect(result.kind).toBe('success')
  return result.text
}

describe('settings seam', () => {
  it('declares `gate` — and only `gate` — as a live field', () => {
    // The host derives a row's editable form from exactly this marker: a
    // `.volatile()` field is projected into the form, everything else is
    // ordinary composition config the form never shows.
    const dict = (guardModule.Config as unknown as { dict: Record<string, { meta: { volatile?: boolean } }> }).dict
    expect(dict.gate?.meta.volatile).toBe(true)
    for (const field of ['intensity', 'modules', 'guardTools', 'language', 'enableByDefault']) {
      expect(dict[field]?.meta.volatile).toBeUndefined()
    }
  })

  it('resolves the gate block whether the host hands over a live reference or a plain object', () => {
    // One build spans the peer band: hosts with live Config fields resolve the
    // field to a `Volatile` reference, hosts without them (schemastery before
    // `.volatile()`) resolve it to the plain object.
    const plain = { enabled: false, planSuggestion: true, reportFile: 'x.md' } as never
    expect(guardModule.resolveGateBlock(plain)).toBe(plain)
    const snapshot = { enabled: true, planSuggestion: false, reportFile: 'y.md' }
    expect(guardModule.resolveGateBlock({ get: () => snapshot } as never)).toBe(snapshot)
  })

  it('fails loud rather than folding an absent gate block', () => {
    expect(() => guardModule.resolveGateBlock({ get: () => undefined } as never)).toThrow(/resolved to undefined/)
  })

  it('no longer exports the retired settings namespace', () => {
    // Regression guard: the harness removed the namespace registry outright, so
    // re-adding a package-chosen namespace name would silently do nothing.
    expect('GATE_SETTINGS_NS' in guardModule).toBe(false)
  })

  it('registers the presentation policy on the settings service', async () => {
    const harness = await boot()
    const recorded = harness.settings?.recorded ?? []
    expect(recorded).toHaveLength(1)
    expect(recorded[0]?.presentation).toEqual({ auto: false })
    // Owned by this row's own fiber, not the caller's.
    expect(recorded[0]?.owner).toBe(harness.fiber)
    expect(harness.settings?.live.size).toBe(1)
  })

  it('mounts on a host whose settings service has no live-field policy at all', async () => {
    // The pre-`SettingsForms` service (namespace registry) has no `configure`;
    // the row must still mount there instead of failing over an absent surface.
    const harness = await boot({ settings: 'legacy' })
    expect(harness.settings).toBeUndefined()
    expect(harness.commands.map(command => command.name).sort()).toEqual(['doublecheck', 'gate'])
  })

  it('unwinds the presentation policy when the row is disposed', async () => {
    const harness = await boot()
    expect(harness.settings?.live.size).toBe(1)
    await harness.fiber.dispose()
    await settle()
    expect(harness.settings?.live.size).toBe(0)
  })

  it('mounts without the settings seam and stays quiet about it', async () => {
    const harness = await boot({ settings: false })
    // Prove the capture works before trusting its emptiness.
    harness.ctx.logger.warn('settings.spec capture probe')
    expect(harness.logs.some(line => line.includes('capture probe'))).toBe(true)
    expect(harness.logs.filter(line => line.includes('settings namespace skipped'))).toHaveLength(0)
    expect(harness.commands.map(command => command.name).sort()).toEqual(['doublecheck', 'gate'])
  })

  it('feeds the configured gate block into the gate config read at load', async () => {
    const first = await boot({ config: fullConfig({ gate: gateOverride({ requirements: { minConfirmed: 2 } }) }) })
    expect(gateConfigText(first)).toContain('- minimum confirmed: 2')
    // Restart semantics: a profile reload disposes the row and mounts it again,
    // and the newly resolved block is what the panel reports.
    await first.fiber.dispose()
    const second = await remount(first, fullConfig({ gate: gateOverride({ reportFile: 'reloaded.md' }) }))
    const text = gateConfigText(second)
    expect(text).toContain('reloaded.md')
    expect(text).not.toContain('- minimum confirmed: 2')
  })

  it('refuses a gate block the gate could not act on', async () => {
    // `specDimension: null` is restated per item: schemastery drops a falsy
    // `default(null)` inside the checklist item schema, so the owner check is
    // what reports the duplicate id.
    await expect(boot({
      config: fullConfig({
        gate: gateOverride({
          requirements: {
            checklist: [
              { id: 'a', question: 'q', specDimension: null, required: true },
              { id: 'a', question: 'q2', specDimension: null, required: true },
            ],
          },
        }),
      }),
    })).rejects.toThrow(/duplicate gate checklist id/)
  })
})

/** The guard row's Config with every field the schema defaults, and `gate` overridden. */
function fullConfig(overrides: Record<string, unknown> = {}): guardModule.Config {
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
  } as guardModule.Config
}

/** The default gate block with the given fields layered on, as a profile patch supplies it. */
function gateOverride(overrides: Record<string, unknown>): Record<string, unknown> {
  const { gate } = guardModule.Config({}) as unknown as { gate: { get(): Record<string, unknown> } }
  return { ...gate.get(), ...overrides }
}
