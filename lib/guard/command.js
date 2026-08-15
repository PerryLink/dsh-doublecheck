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
import { createUserMessage } from '@deepseek-ai/dsh-llm';
import { Session, SessionId } from '@deepseek-ai/dsh-session';
import { deriveReportVerdict, foldReportFacts, renderReportMarkdown } from "../domain/report.js";
import { PROSE } from "./prose.js";
/**
 * Whether this host's `Session.append` stamps the `ignorable` envelope marker.
 * Detected once per process on a detached probe session: hosts without the
 * surface (rc.6) accept and ignore the options bag, and writing the durable
 * state event unmarked would make the session log unreadable to first-party
 * readers — so the switch command falls back to in-memory switching there.
 * @returns true when a `doublecheck/state` append comes back with the marker.
 */
let ignorableCapability;
export function hostStampsIgnorable() {
    if (ignorableCapability === undefined) {
        try {
            const probe = Session.create(SessionId('doublecheck-append-probe'));
            const event = probe.append('doublecheck/state', { enabled: true }, { ignorable: true });
            ignorableCapability = event.ignorable === true;
        }
        catch {
            ignorableCapability = false;
        }
    }
    return ignorableCapability;
}
/**
 * The session's doublecheck master switch: the last `doublecheck/state` event,
 * or the configured default when none is on record.
 * @param events - the session log.
 * @param fallback - `enableByDefault` from the guard config.
 * @returns whether the discipline gates are enabled for this session.
 */
export function effectiveDoublecheckEnabled(events, fallback) {
    for (let index = events.length - 1; index >= 0; index -= 1) {
        const event = events[index];
        if (event?.type === 'doublecheck/state')
            return event.data.enabled;
    }
    return fallback;
}
/** The switch notice injected after `/doublecheck on|off`. */
function switchNotice(enabled, durable, prose) {
    const source = { kind: 'plugin', plugin: 'dsh-doublecheck', form: 'notice', summary: 'doublecheck state' };
    const text = enabled
        ? durable ? prose.switchOnDurable : prose.switchOnLocal
        : durable ? prose.switchOffDurable : prose.switchOffLocal;
    return createUserMessage({ content: [{ type: 'text', text }], source });
}
/**
 * Execute the `/doublecheck` command.
 * @param deps - the guard closures the handler reads.
 * @returns the command handler for `ctx.commands.register`.
 */
export function doublecheckHandler(deps) {
    const { config, snapshotOf, detection, stampsIgnorable, setLocalOverride, effectiveEnabled } = deps;
    const prose = PROSE[config.language];
    return (invocation) => {
        const agent = invocation.agent;
        if (agent === undefined) {
            return { kind: 'error', text: prose.commandNoAgent };
        }
        const session = agent.session;
        const input = invocation.rawInput.trim().toLowerCase();
        const enabled = effectiveEnabled(session);
        if (input === 'status' || input === '') {
            const snapshot = snapshotOf(session);
            const discipline = snapshot.discipline;
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
                }),
            };
        }
        if (input === 'report') {
            const facts = foldReportFacts(session.events, detection);
            const report = {
                ...facts,
                verdict: deriveReportVerdict(facts, null),
                verification: null,
                path: null,
                written: false,
            };
            return { kind: 'success', text: renderReportMarkdown(report) };
        }
        if (input !== 'on' && input !== 'off') {
            return { kind: 'error', text: prose.commandUnknown(invocation.rawInput.trim()) };
        }
        const target = input === 'on';
        if (enabled === target) {
            return { kind: 'success', text: target ? prose.commandAlreadyOn : prose.commandAlreadyOff };
        }
        // Adaptive durable write: only hosts that stamp `ignorable` may write the
        // state event; on rc.6 the options bag is ignored and an unmarked foreign
        // event would make the session log unreadable to first-party readers.
        const durable = stampsIgnorable();
        if (durable) {
            ;
            session.append('doublecheck/state', { enabled: target }, { ignorable: true });
        }
        else {
            setLocalOverride(session, target);
        }
        agent.inject(switchNotice(target, durable, prose));
        return {
            kind: 'success',
            text: target
                ? durable ? prose.commandOnDurable : prose.commandOnLocal
                : durable ? prose.commandOffDurable : prose.commandOffLocal,
        };
    };
}
