/**
 * The grill module: dsh-doublecheck's requirements-furnace plugin.
 *
 * Registers the bundled `skills/` directory on the DSH skill registry (the
 * official skill capability seam), exposes the model-facing catalog/loader
 * tool `doublecheck_skills`, and provides the two contract tools:
 * `doublecheck_spec` (commit a grilled requirements spec to the session log
 * and a workspace markdown file) and `doublecheck_report` (v0.4: consolidate
 * the session's discipline evidence into a delivery report, optionally
 * orchestrating a per-dimension verification workflow through the DSH
 * workflow seam).
 *
 * @module dsh-doublecheck/grill
 */

import type { Context } from '@deepseek-ai/cordis'
import type { FsTarget } from '@deepseek-ai/dsh-fs'
import type { WorkflowRun } from '@deepseek-ai/dsh-workflow'
import { renderSkillContent } from '@deepseek-ai/dsh-skill'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolRunContext } from '@deepseek-ai/dsh-tools'
import z from '@deepseek-ai/schemastery'
import type Schema from '@deepseek-ai/schemastery'
import type { GrilledSpec, VerifyCheck } from '../events.ts'
import {
  DEFAULT_MUTATION_TOOLS,
  DEFAULT_TEST_COMMAND_PATTERNS,
  DEFAULT_TEST_FILE_PATTERNS,
  DEFAULT_TEST_TOOL_NAMES,
  compileDetection,
} from '../domain/evidence.ts'
import { SPEC_TOOL_NAME } from '../domain/stages.ts'
import {
  buildVerifyScript,
  deriveReportVerdict,
  foldReportFacts,
  renderReportMarkdown,
  VERIFY_META,
  type ReportData,
} from '../domain/report.ts'
import { VERIFY_DIMENSIONS } from '../domain/vocabulary.ts'
import { BundledSkillProvider, PROVIDER_NAME } from './provider.ts'

export const name = 'doublecheck-grill'
export const inject = ['skills', 'tools']

/** Grill module configuration. */
export interface Config {
  /** Workspace file (relative to the session cwd) that receives the spec markdown. */
  specFile: string
  /** Workspace file (relative to the session cwd) that receives the report markdown. */
  reportFile: string
  /** Whether the report runs the verify workflow when the caller does not choose. */
  reportVerify: boolean
  /** Subagent provider the verify workflow's checkers run on. */
  verifyProvider: string
  /** Report-scoped knobs: shell tools whose commands may be test runs. */
  reportTestToolNames: string[]
  /** Report-scoped knobs: commands that count as test runs. */
  reportTestCommandPatterns: string[]
  /** Report-scoped knobs: mutation tools counted as implementation edits. */
  reportMutationTools: string[]
  /** Report-scoped knobs: paths identifying test files (not implementation edits). */
  reportTestFilePatterns: string[]
}

export const Config: Schema<Config> = z.object({
  specFile: z.string().min(1).default('doublecheck-spec.md'),
  reportFile: z.string().min(1).default('doublecheck-report.md'),
  reportVerify: z.boolean().default(true),
  verifyProvider: z.string().min(1).default('fork'),
  reportTestToolNames: z.array(z.string()).default([...DEFAULT_TEST_TOOL_NAMES]),
  reportTestCommandPatterns: z.array(z.string()).default([...DEFAULT_TEST_COMMAND_PATTERNS]),
  reportMutationTools: z.array(z.string()).default([...DEFAULT_MUTATION_TOOLS]),
  reportTestFilePatterns: z.array(z.string()).default([...DEFAULT_TEST_FILE_PATTERNS]),
})

/** Model-facing catalog of the package's own skills, one line per skill. */
function renderCatalog(skills: readonly { name: string; description: string }[]): string {
  if (skills.length === 0) return 'No doublecheck skills are currently available.'
  return [
    'The following doublecheck discipline skills are available:',
    ...skills.map(skill => `- \`${skill.name}\`: ${skill.description}`),
  ].join('\n')
}

