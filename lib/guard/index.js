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
import { createUserMessage } from '@deepseek-ai/dsh-llm';
import z from '@deepseek-ai/schemastery';
import { DEFAULT_MUTATION_TOOLS, DEFAULT_TEST_COMMAND_PATTERNS, DEFAULT_TEST_FILE_PATTERNS, DEFAULT_TEST_TOOL_NAMES, compileDetection, isTestFilePath, mutationTargetPath, } from "../domain/evidence.js";
import { emptyDisciplineState, foldDisciplineRange } from "../domain/stages.js";
import { isVagueTask } from "../domain/vagueness.js";
import { runAdversaryReview, reviewInjection } from "./review.js";
export const name = 'doublecheck-guard';
export const Config = z.object({
    intensity: z.union(['remind', 'warn', 'block']).default('remind'),
    modules: z.object({
        grill: z.boolean().default(true),
        tdd: z.boolean().default(false),
        adversary: z.boolean().default(false),
    }).default({ grill: true, tdd: false, adversary: false }),
    adversaryModel: z.union([z.string(), z.const(null)]).default(null),
    adversaryProvider: z.string().min(1).default('fork'),
    adversaryMaxFindings: z.number().default(5),
    adversaryTools: z.array(z.string()).default(['read', 'glob', 'grep']),
    adversaryTimeoutMs: z.number().default(120000),
    guardTools: z.array(z.string()).default([...DEFAULT_MUTATION_TOOLS]),
    vagueTaskMaxChars: z.number().default(200),
    remindOnce: z.boolean().default(true),
    testToolNames: z.array(z.string()).default([...DEFAULT_TEST_TOOL_NAMES]),
    testCommandPatterns: z.array(z.string()).default([...DEFAULT_TEST_COMMAND_PATTERNS]),
    testFilePatterns: z.array(z.string()).default([...DEFAULT_TEST_FILE_PATTERNS]),
});
/** Reminder prose injected under `intensity: remind` (and after held/denied calls). */
const REMINDER_TEXT = 'Double-check before you ship: this task is brief and no doublecheck spec '
    + 'has been recorded for it yet. Pause the edit and settle the six '
    + 'requirement dimensions first — goal, scope, acceptance criteria, failure '
    + 'modes, priorities, non-goals. Follow the grill-requirements skill: ask '
    + 'the user with the ask_user_question tool until consensus, record the '
    + 'result with doublecheck_spec, and only then resume editing.';
/** Denial feedback under `intensity: block`. */
const DENY_REASON = 'Blocked by the dsh-doublecheck requirements guard: the task statement is '
    + 'vague and no doublecheck_spec exists for this session. Run the '
    + 'requirements grill first (grill-requirements skill → ask_user_question → '
    + 'doublecheck_spec), then retry this call.';
/** Approval question under `intensity: warn`. */
const ASK_REASON = 'The task statement is vague and no doublecheck spec exists for this '
    + 'session. Allow this edit before the requirements grill has run?';
/** Red-gate reminder prose. */
const TDD_REMIND_TEXT = 'Red/green discipline: no failing test is on record since the last passing '
    + 'test run. Before editing implementation code, write a test that fails '
    + 'for the missing behavior and run it to see it fail — then make the '
    + 'change. Test files themselves are always editable.';
/** Red-gate denial feedback under `intensity: block`. */
const TDD_DENY_REASON = 'Blocked by the dsh-doublecheck red/green evidence gate: no failing test '
    + 'is on record since the last passing test run. Write the failing test '
    + 'first (test files are allowed), run it to see it fail, then edit the '
    + 'implementation.';
/** Red-gate approval question under `intensity: warn`. */
const TDD_ASK_REASON = 'No failing test is on record since the last passing test run. Allow this '
    + 'implementation edit before the red step?';
/** Green-gate reminder prose under `intensity: remind`. */
const GREEN_REMIND_TEXT = 'Green gate: the implementation changed, but no passing test run is on '
    + 'record after those changes. Run the test suite and confirm it passes '
    + 'before declaring the work done.';
/** Green-gate reminder prose under `intensity: warn`/`block`. */
const GREEN_REMIND_STRICT_TEXT = 'Green gate: the implementation changed, but no passing test run is on '
    + 'record after those changes. Do not claim completion — run the test '
    + 'suite and make it pass first.';
