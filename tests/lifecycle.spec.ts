/**
 * Lifecycle and export-contract suite: the HMR-safety test (dispose the
 * contributing fiber of each plugin row, re-query the authoritative tool,
 * skill, and command registries), the default-export guard (module namespace
 * + Loader unwrap round-trip) for all three plugin modules, and the
 * Schema-level invalid-config negatives (the Loader-facing validation the
 * apply-level fail-loud tests do not exercise).
 * @module dsh-doublecheck/test/lifecycle.spec
 */

import { Context, type Fiber } from '@deepseek-ai/cordis'
import CommandRuntime from '@deepseek-ai/dsh-commands'
import SessionStore, { SessionId, type Session } from '@deepseek-ai/dsh-session'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import { describe, expect, it } from 'vitest'
import * as grillModule from '../src/grill/index.ts'
import * as guardModule from '../src/guard/index.ts'
import * as invariantModule from '../src/invariant.ts'
import { PROVIDER_NAME } from '../src/grill/provider.ts'

function makeAgent(session: Session) {
  return {
    id: session.id,
    options: { provider: 'deepseek', model: 'demo-model' },
    session,
    inbox: {},
    status: 'idle',
    ctx: new Context(),
    cancel: () => undefined,
    whenIdle: async () => undefined,
    runMaintenance: async (task: (signal: AbortSignal) => Promise<unknown>) => task(new AbortController().signal),
    send: () => undefined,
    followup: () => undefined,
    steer: () => undefined,
    inject: () => undefined,
  }
}

/** Mount the grill row over real skill/tool registries and return its fiber. */
async function mountGrill(): Promise<{ ctx: Context; fiber: Fiber }> {
  const ctx = new Context()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(SkillRegistry)
  await ctx.plugin(ToolRuntime)
  const fiber = await ctx.plugin(grillModule)
  return { ctx, fiber }
}

/** Mount the guard row over real session/tool/command registries and return its fiber. */
async function mountGuard(): Promise<{ ctx: Context; session: Session; fiber: Fiber }> {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  const session = ctx.sessions.create(SessionId('dsh-doublecheck-lifecycle'))
  ctx.provide('systemPrompt', { tools: () => () => undefined, section: () => () => undefined } as never)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(CommandRuntime)
  const fiber = await ctx.plugin(guardModule)
  return { ctx, session, fiber }
}

const GRILL_TOOLS = ['doublecheck_skills', 'doublecheck_spec', 'doublecheck_report']

// ---------------------------------------------------------------------------
// C2: each plugin module must survive Loader unwrapping (no default export)
// ---------------------------------------------------------------------------

describe('export contract', () => {
  it('grill carries no default export and unwrap round-trips the namespace', () => {
    expect('default' in grillModule).toBe(false)
    const unwrapped = Object.create(Loader.prototype).unwrapExports(grillModule)
    expect(unwrapped).toBe(grillModule)
    expect(unwrapped.name).toBe('doublecheck-grill')
    expect(unwrapped.inject).toEqual(['skills', 'tools'])
    expect(unwrapped.Config).not.toBeUndefined()
    expect(typeof unwrapped.apply).toBe('function')
  })

  it('guard carries no default export and unwrap round-trips the namespace', () => {
    expect('default' in guardModule).toBe(false)
    const unwrapped = Object.create(Loader.prototype).unwrapExports(guardModule)
    expect(unwrapped).toBe(guardModule)
    expect(unwrapped.name).toBe('doublecheck-guard')
    expect(unwrapped.inject).toEqual(['commands'])
    expect(unwrapped.Config).not.toBeUndefined()
    expect(typeof unwrapped.apply).toBe('function')
  })

  it('invariant carries no default export and unwrap round-trips the namespace', () => {
    expect('default' in invariantModule).toBe(false)
    const unwrapped = Object.create(Loader.prototype).unwrapExports(invariantModule)
    expect(unwrapped).toBe(invariantModule)
    expect(unwrapped.name).toBe('dsh-doublecheck-invariant')
    expect(unwrapped.inject).toEqual(['invariants'])
    expect(typeof unwrapped.apply).toBe('function')
  })
})

// ---------------------------------------------------------------------------
// C1: disposing each contributing fiber removes its registry contributions
// ---------------------------------------------------------------------------

describe('fiber disposal', () => {
  it('grill: removes its three tools and the bundled skill provider', async () => {
    const { ctx, fiber } = await mountGrill()
    try {
      for (const name of GRILL_TOOLS) {
        expect(ctx.tools.get(name)).toBeDefined()
      }
      const before = await ctx.skills.list({})
      expect(before.filter(skill => skill.provider === PROVIDER_NAME)).toHaveLength(4)

      await fiber.dispose()

      for (const name of GRILL_TOOLS) {
        expect(ctx.tools.get(name)).toBeUndefined()
      }
      const after = await ctx.skills.list({})
      expect(after.filter(skill => skill.provider === PROVIDER_NAME)).toHaveLength(0)
    } finally {
      await ctx.fiber.dispose()
    }
  })

  it('guard: removes the /doublecheck and /gate commands', async () => {
    const { ctx, session, fiber } = await mountGuard()
    try {
      const agent = makeAgent(session)
      expect(ctx.commands.list(agent).find(entry => entry.name === 'doublecheck')).toBeDefined()
      expect(ctx.commands.list(agent).find(entry => entry.name === 'gate')).toBeDefined()

      await fiber.dispose()

      expect(ctx.commands.list(agent).find(entry => entry.name === 'doublecheck')).toBeUndefined()
      expect(ctx.commands.list(agent).find(entry => entry.name === 'gate')).toBeUndefined()
    } finally {
      await ctx.fiber.dispose()
    }
  })
})

// ---------------------------------------------------------------------------
// U4: the Schemastery schema rejects invalid config before apply ever runs
// ---------------------------------------------------------------------------

describe('Config schema negatives', () => {
  it('grill rejects an unknown verifyMode and empty file names', () => {
    expect(() => grillModule.Config({ verifyMode: 'sometimes' as 'all' })).toThrow()
    expect(() => grillModule.Config({ specFile: '' })).toThrow()
  })

  it('guard rejects unknown intensity and language values', () => {
    expect(() => guardModule.Config({ intensity: 'sometimes' as 'remind' })).toThrow()
    expect(() => guardModule.Config({ language: 'fr' as 'en' })).toThrow()
  })
})