/** The rendered spec document written to the workspace and shown to the model. */
export function renderSpecMarkdown(spec: GrilledSpec): string {
  return [
    '# Doublecheck spec',
    '',
    '## Goal',
    spec.goal,
    '',
    '## Scope',
    spec.scope,
    '',
    '## Acceptance criteria',
    spec.acceptanceCriteria,
    '',
    '## Failure modes',
    spec.failureModes,
    '',
    '## Priorities',
    spec.priorities,
    '',
    '## Non-goals',
    spec.nonGoals,
    '',
  ].join('\n')
}

/** FsTarget narrowed to the fields the spec writer reports back. */
type SpecWriteOutcome = { path: string | null; written: boolean }

/** The six spec dimensions, in record order. */
const SPEC_FIELDS = ['goal', 'scope', 'acceptanceCriteria', 'failureModes', 'priorities', 'nonGoals'] as const

/**
 * Install the grill module: bundled skill provider plus its three tools.
 * @param ctx - plugin context; registrations unwind with it.
 * @param config - validated {@link Config}.
 */
export function apply(ctx: Context, config: Config): void {
  ctx.skills.registerProvider(() => new BundledSkillProvider(ctx))

  const reportDetection = compileDetection({
    testToolNames: config.reportTestToolNames,
    testCommandPatterns: config.reportTestCommandPatterns,
    guardTools: config.reportMutationTools,
    testFilePatterns: config.reportTestFilePatterns,
  })

  ctx.tools.register(defineTool({
    name: 'doublecheck_skills',
    description: 'List the doublecheck engineering-discipline skills, or load the full instructions of one by its exact name. Call this before acting on a task that names or clearly matches one of them.',
    parameters: {
      name: {
        type: 'string',
        description: 'Exact skill name to load; omit to list every available doublecheck skill.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          skills: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                name: { type: 'string', required: true },
                description: { type: 'string', required: true },
                whenToUse: { type: 'string' },
              },
            },
          },
          name: { type: 'string' },
          provider: { type: 'string' },
          resourceBase: {
            type: 'object',
            additionalProperties: false,
            properties: {
              kind: { type: 'string', required: true, const: 'directory' },
              path: { type: 'string', required: true },
            },
          },
          content: { type: 'string' },
        },
      },
      render: (_args, value) => {
        if (value.content === undefined || value.provider === undefined) {
          return [{ type: 'text', text: renderCatalog(value.skills) }]
        }
        const name = value.name ?? _args.name ?? ''
        const loaded = renderSkillContent({
          name,
          provider: value.provider,
          ...value.resourceBase !== undefined ? { resourceBase: value.resourceBase } : {},
          content: value.content,
        })
        return [{ type: 'text', text: loaded }]
      },
    },
    async execute(args, exec) {
      const lookup = { cwd: exec.agent?.session.header.cwd, signal: exec.signal, scope: exec.agent }
      const summaries = (await ctx.skills.list(lookup)).filter(skill => skill.provider === PROVIDER_NAME)
      const skills = summaries.map(({ name: skillName, description, whenToUse }) => ({
        name: skillName,
        description,
        ...whenToUse !== undefined ? { whenToUse } : {},
      }))
      if (args.name === undefined) return { skills }
      const skill = await ctx.skills.get(args.name, lookup)
      if (skill === undefined || skill.provider !== PROVIDER_NAME) {
        throw new Error(`skill "${args.name}" is not a doublecheck skill or is no longer available`)
      }
      const resourceBase: { kind: 'directory'; path: string } | undefined =
        skill.resourceBase !== undefined && skill.resourceBase.kind === 'directory'
          ? { kind: 'directory', path: skill.resourceBase.path }
          : undefined
      return {
        skills,
        name: skill.name,
        provider: skill.provider,
        ...resourceBase !== undefined ? { resourceBase } : {},
        content: skill.content,
      }
    },
    presentCall(args) {
      return args.name === undefined
        ? { card: 'generic', title: 'List doublecheck skills', kind: 'read' }
        : { card: 'generic', title: `Load skill ${args.name}`, kind: 'read', rawInput: args.name }
    },
  }))

  ctx.tools.register(defineTool({
    name: SPEC_TOOL_NAME,
    description: 'Record the grilled requirements spec for the current task. Fill all six fields after the requirements grill reaches consensus (goal, scope, acceptance criteria, failure modes, priorities, non-goals), so the contract is kept in the session and written to the workspace before implementation starts.',
    parameters: {
      goal: { type: 'string', required: true, description: 'What outcome the work must produce, in one verifiable sentence.' },
      scope: { type: 'string', required: true, description: 'What is in scope and what is out of scope for this change.' },
      acceptanceCriteria: { type: 'string', required: true, description: 'Observable checks that prove the work is done.' },
      failureModes: { type: 'string', required: true, description: 'What can go wrong and the correct behavior in each case.' },
      priorities: { type: 'string', required: true, description: 'What to trade when goals conflict; what is optional.' },
      nonGoals: { type: 'string', required: true, description: 'What the user explicitly does not want.' },
      filePath: { type: 'string', description: 'Optional workspace path for the markdown copy. Defaults to the configured spec file in the session working directory.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          spec: {
            type: 'object',
            required: true,
            additionalProperties: false,
            properties: {
              goal: { type: 'string', required: true },
              scope: { type: 'string', required: true },
              acceptanceCriteria: { type: 'string', required: true },
              failureModes: { type: 'string', required: true },
              priorities: { type: 'string', required: true },
              nonGoals: { type: 'string', required: true },
            },
          },
          path: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
          written: { type: 'boolean', required: true },
        },
      },
      render: (_args, value) => {
        const note = value.written
          ? `Recorded to ${value.path}.`
          : 'No workspace copy was written; the spec is recorded in this session only.'
        return [{ type: 'text', text: `${renderSpecMarkdown(value.spec)}\n${note}` }]
      },
    },
    async execute(args, exec) {
      // An empty dimension is an unsettled one: the grill has not reached
      // consensus. Reject it instead of committing a hollow contract (the
      // parameter schema cannot express minLength, so the check lives here).
      for (const field of SPEC_FIELDS) {
        if (args[field].trim().length === 0) {
          throw new Error(`doublecheck_spec: the "${field}" field must not be empty — settle all six requirement dimensions before recording the spec`)
        }
      }
      const spec: GrilledSpec = {
        goal: args.goal,
        scope: args.scope,
        acceptanceCriteria: args.acceptanceCriteria,
        failureModes: args.failureModes,
        priorities: args.priorities,
        nonGoals: args.nonGoals,
      }
      const outcome = await writeSpecFile(ctx, spec, args.filePath ?? config.specFile, exec)
      if (exec.agent !== undefined) {
        ctx.emit('doublecheck/spec', { session: exec.agent.session, spec, ...outcome })
      }
      return { spec, ...outcome }
    },
    presentCall(args) {
      return {
        card: 'generic',
        title: 'Record doublecheck spec',
        kind: 'edit',
        content: [{ type: 'text', text: args.goal.length > 240 ? `${args.goal.slice(0, 240)}…` : args.goal }],
      }
    },
  }))

  ctx.tools.register(defineTool({
    name: 'doublecheck_report',
    description: 'Consolidate this session\'s doublecheck discipline evidence into a delivery report: the committed spec, the red/green test timeline, the adversary review record, and a derived verdict. With verify enabled, orchestrates one parallel checker per spec dimension through the workflow seam and folds their verdicts in. The report is written to the workspace and returned as this call\'s result.',
    parameters: {
      filePath: { type: 'string', description: 'Optional workspace path for the markdown copy. Defaults to the configured report file in the session working directory.' },
      verify: { type: 'boolean', description: 'Whether to run the per-dimension verification workflow. Defaults to the configured reportVerify.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          verdict: {
            type: 'string',
            required: true,
            enum: ['grill', 'draft', 'red', 'green', 'objections', 'verified', 'proven', 'challenged'],
          },
          spec: {
            oneOf: [
              {
                type: 'object',
                additionalProperties: false,
                properties: {
                  goal: { type: 'string', required: true },
                  scope: { type: 'string', required: true },
                  acceptanceCriteria: { type: 'string', required: true },
                  failureModes: { type: 'string', required: true },
                  priorities: { type: 'string', required: true },
                  nonGoals: { type: 'string', required: true },
                },
              },
              { type: 'null' },
            ],
            required: true,
          },
          testRuns: {
            type: 'object',
            required: true,
            additionalProperties: false,
            properties: {
              failed: { type: 'integer', required: true },
              passed: { type: 'integer', required: true },
            },
          },
          timeline: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                kind: { type: 'string', required: true, enum: ['spec', 'red', 'green', 'review'] },
                detail: { type: 'string', required: true },
              },
            },
          },
          edits: { type: 'integer', required: true },
          review: {
            oneOf: [
              {
                type: 'object',
                additionalProperties: false,
                properties: {
                  verdict: { type: 'string', required: true, enum: ['findings', 'clean', 'unavailable'] },
                  findings: {
                    type: 'array',
                    required: true,
                    items: {
                      type: 'object',
                      additionalProperties: false,
                      properties: {
                        severity: { type: 'string', required: true, enum: ['blocker', 'major', 'minor', 'info'] },
                        title: { type: 'string', required: true },
                        detail: { type: 'string', required: true },
                      },
                    },
                  },
                },
              },
              { type: 'null' },
            ],
            required: true,
          },
          verification: {
            oneOf: [
              {
                type: 'object',
                additionalProperties: false,
                properties: {
                  checks: {
                    type: 'array',
                    required: true,
                    items: {
                      type: 'object',
                      additionalProperties: false,
                      properties: {
                        dimension: { type: 'string', required: true, enum: [...VERIFY_DIMENSIONS] },
                        verdict: { type: 'string', required: true, enum: ['pass', 'fail'] },
                        evidence: { type: 'string', required: true },
                        note: { type: 'string', required: true },
                      },
                    },
                  },
                },
              },
              { type: 'null' },
            ],
            required: true,
          },
          path: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
          written: { type: 'boolean', required: true },
        },
      },
      render: (_args, value) => {
        const note = value.written
          ? `Recorded to ${value.path}.`
          : 'No workspace copy was written; the report is returned in this result only.'
        return [{ type: 'text', text: `${renderReportMarkdown(value as unknown as ReportData)}\n${note}` }]
      },
    },
    async execute(args, exec) {
      const session = exec.agent?.session
      const facts = session === undefined
        ? { spec: null, testRuns: { failed: 0, passed: 0 }, timeline: [], edits: 0, review: null }
        : foldReportFacts(session.events, reportDetection)
      const verify = args.verify ?? config.reportVerify
      const checks = verify
        ? await runVerifyWorkflow(ctx, config, facts.spec, exec)
        : null
      const report: ReportData = {
        ...facts,
        verdict: deriveReportVerdict(facts, checks),
        verification: checks === null ? null : { checks },
        path: null,
        written: false,
      }
      const outcome = await writeReportFile(ctx, report, args.filePath ?? config.reportFile, exec)
      report.path = outcome.path
      report.written = outcome.written
      if (session !== undefined) {
        ctx.emit('doublecheck/report', { session, verdict: report.verdict, checks, path: report.path, written: report.written })
      }
      return report
    },
    presentCall(args) {
      return {
        card: 'generic',
        title: 'Assemble doublecheck report',
        kind: 'read',
        content: [{ type: 'text', text: args.verify === true ? 'verifying delivery' : 'folding session evidence' }],
      }
    },
  }))
}

