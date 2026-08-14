import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { CallId } from '@deepseek-ai/dsh-llm'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import type { ToolRunContext } from '@deepseek-ai/dsh-tools'
import * as grillModule from '../src/grill/index.ts'
import { SPEC_TOOL_NAME } from '../src/domain/stages.ts'
import type { GrilledSpec } from '../src/events.ts'
import { fakeAgent, fakeSession } from './helpers.ts'

const signal = new AbortController().signal

async function setup() {
  const ctx = new Context()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(SkillRegistry)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(grillModule, { specFile: 'specs/contract.md' })
  return ctx
}

const fullSpec: GrilledSpec = {
  goal: 'Ship the widget.',
  scope: 'Only the widget package.',
  acceptanceCriteria: 'All tests pass.',
  failureModes: 'Invalid input is rejected.',
  priorities: 'Correctness over speed.',
  nonGoals: 'No redesign of the archive format.',
}

describe('doublecheck-grill', () => {
  it('validates its config schema with defaults and rejects empty specFile', () => {
    expect(grillModule.Config({})).toEqual({ specFile: 'doublecheck-spec.md' })
    expect(() => grillModule.Config({ specFile: '' })).toThrow()
  })

  it('registers the bundled skill on the skill registry', async () => {
    const ctx = await setup()
    const summaries = await ctx.skills.list({})
    const skill = summaries.find(summary => summary.name === 'grill-requirements')
    expect(skill).toBeDefined()
    expect(skill?.provider).toBe('doublecheck')
    expect(skill?.source).toBe('bundled')
  })

  it('lists the doublecheck skill catalog through the catalog tool', async () => {
    const ctx = await setup()
    const result = await ctx.tools.execute({
      signal,
      callId: CallId('catalog-1'),
      name: 'doublecheck_skills',
      arguments: {},
    })
    expect(result.isError).toBe(false)
    const value = result.value as { skills: { name: string }[] }
    expect(value.skills.map(skill => skill.name)).toEqual(['grill-requirements'])
    expect(result.content[0]?.type).toBe('text')
  })

  it('loads one skill body through the catalog tool', async () => {
    const ctx = await setup()
    const result = await ctx.tools.execute({
      signal,
      callId: CallId('catalog-2'),
      name: 'doublecheck_skills',
      arguments: { name: 'grill-requirements' },
    })
    expect(result.isError).toBe(false)
    const value = result.value as { content?: string; provider?: string }
    expect(value.content).toContain('grill-requirements')
    expect(value.provider).toBe('doublecheck')
  })

  it('fails loudly for an unknown skill name', async () => {
    const ctx = await setup()
    const result = await ctx.tools.execute({
      signal,
      callId: CallId('catalog-3'),
      name: 'doublecheck_skills',
      arguments: { name: 'no-such-skill' },
    })
    expect(result.isError).toBe(true)
  })

  it('records a spec without a filesystem seam and reports written: false', async () => {
    const ctx = await setup()
    const result = await ctx.tools.execute({
      signal,
      callId: CallId('spec-1'),
      name: SPEC_TOOL_NAME,
      arguments: { ...fullSpec },
    })
    expect(result.isError).toBe(false)
    expect(result.value).toEqual({
      spec: fullSpec,
      path: null,
      written: false,
    })
  })

  it('announces the committed spec on the package-internal event with the calling session', async () => {
    const ctx = await setup()
    const session = fakeSession([])
    const agent = fakeAgent(session)
    const announcements: unknown[] = []
    ctx.on('doublecheck/spec', payload => { announcements.push(payload) })
    const tool = ctx.tools.get(SPEC_TOOL_NAME)
    expect(tool).toBeDefined()
    await tool!.execute({ ...fullSpec }, { agent, signal } as unknown as ToolRunContext)
    expect(announcements).toHaveLength(1)
    const payload = announcements[0] as { session: unknown; spec: GrilledSpec; written: boolean }
    expect(payload.session).toBe(session)
    expect(payload.spec).toEqual(fullSpec)
    expect(payload.written).toBe(false)
  })

  it('renders the spec document with all six sections', () => {
    const markdown = grillModule.renderSpecMarkdown(fullSpec)
    expect(markdown).toContain('# Doublecheck spec')
    expect(markdown).toContain('## Goal')
    expect(markdown).toContain('## Scope')
    expect(markdown).toContain('## Acceptance criteria')
    expect(markdown).toContain('## Failure modes')
    expect(markdown).toContain('## Priorities')
    expect(markdown).toContain('## Non-goals')
    expect(markdown).toContain('Ship the widget.')
  })
})