/**
 * Install the guard listeners.
 * @param ctx - plugin context; listeners unwind with it.
 * @param config - validated {@link Config}; reserved-module misuse fails loud here.
 */
export function apply(ctx, config) {
    assertPositiveInteger('vagueTaskMaxChars', config.vagueTaskMaxChars);
    assertGuardTools(config.guardTools);
    if (config.modules.adversary) {
        assertBoundedInteger('adversaryMaxFindings', config.adversaryMaxFindings, 20);
        assertPositiveInteger('adversaryTimeoutMs', config.adversaryTimeoutMs);
        assertNonEmptyNames('adversaryTools', config.adversaryTools);
        // The subagents seam itself is checked at review time, not here: row load
        // order means the provider may simply not have activated yet, and a
        // missing seam then settles as an honest "unavailable" notice.
    }
    if (!config.modules.grill && !config.modules.tdd && !config.modules.adversary) {
        ctx.logger.info('dsh-doublecheck: all discipline gates disabled; the guard contributes nothing');
        return;
    }
    const guardToolSet = new Set(config.guardTools);
    // Evidence folding backs the tdd gate AND the adversary trigger, so either
    // module compiles the test-run detection; only the gate behavior differs.
    const detection = config.modules.tdd || config.modules.adversary
        ? compileDetection({
            testToolNames: config.testToolNames,
            testCommandPatterns: config.testCommandPatterns,
            guardTools: config.guardTools,
            testFilePatterns: config.testFilePatterns,
        })
        : { testToolNames: [], testCommandPatterns: [], mutationTools: [], testFilePatterns: [] };
    const snapshots = new WeakMap();
    /** Reminder queued at pre-execute, attached to the same execution at post-execute. */
    const pendingReminders = new WeakMap();
    /** Sessions that already received a grill reminder, for `remindOnce`. */
    const remindedSessions = new WeakSet();
    /** Sessions that already received a red-gate reminder, for `remindOnce`. */
    const tddRedReminded = new WeakSet();
    /** Sessions that already received a green-gate reminder, for `remindOnce`. */
    const tddGreenReminded = new WeakSet();
    /** Sessions that already ran the adversary review (once per session). */
    const reviewedSessions = new WeakSet();
    /** Fold `events[start..end)` into the snapshot; each event is folded once per session. */
    function foldEvents(snapshot, events, start, end) {
        foldDisciplineRange(snapshot.discipline, events, start, detection);
        for (let index = start; index < end; index += 1) {
            const event = events[index];
            if (event === undefined)
                continue;
            if (event.type !== 'user/message')
                continue;
            if (event.data.source.kind !== 'user')
                continue;
            const parts = [];
            for (const block of event.data.content) {
                if (block.type === 'text')
                    parts.push(block.text);
            }
            if (parts.length > 0) {
                snapshot.latestUserText = parts.join('\n');
                snapshot.vague = isVagueTask(snapshot.latestUserText, config);
            }
        }
        snapshot.scanned = end;
    }
    /** Start a fresh fold over the whole current log. */
    function refold(session, events) {
        const snapshot = {
            events,
            scanned: 0,
            latestUserText: '',
            vague: false,
            discipline: emptyDisciplineState(),
        };
        foldEvents(snapshot, events, 0, events.length);
        snapshots.set(session, snapshot);
        return snapshot;
    }
    /**
     * Fold the session log to its current guard facts. The log is append-only
     * and `session.events` is an immutable snapshot replaced on each append, so
     * a resumed fold reuses the already-folded prefix: a per-call read costs
     * O(new events) instead of rescanning the whole log.
     */
    function snapshotOf(session) {
        const events = session.events;
        const cached = snapshots.get(session);
        if (cached !== undefined) {
            if (cached.events === events && events.length === cached.scanned)
                return cached;
            if (events.length < cached.scanned)
                return refold(session, events);
            foldEvents(cached, events, cached.scanned, events.length);
            cached.events = events;
            return cached;
        }
        return refold(session, events);
    }
    /** A plugin-sourced notice message carrying the given prose. */
    function notice(summary, text) {
        const source = {
            kind: 'plugin',
            plugin: 'dsh-doublecheck',
            form: 'notice',
            summary,
        };
        return createUserMessage({ content: [{ type: 'text', text }], source });
    }
    /** The grill reminder for this reaction, or undefined when already reminded. */
    function nextGrillReminder(session) {
        if (config.remindOnce && remindedSessions.has(session))
            return undefined;
        remindedSessions.add(session);
        return notice('requirements check', REMINDER_TEXT);
    }
    /** The red-gate reminder for this reaction, or undefined when already reminded. */
    function nextTddRedReminder(session) {
        if (config.remindOnce && tddRedReminded.has(session))
            return undefined;
        tddRedReminded.add(session);
        return notice('red/green check', TDD_REMIND_TEXT);
    }
    // The policy gate. Observe-and-decide: the grill gate owns vague,
    // spec-less sessions; the red gate owns implementation edits without a
    // failing test on record. Returning without `next()` for warn/block is the
    // deliberate veto — `remind` always delegates.
    ctx.on('tools/pre-execute', async (exec, next) => {
        const agent = exec.agent;
        if (agent === undefined || !guardToolSet.has(exec.name))
            return next();
        const snapshot = snapshotOf(agent.session);
        // Grill gate: first discipline stage wins while it stays unsatisfied.
        if (config.modules.grill && !snapshot.discipline.hasSpec && snapshot.vague) {
            const reminder = nextGrillReminder(agent.session);
            if (reminder !== undefined)
                pendingReminders.set(exec, reminder);
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
                    });
                    return next();
                }
                case 'warn': {
                    ctx.emit('doublecheck/reminder', {
                        agent,
                        session: agent.session,
                        toolName: exec.name,
                        intensity: config.intensity,
                        gate: 'grill',
                        verdict: 'held',
                    });
                    return { kind: 'ask', reason: ASK_REASON };
                }
                case 'block': {
                    ctx.emit('doublecheck/reminder', {
                        agent,
                        session: agent.session,
                        toolName: exec.name,
                        intensity: config.intensity,
                        gate: 'grill',
                        verdict: 'denied',
                    });
                    return { kind: 'deny', reason: DENY_REASON };
                }
                /* v8 ignore next -- GuardIntensity is a closed union; a future member must fail compilation here. */
                default:
                    return assertNever(config.intensity, 'guard intensity');
            }
        }
        // Red gate: implementation edits need a failing test on record. Writing
        // test files is the red step itself and always delegates.
        if (config.modules.tdd && snapshot.discipline.color !== 'red') {
            const args = exec.arguments;
            const path = mutationTargetPath(exec.name, args, detection);
            if (path !== undefined && isTestFilePath(path, detection))
                return next();
            const reminder = nextTddRedReminder(agent.session);
            if (reminder !== undefined)
                pendingReminders.set(exec, reminder);
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
                    });
                    return next();
                }
                case 'warn': {
                    ctx.emit('doublecheck/reminder', {
                        agent,
                        session: agent.session,
                        toolName: exec.name,
                        intensity: config.intensity,
                        gate: 'tdd',
                        verdict: 'held',
                    });
                    return { kind: 'ask', reason: TDD_ASK_REASON };
                }
                case 'block': {
                    ctx.emit('doublecheck/reminder', {
                        agent,
                        session: agent.session,
                        toolName: exec.name,
                        intensity: config.intensity,
                        gate: 'tdd',
                        verdict: 'denied',
                    });
                    return { kind: 'deny', reason: TDD_DENY_REASON };
                }
                /* v8 ignore next -- GuardIntensity is a closed union; a future member must fail compilation here. */
                default:
                    return assertNever(config.intensity, 'guard intensity');
            }
        }
        return next();
    });
    // Observe-and-enrich, never veto: delegate first, then fold the queued
    // reminder onto whatever decision came back. Denied and held calls flow
    // through this same waterfall, so their reminders ride too.
    ctx.on('tools/post-execute', async (exec, _result, next) => {
        const downstream = await next();
        const reminder = pendingReminders.get(exec);
        if (reminder === undefined)
            return downstream;
        pendingReminders.delete(exec);
        if (downstream.kind === 'block') {
            return {
                kind: 'block',
                feedback: downstream.feedback,
                additionalContexts: prependContext(reminder, downstream.additionalContexts),
            };
        }
        return { ...downstream, additionalContexts: prependContext(reminder, downstream.additionalContexts) };
    });
    // Green gate and adversary review at the turn boundary. Advisory, not a
    // veto — `agent/turn-stopping` never blocks the close, and a review that
    // cannot run settles as an honest "unavailable" notice.
    ctx.on('agent/turn-stopping', async ({ agent }) => {
        if (config.modules.tdd) {
            const snapshot = snapshotOf(agent.session);
            if (snapshot.discipline.pendingGreen) {
                if (!config.remindOnce || !tddGreenReminded.has(agent.session)) {
                    tddGreenReminded.add(agent.session);
                    const text = config.intensity === 'remind' ? GREEN_REMIND_TEXT : GREEN_REMIND_STRICT_TEXT;
                    agent.inject(notice('green gate', text));
                    ctx.emit('doublecheck/reminder', {
                        agent,
                        session: agent.session,
                        intensity: config.intensity,
                        gate: 'tdd',
                        verdict: 'green-pending',
                        reminder: text,
                    });
                }
            }
        }
        if (!config.modules.adversary)
            return;
        const snapshot = snapshotOf(agent.session);
        const discipline = snapshot.discipline;
        if (!discipline.hasSpec || discipline.editCount === 0 || discipline.pendingGreen || discipline.color !== 'green')
            return;
        if (reviewedSessions.has(agent.session))
            return;
        reviewedSessions.add(agent.session);
        const outcome = await runAdversaryReview(ctx, adversaryConfig(config), agent);
        agent.inject(reviewInjection(outcome));
        ctx.emit('doublecheck/review', {
            session: agent.session,
            agent,
            verdict: outcome.verdict,
            findings: outcome.findings,
            text: outcome.text,
        });
        if (outcome.verdict === 'findings' && config.intensity !== 'remind') {
            agent.steer(notice('adversary review', config.intensity === 'block' ? REVIEW_STEER_STRICT : REVIEW_STEER));
        }
    });
}
/** The adversary knobs in the shape the review runner reads. */
function adversaryConfig(config) {
    return {
        adversaryProvider: config.adversaryProvider,
        adversaryModel: config.adversaryModel ?? null,
        adversaryMaxFindings: config.adversaryMaxFindings,
        adversaryTools: config.adversaryTools,
        adversaryTimeoutMs: config.adversaryTimeoutMs,
    };
}
/** Steering prose under `intensity: warn` after findings. */
const REVIEW_STEER = 'The adversary review above found objections against this delivery. '
    + 'Address them before finishing: fix what is real, and state plainly what '
    + 'is false.';
