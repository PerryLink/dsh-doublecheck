import { describe, expect, it } from 'vitest'
import { Context, Service } from '@deepseek-ai/cordis'
import { CallId } from '@deepseek-ai/dsh-llm'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import type { ToolRunContext } from '@deepseek-ai/dsh-tools'
import { WorkflowRunId } from '@deepseek-ai/dsh-workflow'
import type { WorkflowStartRequest } from '@deepseek-ai/dsh-workflow'
import * as grillModule from '../src/grill/index.ts'
import { SPEC_TOOL_NAME } from '../src/domain/stages.ts'
import type { GrilledSpec } from '../src/events.ts'
import { fakeAgent, fakeSession, mutationCall, reviewInjectionEvent, shellCall, shellResult, specToolCall, userTask } from './helpers.ts'

const signal = new AbortController().signal

interface SetupOptions {
  /** Mount the fake workflow engine (for verify tests). */
  workflowChecks?: unknown[] | null
}

async function setup(options: SetupOptions = {}) {
  const ctx = new Context()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(SkillRegistry)
  await ctx.plugin(ToolRuntime)
  const starts: WorkflowStartRequest[] = []
  if (options.workflowChecks !== undefined) {
    class FakeWorkflowEngine extends Service {
      constructor(childCtx: Context) {
        super(childCtx, 'workflowEngine')
      }

      start(request: WorkflowStartRequest) {
        starts.push(request)
        return {
          id: WorkflowRunId('wf-1'),
          meta: request.meta,
          result: Promise.resolve({
            value: { checks: options.workflowChecks ?? [] },
            stopReason: 'completed',
            agentsStarted: 6,
          }),
          cancel() {},
          async dispose() {},
        }
      }
    }
    await ctx.plugin(FakeWorkflowEngine)
  }
  await ctx.plugin(grillModule, { specFile: 'specs/contract.md' })
  return { ctx, starts }
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
  it('validates its config schema with defaults and rejects empty file names', () => {
    expect(grillModule.Config({})).toEqual({
      specFile: 'doublecheck-spec.md',
      reportFile: 'doublecheck-report.md',
      reportVerify: true,
      verifyProvider: 'fork',
      reportTestToolNames: ['bash', 'pwsh'],
      reportTestCommandPatterns: [
        '(?:^|[;&|]\\s*)(?:(?:pnpm|npm|npx|yarn|bun)(?:\\s+run)?\\s+(?:test|vitest|jest|mocha)(?:\\s|$))',
        '(?:^|[;&|]\\s*)(?:(?:pytest|go\\s+test|cargo\\s+test|make\\s+test|ctest)(?:\\s|$))',
        '(?:^|[;&|]\\s*)(?:node\\s+--test(?:\\s|$))',
      ],
      reportMutationTools: ['edit', 'write'],
      reportTestFilePatterns: ['(^|[\\\\/])(tests?|__tests__|specs?)([\\\\/]|$)', '\\.(test|spec)\\.[A-Za-z0-9]+$'],
    })
    expect(() => grillModule.Config({ specFile: '' })).toThrow()
    expect(() => grillModule.Config({ reportFile: '' })).toThrow()
  })

  it('registers the bundled skill on the skill registry', async () => {
    const { ctx } = await setup()
    const summaries = await ctx.skills.list({})
    const skill = summaries.find(summary => summary.name === 'grill-requirements')
    expect(skill).toBeDefined()
    expect(skill?.provider).toBe('doublecheck')
    expect(skill?.source).toBe('bundled')
  })

  it('lists the doublecheck skill catalog through the catalog tool', async () => {
    const { ctx } = await setup()
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
    const { ctx } = await setup()
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
    const { ctx } = await setup()
    const result = await ctx.tools.execute({
      signal,
      callId: CallId('catalog-3'),
      name: 'doublecheck_skills',
      arguments: { name: 'no-such-skill' },
    })
    expect(result.isError).toBe(true)
  })

  it('records a spec without a filesystem seam and reports written: false', async () => {
    const { ctx } = await setup()
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
    const { ctx } = await setup()
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

  // ── v0.4 doublecheck report ──────────────────────────────────────────────

  const reportSession = () => fakeSession([
    userTask('fix the bug in parser.ts'),
    specToolCall(fullSpec as unknown as Record<string, string>, 'spec-1'),
    shellCall('bash', 'pnpm test', 't-1'),
    shellResult('t-1', '[exit code: 1]'),
    mutationCall('edit', 'src/app.ts', 'e-1'),
    shellCall('bash', 'pnpm test', 't-2'),
    shellResult('t-2', '4 passed'),
  ])

  async function runReport(ctx: Context, agent: unknown, args: Record<string, unknown> = {}) {
    return ctx.tools.execute({
      signal,
      callId: CallId('report-1'),
      name: 'doublecheck_report',
      arguments: args,
      agent: agent as never,
    })
  }

  it('folds the session into a report without verification when the seam is missing', async () => {
    const { ctx } = await setup()
    const reviews: unknown[] = []
    ctx.on('doublecheck/report', payload => { reviews.push(payload) })
    const result = await runReport(ctx, fakeAgent(reportSession()))
    expect(result.isError).toBe(false)
    const value = result.value as { verdict: string; spec: unknown; testRuns: { failed: number; passed: number }; edits: number; verification: unknown; written: boolean }
    expect(value.verdict).toBe('green')
    expect(value.spec).toEqual(fullSpec)
    expect(value.testRuns).toEqual({ failed: 1, passed: 1 })
    expect(value.edits).toBe(1)
    expect(value.verification).toBeNull()
    expect(value.written).toBe(false)
    expect(reviews).toHaveLength(1)
  })

  it('skips verification when the caller passes verify false', async () => {
    const { ctx } = await setup()
    const result = await runReport(ctx, fakeAgent(reportSession()), { verify: false })
    const value = result.value as { verdict: string; verification: unknown }
    expect(value.verification).toBeNull()
    expect(value.verdict).toBe('green')
  })

  it('orchestrates the verify workflow and folds its checks into the verdict', async () => {
    const { ctx, starts } = await setup({
      workflowChecks: [
        { dimension: 'goal', verdict: 'pass', evidence: 'spec goal matches', note: '' },
        { dimension: 'scope', verdict: 'pass', evidence: 'scope respected', note: '' },
      ],
    })
    const result = await runReport(ctx, fakeAgent(reportSession()), { verify: true })
    const value = result.value as { verdict: string; verification: { checks: unknown[] } | null }
    expect(starts).toHaveLength(1)
    expect(starts[0]?.meta.name).toBe('doublecheck-verify')
    expect(starts[0]?.subagentProvider).toBe('fork')
    expect(starts[0]?.args).toMatchObject({ spec: fullSpec })
    expect(value.verification?.checks).toHaveLength(2)
    expect(value.verdict).toBe('proven')
  })

  it('marks the report challenged when a verification check fails', async () => {
    const { ctx } = await setup({
      workflowChecks: [
        { dimension: 'goal', verdict: 'pass', evidence: 'ok', note: '' },
        { dimension: 'acceptanceCriteria', verdict: 'fail', evidence: 'never run', note: 'run it' },
      ],
    })
    const result = await runReport(ctx, fakeAgent(reportSession()), { verify: true })
    const value = result.value as { verdict: string }
    expect(value.verdict).toBe('challenged')
  })

  it('derives objections from a durable review record', async () => {
    const { ctx } = await setup()
    const session = reportSession()
    ;(session as unknown as { events: unknown[] }).events.push(reviewInjectionEvent('findings', [{ severity: 'blocker', title: 'unverified', detail: 'no evidence' }]))
    const result = await runReport(ctx, fakeAgent(session))
    const value = result.value as { verdict: string; review: { findings: unknown[] } }
    expect(value.verdict).toBe('objections')
    expect(value.review.findings).toHaveLength(1)
  })
})
