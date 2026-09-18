/**
 * A02 R4 regression (`G-9` ⑤): the `doublecheck` projection registration must
 * be owned by an effect. The registry returns the disposer that unregisters
 * the projection; dropping it (the pre-fix shape) left the old closure live
 * across a config hot-reload, so toggling the gate - or any detection knob -
 * and reloading kept judging with the stale definitions: a silent
 * false-safety window. This suite mounts the guard row twice over a recording
 * registry and proves both halves: dispose releases the old registration, and
 * the remount folds with the NEW detection.
 * @module dsh-doublecheck/test/projection-lifecycle.spec
 */

import { Context, Service } from '@deepseek-ai/cordis'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import { describe, expect, it } from 'vitest'
import * as guardModule from '../src/guard/index.ts'
import type { DoublecheckProjectionState } from '../src/domain/projection.ts'
import { ptcDispatchRun } from './helpers.ts'

/** The slice of a projection definition this suite drives. */
interface RegisteredProjection {
  key: string
  init(): DoublecheckProjectionState
  apply(state: DoublecheckProjectionState, event: SessionEvent): DoublecheckProjectionState
}

/** A recording `sessionProjections` registry: captures definitions and their disposers. */
class FakeProjections extends Service {
  readonly registrations: RegisteredProjection[] = []
  /** Indices whose returned disposer has NOT run yet. */
  readonly live = new Set<number>()

  constructor(childCtx: Context) {
    super(childCtx, 'sessionProjections')
  }

  register(definition: RegisteredProjection): () => void {
    const index = this.registrations.push(definition) - 1
    this.live.add(index)
    return () => {
      this.live.delete(index)
    }
  }
}

/** A minimal `commands` seam so the guard row's command registrations land. */
class FakeCommands extends Service {
  readonly entries: { name: string }[] = []

  constructor(childCtx: Context) {
    super(childCtx, 'commands')
  }

  register(entry: { name: string }): void {
    this.entries.push(entry)
  }
}

/** Guard config: grill on (the all-off shape returns before registering), no subagents. */
function projectionOnlyConfig(overrides: Partial<guardModule.Config> = {}): guardModule.Config {
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
    testCommandPatterns: ['(?:^|[;&|]\\s*)pnpm\\s+test(?:\\s|$)'],
    testFilePatterns: ['(^|[\\\\/])(tests?|__tests__|specs?)([\\\\/]|$)', '\\.(test|spec)\\.[A-Za-z0-9]+$'],
    ...overrides,
  }
}

/** Mount a bare context with the services the guard row needs. */
async function mountContext(): Promise<{ ctx: Context; projections: FakeProjections }> {
  const ctx = new Context()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(FakeCommands)
  await ctx.plugin(FakeProjections)
  const projections = ctx.get('sessionProjections') as FakeProjections
  return { ctx, projections }
}

describe('doublecheck projection registration lifecycle', () => {
  it('releases the registration on dispose and folds with the new detection on remount', async () => {
    const { ctx, projections } = await mountContext()
    const passingRun = ptcDispatchRun('pnpm test', 'all green')

    const fiber = await ctx.plugin(guardModule, projectionOnlyConfig())
    expect(projections.registrations).toHaveLength(1)
    const first = projections.registrations[0]
    expect(first?.key).toBe('doublecheck')
    // The mounted detection recognises the test command: the passing run folds green.
    expect(first?.apply(first.init(), passingRun).color).toBe('green')

    await fiber.dispose()
    // The registration really is unregistered (disposer ran) - the pre-fix
    // shape dropped it, which is exactly the false-safety window.
    expect(projections.live.size).toBe(0)

    // Remount with a detection that does NOT recognise the same command: the
    // re-registered closure must fold with the NEW detection, not the old one.
    const remounted = await ctx.plugin(guardModule, projectionOnlyConfig({
      testCommandPatterns: ['(?:^|[;&|]\\s*)mocha\\s+run(?:\\s|$)'],
    }))
    expect(projections.registrations).toHaveLength(2)
    const second = projections.registrations[1]
    expect(projections.live.size).toBe(1)
    expect(second?.apply(second.init(), passingRun).color).toBe('none')

    await remounted.dispose()
    expect(projections.live.size).toBe(0)
  })
})
