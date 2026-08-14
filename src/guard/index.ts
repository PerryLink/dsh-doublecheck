/**
 * The discipline guard: dsh-doublecheck's soft enforcement plugin.
 *
 * Two gates compose on the documented `tools/pre-execute` /
 * `tools/post-execute` / `agent/turn-stopping` extension points, both reading
 * their facts from the durable session log alone:
 *
 * - **Grill gate** (`modules.grill`): a vague task with no committed
 *   `doublecheck_spec` may not mutate implementation files.
 * - **Red/green gate** (`modules.tdd`, v0.2): an implementation edit requires
 *   a failing test run on record since the last passing run (the red step);
 *   at turn end, edits without a passing run re-arm the green reminder.
 *   Writing test files is always allowed — that is how the red step happens.
 *
 * The configured `intensity` picks the consequence for both gates:
 *
 * - `remind`: the call proceeds; a reminder rides the call's
 *   `additionalContexts`, so the agent loop records it as a `user/message`
 *   session event (model-visible ⟺ logged).
 * - `warn`: the call is held for human approval through the approval seam
 *   (`ask`); without an approval channel it denies.
 * - `block`: the call is denied with corrective feedback.
 *
 * Resumed and forked sessions enforce identically. The package-internal
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
import { compileDetection, isTestFilePath, mutationTargetPath, type TestRunDetection } from '../domain/evidence.ts'
import { emptyDisciplineState, foldDisciplineRange, type DisciplineState } from '../domain/stages.ts'
import { isVagueTask } from '../domain/vagueness.ts'
import type { GuardIntensity } from '../events.ts'

export const name = 'doublecheck-guard'

/**
 * Guard configuration. `intensity` is shared by both gates; `modules` selects
 * them. The `adversary` boundary (v0.3) exists so configs written now survive
 * that version, and enabling it in this build fails loud.
 */
