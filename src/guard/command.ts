/**
 * The `/doublecheck` session command: inspect and steer the discipline gates
 * from the conversation.
 *
 * - `status` — effective switch, configured modules, and the folded stage
 *   facts (spec committed, red/green color, review on record).
 * - `report` — folds the delivery report on the spot from the same durable
 *   evidence the `doublecheck_report` tool reads (no verification workflow:
 *   the report tool owns that path).
 * - `on` / `off` — writes the durable `doublecheck/state` override (the fold
 *   survives restarts, resumes, and forks — replay IS the state) and injects
 *   a model-visible switch notice (`user/message`, plugin source).
 *
 * @module dsh-doublecheck/guard/command
 */

import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { CommandInvocation, CommandResult } from '@deepseek-ai/dsh-commands'
import type { MessageSource } from '@deepseek-ai/dsh-llm'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import type { SessionEvent, UserMessage } from '@deepseek-ai/dsh-session'
import { deriveReportVerdict, foldReportFacts, renderReportMarkdown, type ReportData } from '../domain/report.ts'
import type { TestRunDetection } from '../domain/evidence.ts'
import type { StateAppend } from '../events.ts'
import { PROSE, type GuardProse } from './prose.ts'
import type { Config, Snapshot } from './index.ts'

/**
 * Whether this host's `Session.append` stamps the `ignorable` envelope marker.
 * Detected once per process on a detached probe session: hosts without the
 * surface (rc.6) accept and ignore the options bag, and writing the durable
 * state event unmarked would make the session log unreadable to first-party
 * readers — so the switch command falls back to in-memory switching there.
 * @returns true when a `doublecheck/state` append comes back with the marker.
 */
let ignorableCapability: boolean | undefined
export function hostStampsIgnorable(): boolean {
  if (ignorableCapability === undefined) {
    try {
      const probe = Session.create(SessionId('doublecheck-append-probe'))
      const event = (probe.append as unknown as (
        type: 'doublecheck/state',
        data: { enabled: boolean },
        options: { ignorable: true },
      ) => { ignorable?: boolean })('doublecheck/state', { enabled: true }, { ignorable: true })
      ignorableCapability = event.ignorable === true
    } catch {
      ignorableCapability = false
    }
  }
  return ignorableCapability
}

/**
 * The session's doublecheck master switch: the last `doublecheck/state` event,
 * or the configured default when none is on record.
 * @param events - the session log.
 * @param fallback - `enableByDefault` from the guard config.
 * @returns whether the discipline gates are enabled for this session.
 */
export function effectiveDoublecheckEnabled(events: readonly SessionEvent[], fallback: boolean): boolean {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]
    if (event?.type === 'doublecheck/state') return event.data.enabled
  }
  return fallback
}

/** The closures the command reads; all live inside the guard's `apply` scope. */
export interface CommandDeps {
  config: Config
  /** The folded guard facts for a session (incremental fold, log-derived). */
  snapshotOf: (session: Session) => Snapshot
  /** The compiled test-run detection shared with the tdd/adversary gates. */
  detection: TestRunDetection
  /**
   * The effective session switch — the exact reader the gates use (local
   * override → durable `doublecheck/state` → configured default), so the
   * command answers consistently with what the gates enforce, including on
   * rc.6 hosts where the override is process-local.
   */
  effectiveEnabled: (session: Session) => boolean
  /** Whether the host append surface stamps `ignorable` (see {@link hostStampsIgnorable}). */
  stampsIgnorable: () => boolean
  /** Record a process-local switch override when the durable write is unavailable. */
  setLocalOverride: (session: Session, enabled: boolean) => void
}

/** The switch notice injected after `/doublecheck on|off`. */
function switchNotice(enabled: boolean, durable: boolean, prose: GuardProse): UserMessage {
  const source: MessageSource = { kind: 'plugin', plugin: 'dsh-doublecheck', form: 'notice', summary: 'doublecheck state' }
  const text = enabled
    ? durable ? prose.switchOnDurable : prose.switchOnLocal
    : durable ? prose.switchOffDurable : prose.switchOffLocal
  return createUserMessage({ content: [{ type: 'text', text }], source })
}

/**
 * Execute the `/doublecheck` command.
 * @param deps - the guard closures the handler reads.
 * @returns the command handler for `ctx.commands.register`.
 */
export function doublecheckHandler(deps: CommandDeps): (invocation: CommandInvocation) => CommandResult {
  const { config, snapshotOf, detection, stampsIgnorable, setLocalOverride, effectiveEnabled } = deps
  const prose = PROSE[config.language]
  return (invocation: CommandInvocation): CommandResult => {
    const agent = invocation.agent
    if (agent === undefined) {
      return { kind: 'error', text: prose.commandNoAgent }
    }
    const session = agent.session
    const input = invocation.rawInput.trim().toLowerCase()
    const enabled = effectiveEnabled(session)

    if (input === 'status' || input === '') {
      const snapshot = snapshotOf(session)
      const discipline = snapshot.discipline
      return {
        kind: 'success',
        text: prose.commandStatus({
          enabled,
          defaultEnabled: config.enableByDefault,
          modules: config.modules,
          intensity: config.intensity,
          remindOnce: config.remindOnce,
          hasSpec: discipline.hasSpec,
          color: discipline.color,
          reviewed: snapshot.lastReviewSeq >= 0,
          editCount: discipline.editCount,
          gate: snapshot.lastGate === null
            ? null
            : { verdict: snapshot.lastGate.verdict, redCount: snapshot.lastGate.redCount },
        }),
      }
    }

    if (input === 'report') {
      const facts = foldReportFacts(session.events, detection)
      const report: ReportData = {
        ...facts,
        verdict: deriveReportVerdict(facts, null),
        verification: null,
        path: null,
        written: false,
      }
      return { kind: 'success', text: renderReportMarkdown(report) }
    }

    if (input !== 'on' && input !== 'off') {
      return { kind: 'error', text: prose.commandUnknown(invocation.rawInput.trim()) }
    }

    const target = input === 'on'
    if (enabled === target) {
      return { kind: 'success', text: target ? prose.commandAlreadyOn : prose.commandAlreadyOff }
    }
    // Adaptive durable write: only hosts that stamp `ignorable` may write the
    // state event; on rc.6 the options bag is ignored and an unmarked foreign
    // event would make the session log unreadable to first-party readers.
    const durable = stampsIgnorable()
    if (durable) {
      ;(session.append as unknown as StateAppend)('doublecheck/state', { enabled: target }, { ignorable: true })
    } else {
      setLocalOverride(session, target)
    }
    agent.inject(switchNotice(target, durable, prose))
    return {
      kind: 'success',
      text: target
        ? durable ? prose.commandOnDurable : prose.commandOnLocal
        : durable ? prose.commandOffDurable : prose.commandOffLocal,
    }
  }
}
