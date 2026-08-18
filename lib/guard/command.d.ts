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
import type { CommandInvocation, CommandResult } from '@deepseek-ai/dsh-commands';
import { Session } from '@deepseek-ai/dsh-session';
import type { SessionEvent } from '@deepseek-ai/dsh-session';
import type { TestRunDetection } from '../domain/evidence.js';
import type { Config, Snapshot } from './index.js';
export declare function hostStampsIgnorable(): boolean;
/**
 * The session's doublecheck master switch: the last `doublecheck/state` event,
 * or the configured default when none is on record.
 * @param events - the session log.
 * @param fallback - `enableByDefault` from the guard config.
 * @returns whether the discipline gates are enabled for this session.
 */
export declare function effectiveDoublecheckEnabled(events: readonly SessionEvent[], fallback: boolean): boolean;
/** The closures the command reads; all live inside the guard's `apply` scope. */
export interface CommandDeps {
    config: Config;
    /** The folded guard facts for a session (incremental fold, log-derived). */
    snapshotOf: (session: Session) => Snapshot;
    /** The compiled test-run detection shared with the tdd/adversary gates. */
    detection: TestRunDetection;
    /**
     * The effective session switch — the exact reader the gates use (local
     * override → durable `doublecheck/state` → configured default), so the
     * command answers consistently with what the gates enforce, including on
     * rc.6 hosts where the override is process-local.
     */
    effectiveEnabled: (session: Session) => boolean;
    /** Whether the host append surface stamps `ignorable` (see {@link hostStampsIgnorable}). */
    stampsIgnorable: () => boolean;
    /** Record a process-local switch override when the durable write is unavailable. */
    setLocalOverride: (session: Session, enabled: boolean) => void;
}
/**
 * Execute the `/doublecheck` command.
 * @param deps - the guard closures the handler reads.
 * @returns the command handler for `ctx.commands.register`.
 */
export declare function doublecheckHandler(deps: CommandDeps): (invocation: CommandInvocation) => CommandResult;