export interface Config {
  /** Enforcement strength of the grill and red/green gates. */
  intensity: GuardIntensity
  /** Discipline module switches; `adversary` is reserved for v0.3. */
  modules: {
    grill: boolean
    tdd: boolean
    adversary: boolean
  }
  /** Model route for the future adversary critic; null means the main model self-reviews. Reserved for v0.3. */
  adversaryModel: string | null
  /** Mutation tool names both gates watch (default `edit`, `write`). */
  guardTools: string[]
  /** Task text longer than this many characters is never treated as vague. */
  vagueTaskMaxChars: number
  /** Inject each gate's reminder at most once per session. */
  remindOnce: boolean
  /** Shell tool names that can run tests (default `bash`, `pwsh`). */
  testToolNames: string[]
  /** Regexes a shell command must match to count as a test run. */
  testCommandPatterns: string[]
  /** Regexes identifying test-file paths, exempt from the red gate. */
  testFilePatterns: string[]
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
  testToolNames: z.array(z.string()).default(['bash', 'pwsh']),
  testCommandPatterns: z.array(z.string()).default([
    '(?:^|[;&|]\\s*)(?:(?:pnpm|npm|npx|yarn|bun)(?:\\s+run)?\\s+(?:test|vitest|jest|mocha)(?:\\s|$))',
    '(?:^|[;&|]\\s*)(?:(?:pytest|go\\s+test|cargo\\s+test|make\\s+test|ctest)(?:\\s|$))',
    '(?:^|[;&|]\\s*)(?:node\\s+--test(?:\\s|$))',
  ]),
  testFilePatterns: z.array(z.string()).default([
    '(^|[\\\\/])(tests?|__tests__|specs?)([\\\\/]|$)',
    '\\.(test|spec)\\.[A-Za-z0-9]+$',
  ]),
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

/** Red-gate reminder prose. */
const TDD_REMIND_TEXT =
  'Red/green discipline: no failing test is on record since the last passing '
  + 'test run. Before editing implementation code, write a test that fails '
  + 'for the missing behavior and run it to see it fail — then make the '
  + 'change. Test files themselves are always editable.'

/** Red-gate denial feedback under `intensity: block`. */
const TDD_DENY_REASON =
  'Blocked by the dsh-doublecheck red/green evidence gate: no failing test '
  + 'is on record since the last passing test run. Write the failing test '
  + 'first (test files are allowed), run it to see it fail, then edit the '
  + 'implementation.'

/** Red-gate approval question under `intensity: warn`. */
const TDD_ASK_REASON =
  'No failing test is on record since the last passing test run. Allow this '
  + 'implementation edit before the red step?'

/** Green-gate reminder prose under `intensity: remind`. */
const GREEN_REMIND_TEXT =
  'Green gate: the implementation changed, but no passing test run is on '
  + 'record after those changes. Run the test suite and confirm it passes '
  + 'before declaring the work done.'

/** Green-gate reminder prose under `intensity: warn`/`block`. */
const GREEN_REMIND_STRICT_TEXT =
  'Green gate: the implementation changed, but no passing test run is on '
  + 'record after those changes. Do not claim completion — run the test '
  + 'suite and make it pass first.'

/** Cached per-session guard facts, folded incrementally from the append-only log. */
interface Snapshot {
  /** The log snapshot this fold last consumed; an append yields a new one. */
  events: readonly SessionEvent[]
  /** Number of events already folded. */
  scanned: number
  /** Latest direct-user task text folded so far. */
  latestUserText: string
  /** `isVagueTask` applied to `latestUserText`. */
  vague: boolean
  /** The discipline fold (spec, red/green color, green gate, pending pairs). */
  discipline: DisciplineState
}

/**
 * Install the guard listeners.
 * @param ctx - plugin context; listeners unwind with it.
 * @param config - validated {@link Config}; reserved-module misuse fails loud here.
 */
export function apply(ctx: Context, config: Config): void {
  if (config.modules.adversary) {
    throw new Error('dsh-doublecheck: modules.adversary is reserved for v0.3 and cannot be enabled in this version')
  }
  if ((config.adversaryModel ?? null) !== null) {
    throw new Error('dsh-doublecheck: adversaryModel requires the adversary module, which is reserved for v0.3')
  }
  assertPositiveInteger('vagueTaskMaxChars', config.vagueTaskMaxChars)
  assertGuardTools(config.guardTools)

  if (!config.modules.grill && !config.modules.tdd) {
    ctx.logger.info('dsh-doublecheck: both discipline gates disabled (modules.grill = false, modules.tdd = false); the guard contributes nothing')
    return
  }

  const guardToolSet = new Set(config.guardTools)
  const detection: TestRunDetection = config.modules.tdd
    ? compileDetection({
      testToolNames: config.testToolNames,
      testCommandPatterns: config.testCommandPatterns,
      guardTools: config.guardTools,
      testFilePatterns: config.testFilePatterns,
    })
    : { testToolNames: [], testCommandPatterns: [], mutationTools: [], testFilePatterns: [] }

  const snapshots = new WeakMap<Session, Snapshot>()
  /** Reminder queued at pre-execute, attached to the same execution at post-execute. */
  const pendingReminders = new WeakMap<ToolExecution, UserMessage>()
  /** Sessions that already received a grill reminder, for `remindOnce`. */
  const remindedSessions = new WeakSet<Session>()
  /** Sessions that already received a red-gate reminder, for `remindOnce`. */
  const tddRedReminded = new WeakSet<Session>()
  /** Sessions that already received a green-gate reminder, for `remindOnce`. */
  const tddGreenReminded = new WeakSet<Session>()

  /** Fold `events[start..end)` into the snapshot; each event is folded once per session. */
  function foldEvents(snapshot: Snapshot, events: readonly SessionEvent[], start: number, end: number): void {
    foldDisciplineRange(snapshot.discipline, events, start, detection)
    for (let index = start; index < end; index += 1) {
      const event = events[index]
      if (event === undefined) continue
      if (event.type !== 'user/message') continue
      if ((event.data.source as { kind?: unknown }).kind !== 'user') continue
      const parts: string[] = []
      for (const block of event.data.content) {
        if (block.type === 'text') parts.push(block.text)
      }
      if (parts.length > 0) {
        snapshot.latestUserText = parts.join('\n')
        snapshot.vague = isVagueTask(snapshot.latestUserText, config)
      }
    }
    snapshot.scanned = end
  }

  /** Start a fresh fold over the whole current log. */
  function refold(session: Session, events: readonly SessionEvent[]): Snapshot {
    const snapshot: Snapshot = {
      events,
      scanned: 0,
      latestUserText: '',
      vague: false,
      discipline: emptyDisciplineState(),
    }
    foldEvents(snapshot, events, 0, events.length)
    snapshots.set(session, snapshot)
    return snapshot
  }

  /**
   * Fold the session log to its current guard facts. The log is append-only
   * and `session.events` is an immutable snapshot replaced on each append, so
   * a resumed fold reuses the already-folded prefix: a per-call read costs
   * O(new events) instead of rescanning the whole log.
   */
  function snapshotOf(session: Session): Snapshot {
    const events = session.events
    const cached = snapshots.get(session)
    if (cached !== undefined) {
      if (cached.events === events && events.length === cached.scanned) return cached
      if (events.length < cached.scanned) return refold(session, events)
      foldEvents(cached, events, cached.scanned, events.length)
      cached.events = events
      return cached
    }
    return refold(session, events)
  }

  /** A plugin-sourced notice message carrying the given prose. */
  function notice(summary: string, text: string): UserMessage {
    const source: MessageSource = {
      kind: 'plugin',
      plugin: 'dsh-doublecheck',
      form: 'notice',
      summary,
    }
    return createUserMessage({ content: [{ type: 'text', text }], source })
  }

  /** The grill reminder for this reaction, or undefined when already reminded. */
  function nextGrillReminder(session: Session): UserMessage | undefined {
    if (config.remindOnce && remindedSessions.has(session)) return undefined
    remindedSessions.add(session)
    return notice('requirements check', REMINDER_TEXT)
  }

  /** The red-gate reminder for this reaction, or undefined when already reminded. */
  function nextTddRedReminder(session: Session): UserMessage | undefined {
    if (config.remindOnce && tddRedReminded.has(session)) return undefined
    tddRedReminded.add(session)
    return notice('red/green check', TDD_REMIND_TEXT)
  }

  // The policy gate. Observe-and-decide: the grill gate owns vague,
  // spec-less sessions; the red gate owns implementation edits without a
  // failing test on record. Returning without `next()` for warn/block is the
  // deliberate veto — `remind` always delegates.
  ctx.on('tools/pre-execute', async (exec, next): Promise<PreToolDecision> => {
    const agent = exec.agent
    if (agent === undefined || !guardToolSet.has(exec.name)) return next()
    const snapshot = snapshotOf(agent.session)

    // Grill gate: first discipline stage wins while it stays unsatisfied.
    if (config.modules.grill && !snapshot.discipline.hasSpec && snapshot.vague) {
      const reminder = nextGrillReminder(agent.session)
      if (reminder !== undefined) pendingReminders.set(exec, reminder)
      switch (config.intensity) {
        case 'remind': {
          ctx.emit('doublecheck/reminder', {
            agent,
            session: agent.session,
            toolName: exec.name,
            intensity: config.intensity,
            gate: 'grill',
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
            gate: 'grill',
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
            gate: 'grill',
            verdict: 'denied',
          })
          return { kind: 'deny', reason: DENY_REASON }
        }
        /* v8 ignore next -- GuardIntensity is a closed union; a future member must fail compilation here. */
        default:
          return assertNever(config.intensity, 'guard intensity')
      }
    }

    // Red gate: implementation edits need a failing test on record. Writing
    // test files is the red step itself and always delegates.
    if (config.modules.tdd && snapshot.discipline.color !== 'red') {
      const args = exec.arguments as Record<string, unknown> | undefined
      const path = mutationTargetPath(exec.name, args, detection)
      if (path !== undefined && isTestFilePath(path, detection)) return next()
      const reminder = nextTddRedReminder(agent.session)
      if (reminder !== undefined) pendingReminders.set(exec, reminder)
      switch (config.intensity) {
        case 'remind': {
          ctx.emit('doublecheck/reminder', {
            agent,
            session: agent.session,
            toolName: exec.name,
            intensity: config.intensity,
            gate: 'tdd',
            verdict: 'reminded',
            ...reminder !== undefined ? { reminder: TDD_REMIND_TEXT } : {},
          })
          return next()
        }
        case 'warn': {
          ctx.emit('doublecheck/reminder', {
            agent,
            session: agent.session,
            toolName: exec.name,
            intensity: config.intensity,
            gate: 'tdd',
            verdict: 'held',
          })
          return { kind: 'ask', reason: TDD_ASK_REASON }
        }
        case 'block': {
          ctx.emit('doublecheck/reminder', {
            agent,
            session: agent.session,
            toolName: exec.name,
            intensity: config.intensity,
            gate: 'tdd',
            verdict: 'denied',
          })
          return { kind: 'deny', reason: TDD_DENY_REASON }
        }
        /* v8 ignore next -- GuardIntensity is a closed union; a future member must fail compilation here. */
        default:
          return assertNever(config.intensity, 'guard intensity')
      }
    }

    return next()
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

  // Green gate at the turn boundary: edits without a passing test run on
  // record inject a completion reminder into the next request. Advisory, not
  // a veto — `agent/turn-stopping` never blocks the close.
  ctx.on('agent/turn-stopping', ({ agent }) => {
    if (!config.modules.tdd) return
    const snapshot = snapshotOf(agent.session)
    if (!snapshot.discipline.pendingGreen) return
    if (config.remindOnce && tddGreenReminded.has(agent.session)) return
    tddGreenReminded.add(agent.session)
    const text = config.intensity === 'remind' ? GREEN_REMIND_TEXT : GREEN_REMIND_STRICT_TEXT
    agent.inject(notice('green gate', text))
    ctx.emit('doublecheck/reminder', {
      agent,
      session: agent.session,
      intensity: config.intensity,
      gate: 'tdd',
      verdict: 'green-pending',
      reminder: text,
    })
  })
}

/** Prepend our reminder while preserving every downstream context's source and metadata. */
function prependContext(ours: UserMessage, theirs: UserMessage[] | undefined): UserMessage[] {
  return [ours, ...theirs ?? []]
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
