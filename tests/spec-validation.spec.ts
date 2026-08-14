import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { CallId } from '@deepseek-ai/dsh-llm'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import * as grillModule from '../src/grill/index.ts'
import { SPEC_TOOL_NAME } from '../src/domain/stages.ts'
import type { GrilledSpec } from '../src/events.ts'

const signal = new AbortController().signal

async function setup() {
  const ctx = new Context()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(SkillRegistry)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(grillModule, { specFile: 'specs/contract.md' })
  return { ctx }
}

const fullSpec: GrilledSpec = {
  goal: 'Ship the widget.',
  scope: 'Only the widget package.',
  acceptanceCriteria: 'All tests pass.',
  failureModes: 'Invalid input is rejected.',
  priorities: 'Correctness over speed.',
  nonGoals: 'No redesign of the archive format.',
}

/**
 * The spec tool commits a contract: an empty dimension means the grill has
 * not settled that requirement, so the call must fail instead of recording a
 * hollow spec. The parameter DSL has no minLength keyword, so the check lives
 * in the tool's execute.
 */
describe('doublecheck_spec field validation', () => {
  it('accepts a fully settled spec', async () => {
    const { ctx } = await setup()
    const result = await ctx.tools.execute({
      signal,
      callId: CallId('spec-ok'),
      name: SPEC_TOOL_NAME,
      arguments: { ...fullSpec },
    })
    expect(result.isError).toBe(false)
    expect((result.value as { spec: unknown }).spec).toEqual(fullSpec)
  })

  for (const field of ['goal', 'scope', 'acceptanceCriteria', 'failureModes', 'priorities', 'nonGoals'] as const) {
    it(`rejects an empty "${field}"`, async () => {
      const { ctx } = await setup()
      const result = await ctx.tools.execute({
        signal,
        callId: CallId(`spec-empty-${field}`),
        name: SPEC_TOOL_NAME,
        arguments: { ...fullSpec, [field]: '' },
      })
      expect(result.isError).toBe(true)
    })

    it(`rejects a whitespace-only "${field}"`, async () => {
      const { ctx } = await setup()
      const result = await ctx.tools.execute({
        signal,
        callId: CallId(`spec-blank-${field}`),
        name: SPEC_TOOL_NAME,
        arguments: { ...fullSpec, [field]: '   \n\t ' },
      })
      expect(result.isError).toBe(true)
    })
  }

  it('does not announce a rejected spec', async () => {
    const { ctx } = await setup()
    const announcements: unknown[] = []
    ctx.on('doublecheck/spec', payload => { announcements.push(payload) })
    const result = await ctx.tools.execute({
      signal,
      callId: CallId('spec-rejected'),
      name: SPEC_TOOL_NAME,
      arguments: { ...fullSpec, nonGoals: '' },
    })
    expect(result.isError).toBe(true)
    expect(announcements).toHaveLength(0)
  })
})