/**
 * Run the per-dimension verification workflow through the workflow seam,
 * when one is mounted. A missing seam or a non-completed run settles as
 * `null` (no verification) — the report states it did not run.
 */
async function runVerifyWorkflow(
  ctx: Context,
  config: Config,
  spec: GrilledSpec | null,
  exec: ToolRunContext,
): Promise<VerifyCheck[] | null> {
  if (spec === null || exec.agent === undefined) return null
  const engine = ctx.get('workflowEngine')
  if (engine === undefined) {
    ctx.logger.warn('dsh-doublecheck: verification skipped: the workflowEngine seam is not mounted')
    return null
  }
  let run: WorkflowRun
  try {
    run = engine.start({
      script: buildVerifyScript(),
      meta: VERIFY_META,
      args: { spec, dimensions: [...VERIFY_DIMENSIONS] },
      subagentProvider: config.verifyProvider,
      maxTotalAgents: VERIFY_DIMENSIONS.length,
      parent: exec.agent,
      signal: exec.signal,
    })
  } catch (error) {
    // Invalid script/meta or an absent verify provider: verification did not
    // run, and the report states so instead of failing the report itself.
    ctx.logger.warn(`dsh-doublecheck: verification workflow rejected: ${String(error)}`)
    return null
  }
  try {
    const result = await run.result
    if (result.stopReason !== 'completed') return null
    const value = result.value as { checks?: unknown } | null | undefined
    if (value === null || value === undefined || !Array.isArray(value.checks)) return null
    const checks: VerifyCheck[] = []
    for (const check of value.checks as VerifyCheck[]) {
      if (!VERIFY_DIMENSIONS.includes(check.dimension)) continue
      checks.push(check)
    }
    return checks
  } finally {
    await run.dispose()
  }
}