/** Steering prose under `intensity: block` after findings. */
const REVIEW_STEER_STRICT = 'The adversary review above found objections against this delivery. Do not '
    + 'claim completion while they stand: fix every blocker and major finding, '
    + 'or prove it false, before you finish.';
/** Prepend our reminder while preserving every downstream context's source and metadata. */
function prependContext(ours, theirs) {
    return [ours, ...theirs ?? []];
}
function assertPositiveInteger(field, value) {
    if (!Number.isInteger(value) || value < 1) {
        throw new Error(`dsh-doublecheck: ${field} must be an integer >= 1`);
    }
}
/** Validate a bounded positive integer knob fail-loud. */
function assertBoundedInteger(field, value, maximum) {
    assertPositiveInteger(field, value);
    if (value > maximum) {
        throw new Error(`dsh-doublecheck: ${field} must be <= ${maximum}`);
    }
}
/** Validate a name list fail-loud: non-empty, non-empty names, no duplicates. */
function assertNonEmptyNames(field, names) {
    if (names.length === 0)
        throw new Error(`dsh-doublecheck: ${field} must not be empty`);
    for (const name of names) {
        if (name.length === 0)
            throw new Error(`dsh-doublecheck: ${field} must not contain empty names`);
    }
    if (new Set(names).size !== names.length)
        throw new Error(`dsh-doublecheck: ${field} must not contain duplicates`);
}
/** Validate the guard-tool list fail-loud: non-empty, non-empty names, no duplicates. */
function assertGuardTools(tools) {
    if (tools.length === 0) {
        throw new Error('dsh-doublecheck: guardTools must not be empty');
    }
    for (const tool of tools) {
        if (tool.length === 0) {
            throw new Error('dsh-doublecheck: guardTools must not contain empty tool names');
        }
    }
    if (new Set(tools).size !== tools.length) {
        throw new Error('dsh-doublecheck: guardTools must not contain duplicates');
    }
}
/** Closed-union exhaustiveness guard for the intensity switch. */
function assertNever(value, subject) {
    throw new Error(`dsh-doublecheck: unknown ${subject} "${String(value)}"`);
}
//# sourceMappingURL=index.js.map