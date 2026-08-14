/**
 * The discipline guard: dsh-doublecheck's soft enforcement plugin.
 *
 * When a session's task statement is vague and no `doublecheck_spec` has been
 * committed yet, a model heading for a mutation tool (`edit` / `write` by
 * default) is intercepted on the documented `tools/pre-execute` /
 * `tools/post-execute` extension points. The configured `intensity` picks the
 * consequence:
 *
 * - `remind`: the call proceeds; a reminder rides the call's
 *   `additionalContexts`, so the agent loop records it as a `user/message`
 *   session event (model-visible ⟺ logged).
 * - `warn`: the call is held for human approval through the approval seam
 *   (`ask`); without an approval channel it denies.
 * - `block`: the call is denied with corrective feedback.
 *
 * All state derives from the session log (the durable source of truth), so a
 * resumed or forked session enforces identically. The package-internal
 * `doublecheck/reminder` event announces each reaction for observers.
 *
 * @module dsh-doublecheck/guard
 */

import type { Context } from '@deepseek-ai/cordis'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { MessageSource } from '@deepseek-ai/dsh-llm'
import type { Session, SessionEvent, UserMessage } from '@deepseek-ai/dsh-session'
import type { PostToolDecision, PreToolDecision, ToolExecution } from '@deepseek-ai/dsh-tools'
import z from '@deepseek-ai/schemastery'
import type Schema from '@deepseek-ai/schemastery'
import { sessionHasSpec } from '../domain/stages.ts'
import { isVagueTask } from '../domain/vagueness.ts'
import type { GuardIntensity } from '../events.ts'

export const name = 'doublecheck-guard'

/**
 * Guard configuration. `intensity` and the `modules` switches are the
 * deployment-facing knobs; the module boundary for `tdd` (v0.2) and
 * `adversary` (v0.3) exists today so configs written now survive those
 * versions, and enabling either in this build fails loud.
 */
export interface Config {
  /** Enforcement strength of the requirements guard. */
  intensity: GuardIntensity
  /** Discipline module switches; `tdd` and `adversary` are reserved for v0.2/v0.3. */
  modules: {
    grill: boolean
    tdd: boolean
    adversary: boolean
  }
  /** Model route for the future adversary critic; null means the main model self-reviews. Reserved for v0.3. */
  adversaryModel: string | null
  /** Mutation tool names the guard watches (default `edit`, `write`). */
  guardTools: string[]
  /** Task text longer than this many characters is never treated as vague. */
  vagueTaskMaxChars: number
  /** Inject the reminder at most once per session. */
  remindOnce: boolean
}

export const Config: Schema<Config> = z.object({
  intensity: z.union(['remind', 'warn', 'block'] as const).default('remind'),
  modules: z.object({
    grill: z.boolean().default(true),
    tdd: z.boolean().default(false),
    adversary: z.boolean().default(false),
  }).default({ grill: true, tdd: false, adversary: false }),
  adversaryModel: z.union([z.string(), z.const(null)]).default(null),
  guardTools: z.array(z.string()).default(['edit', 'write']),
  vagueTaskMaxChars: z.number().default(200),
  remindOnce: z.boolean().default(true),
})

/** Reminder prose injected under `intensity: remind` (and after held/denied calls). */
const REMINDER_TEXT =
  'Double-check before you ship: this task is brief and no doublecheck spec '
  + 'has been recorded for it yet. Pause the edit and settle the six '
  + 'requirement dimensions first — goal, scope, acceptance criteria, failure '
  + 'modes, priorities, non-goals. Follow the grill-requirements skill: ask '
  + 'the user with the ask_user_question tool until consensus, record the '
  + 'result with doublecheck_spec, and only then resume editing.'

/** Denial feedback under `intensity: block`. */
const DENY_REASON =
  'Blocked by the dsh-doublecheck requirements guard: the task statement is '
  + 'vague and no doublecheck_spec exists for this session. Run the '
  + 'requirements grill first (grill-requirements skill → ask_user_question → '
  + 'doublecheck_spec), then retry this call.'

/** Approval question under `intensity: warn`. */
const ASK_REASON =
  'The task statement is vague and no doublecheck spec exists for this '
  + 'session. Allow this edit before the requirements grill has run?'

/** Cached per-session guard facts, valid while the event log has not grown. */
interface Snapshot {
  eventsLength: number
  vague: boolean
  hasSpec: boolean
}

/**
 * Install the guard listeners.
 * @param ctx - plugin context; listeners unwind with it.
 * @param config - validated {@link Config}; reserved-module misuse fails loud here.
 */