/** Write the report markdown through the filesystem seam, when one exists. */
async function writeReportFile(
  ctx: Context,
  report: ReportData,
  filePath: string,
  exec: ToolRunContext,
): Promise<SpecWriteOutcome> {
  const fs = ctx.get('fs')
  if (fs === undefined) return { path: null, written: false }
  let target: FsTarget
  try {
    target = await fs.resolve(filePath, {
      ...exec.agent?.session.header.cwd !== undefined ? { cwd: exec.agent.session.header.cwd } : {},
      signal: exec.signal,
    })
    await fs.writeText(target, renderReportMarkdown(report), undefined, exec.signal)
  } catch (error) {
    // Any write failure leaves the report in the tool result (the durable
    // snapshot); the outcome reports `written: false` instead of failing.
    exec.signal.throwIfAborted()
    ctx.logger.debug(`dsh-doublecheck: report file write skipped: ${String(error)}`)
    return { path: null, written: false }
  }
  return { path: target.displayPath, written: true }
}

/** Write the spec markdown through the filesystem seam, when one exists. */
async function writeSpecFile(
  ctx: Context,
  spec: GrilledSpec,
  filePath: string,
  exec: ToolRunContext,
): Promise<SpecWriteOutcome> {
  const fs = ctx.get('fs')
  if (fs === undefined) return { path: null, written: false }
  let target: FsTarget
  try {
    target = await fs.resolve(filePath, {
      ...exec.agent?.session.header.cwd !== undefined ? { cwd: exec.agent.session.header.cwd } : {},
      signal: exec.signal,
    })
    await fs.writeText(target, renderSpecMarkdown(spec), undefined, exec.signal)
  } catch (error) {
    // Any write failure leaves the spec recorded in the session (the tool
    // result is the durable snapshot); the outcome reports `written: false`
    // instead of failing the commit.
    exec.signal.throwIfAborted()
    ctx.logger.debug(`dsh-doublecheck: spec file write skipped: ${String(error)}`)
    return { path: null, written: false }
  }
  return { path: target.displayPath, written: true }
}