export function apply(ctx: Context, config: Config): void {
  if (config.modules.tdd) {
    throw new Error('dsh-doublecheck: modules.tdd is reserved for v0.2 and cannot be enabled in this version')
  }
  if (config.modules.adversary) {
    throw new Error('dsh-doublecheck: modules.adversary is reserved for v0.3 and cannot be enabled in this version')
  }
  if ((config.adversaryModel ?? null) !== null) {
    throw new Error('dsh-doublecheck: adversaryModel requires the adversary module, which is reserved for v0.3')
  }
  assertPositiveInteger('vagueTaskMaxChars', config.vagueTaskMaxChars)
  assertGuardTools(config.guardTools)

  if (!config.modules.grill) {
    ctx.logger.info('dsh-doublecheck: grill discipline disabled (modules.grill = false); the guard contributes nothing')
    return
  }

  const guardToolSet = new Set(config.guardTools)
  const snapshots = new WeakMap<Session, Snapshot>()
  /** Reminder queued at pre-execute, attached to the same execution at post-execute. */
  const pendingReminders = new WeakMap<ToolExecution, UserMessage>()
  /** Sessions that already received a reminder, for `remindOnce`. */
  const remindedSessions = new WeakSet<Session>()

  /** Fold the session log to its current guard facts, cached by log length. */
  function snapshotOf(session: Session): Snapshot {
    const cached = snapshots.get(session)
    if (cached !== undefined && cached.eventsLength === session.events.length) return cached
    const snapshot: Snapshot = {
      eventsLength: session.events.length,
      vague: isVagueTask(latestUserTaskText(session.events), config),
      hasSpec: sessionHasSpec(session.events),
    }
    snapshots.set(session, snapshot)
    return snapshot
  }

  /** The reminder message for this reaction, or undefined when already reminded. */
  function nextReminder(session: Session): UserMessage | undefined {
    if (config.remindOnce && remindedSessions.has(session)) return undefined
    remindedSessions.add(session)
    const source: MessageSource = {
      kind: 'plugin',
      plugin: 'dsh-doublecheck',
      form: 'notice',
      summary: 'requirements check',
    }
    return createUserMessage({
      content: [{ type: 'text', text: REMINDER_TEXT }],
      source,
    })
  }

  // The policy gate. Observe-and-decide: a session with a committed spec or a
  // concrete task delegates untouched; a guard-worthy call reacts per
  // intensity. Returning without `next()` for warn/block is the deliberate
  // veto — `remind` always delegates.
  ctx.on('tools/pre-execute', async (exec, next): Promise<PreToolDecision> => {
    const agent = exec.agent
    if (agent === undefined || !guardToolSet.has(exec.name)) return next()
    const snapshot = snapshotOf(agent.session)
    if (snapshot.hasSpec || !snapshot.vague) return next()

    const reminder = nextReminder(agent.session)
    if (reminder !== undefined) pendingReminders.set(exec, reminder)

    switch (config.intensity) {
      case 'remind': {
        ctx.emit('doublecheck/reminder', {
          agent,
          session: agent.session,
          toolName: exec.name,
          intensity: config.intensity,
          verdict: 'reminded',
          ...reminder !== undefined ? { reminder: REMINDER_TEXT } : {},
        })
        return next()
      }
      case 'warn': {
        ctx.emit('doublecheck/reminder', {
          agent,
          session: agent.session,
          toolName: exec.name,
          intensity: config.intensity,
          verdict: 'held',
        })
        return { kind: 'ask', reason: ASK_REASON }
      }
      case 'block': {
        ctx.emit('doublecheck/reminder', {
          agent,
          session: agent.session,
          toolName: exec.name,
          intensity: config.intensity,
          verdict: 'denied',
        })
        return { kind: 'deny', reason: DENY_REASON }
      }
      /* v8 ignore next -- GuardIntensity is a closed union; a future member must fail compilation here. */
      default:
        return assertNever(config.intensity, 'guard intensity')
    }
  })

  // Observe-and-enrich, never veto: delegate first, then fold the queued
  // reminder onto whatever decision came back. Denied and held calls flow
  // through this same waterfall, so their reminders ride too.
  ctx.on('tools/post-execute', async (exec, _result, next): Promise<PostToolDecision> => {
    const downstream = await next()
    const reminder = pendingReminders.get(exec)
    if (reminder === undefined) return downstream
    pendingReminders.delete(exec)
    if (downstream.kind === 'block') {
      return {
        kind: 'block',
        feedback: downstream.feedback,
        additionalContexts: prependContext(reminder, downstream.additionalContexts),
      }
    }
    return { ...downstream, additionalContexts: prependContext(reminder, downstream.additionalContexts) }
  })
}

/** Prepend our reminder while preserving every downstream context's source and metadata. */
function prependContext(ours: UserMessage, theirs: UserMessage[] | undefined): UserMessage[] {
  return [ours, ...theirs ?? []]
}

/** The latest direct-user task text in the log, or '' before any user message. */
function latestUserTaskText(events: readonly SessionEvent[]): string {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]
    /* v8 ignore next -- the loop bounds prove this index exists. */
    if (event === undefined) continue
    if (event.type !== 'user/message') continue
    if ((event.data.source as { kind?: unknown }).kind !== 'user') continue
    const parts: string[] = []
    for (const block of event.data.content) {
      if (block.type === 'text') parts.push(block.text)
    }
    if (parts.length > 0) return parts.join('\n')
  }
  return ''
}

function assertPositiveInteger(field: string, value: number): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`dsh-doublecheck: ${field} must be an integer >= 1`)
  }
}

/** Validate the guard-tool list fail-loud: non-empty, non-empty names, no duplicates. */
function assertGuardTools(tools: string[]): void {
  if (tools.length === 0) {
    throw new Error('dsh-doublecheck: guardTools must not be empty')
  }
  for (const tool of tools) {
    if (tool.length === 0) {
      throw new Error('dsh-doublecheck: guardTools must not contain empty tool names')
    }
  }
  if (new Set(tools).size !== tools.length) {
    throw new Error('dsh-doublecheck: guardTools must not contain duplicates')
  }
}

/** Closed-union exhaustiveness guard for the intensity switch. */
function assertNever(value: never, subject: string): never {
  throw new Error(`dsh-doublecheck: unknown ${subject} "${String(value)}"`)
}
