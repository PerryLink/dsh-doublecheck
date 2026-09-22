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
import { sessionEvents } from "../session-events.js";
import z from '@deepseek-ai/schemastery';
import { DEFAULT_MUTATION_TOOLS, DEFAULT_TEST_COMMAND_PATTERNS, DEFAULT_TEST_FILE_PATTERNS, DEFAULT_TEST_TOOL_NAMES, compileDetection, isTestFilePath, mutationTargetPath, parseRawArguments, } from "../domain/evidence.js";
import { emptyDisciplineState, foldDisciplineRange } from "../domain/stages.js";
import { isVagueTask } from "../domain/vagueness.js";
import { noticeSource, noticeSummaryOf } from "../events.js";
import { runAdversaryReview, reviewInjection } from "./review.js";
import { PROSE } from "./prose.js";
import { gateHandler, gateInjection, GateConfigSchema, runGate, settleGate, validateGateConfig, } from "./gate.js";
import { countRedChecks } from "../domain/gate.js";
import { applyDoublecheckEvent, emptyDoublecheckState, viewDoublecheck, } from "../domain/projection.js";
import { doublecheckStateSchema, doublecheckViewSchema } from "../types.js";
import { installInvariant, PACKAGE_NAME } from "../invariant.js";
import { doublecheckHandler, hostStampsIgnorable } from "./command.js";
export const name = 'doublecheck-guard';
export const inject = ['commands'];
/**
 * The gate block as a live Config field where the host has one, else as plain
 * composition config.
 *
 * `.volatile()` first exists in `@deepseek-ai/schemastery` 3.18.3, but the peer
 * band still admits host lines that ship an older one. Detected once, at load:
 * on such a host the block stays ordinary config and the settings card is
 * simply absent — the row must not fail to mount over a missing optional
 * surface.
 */
function gateField() {
    const candidate = GateConfigSchema;
    return typeof candidate.volatile === 'function' ? candidate.volatile() : GateConfigSchema;
}
/**
 * Resolve the guard row's `gate` block from whatever shape the host produced:
 * a `Volatile` reference on a host with live Config fields, the plain resolved
 * object on one without. One build therefore spans the whole peer band.
 * @param value - the resolved `gate` field.
 * @returns the gate configuration block.
 * @throws when the block is absent — the schema carries a root default, so this
 * is a loud guard rather than a supported state.
 */
export function resolveGateBlock(value) {
    const live = value;
    const resolved = typeof live.get === 'function' ? live.get() : value;
    if (resolved === undefined) {
        throw new Error('dsh-doublecheck: gate config resolved to undefined; the Schema root default is missing');
    }
    return resolved;
}
/**
 * The guard row's Config schema.
 *
 * Deliberately NOT annotated with the `Schema<Config>` alias: a live field's
 * value is a `Volatile` reference, and the alias's output mapping cannot
 * express one (it would demand a plain `GateConfig`). The interface above
 * documents what `apply` reads; this schema is the runtime contract — the same
 * split the harness's own provider rows use (`@deepseek-ai/dsh-llm`'s
 * deepseek row declares `retryPolicy: Volatile<...>` against an un-annotated
 * schema).
 */
export const Config = z.object({
    intensity: z.union(['remind', 'warn', 'block']).default('remind'),
    modules: z.object({
        grill: z.boolean().default(true),
        tdd: z.boolean().default(true),
        adversary: z.boolean().default(false),
    }).default({ grill: true, tdd: true, adversary: false }),
    adversaryModel: z.union([z.string(), z.const(null)]).default(null),
    adversaryProvider: z.string().min(1).default('fork'),
    adversaryMaxFindings: z.number().default(5),
    adversaryTools: z.array(z.string()).default(['read', 'glob', 'grep']),
    adversaryTimeoutMs: z.number().default(120000),
    guardTools: z.array(z.string()).default([...DEFAULT_MUTATION_TOOLS]),
    vagueTaskMaxChars: z.number().default(200),
    remindOnce: z.boolean().default(true),
    language: z.union(['en', 'zh']).default('en'),
    enableByDefault: z.boolean().default(true),
    testToolNames: z.array(z.string()).default([...DEFAULT_TEST_TOOL_NAMES]),
    testCommandPatterns: z.array(z.string()).default([...DEFAULT_TEST_COMMAND_PATTERNS]),
    testFilePatterns: z.array(z.string()).default([...DEFAULT_TEST_FILE_PATTERNS]),
    gate: gateField(),
});
/**
 * Install the guard listeners.
 * @param ctx - plugin context; listeners unwind with it.
 * @param config - validated {@link Config}; reserved-module misuse fails loud here.
 */
export function apply(ctx, config) {
    assertPositiveInteger('vagueTaskMaxChars', config.vagueTaskMaxChars);
    assertGuardTools(config.guardTools);
    // The effective gate config: the profile patch's `gate` block, layered over
    // the Schema defaults (the host resolves exactly that order and hands the
    // result over as this live field's value). Read ONCE here, deliberately:
    // `gate.enabled` decides whether the turn-stopping notice is installed at
    // load, so a live swap could not honor it. An edit made through the settings
    // card lands in the profile patch and is picked up on the next load — the
    // same restart-scoped semantics the removed `doublecheck-gate` namespace had
    // (`applies: 'restart'`), minus the separate document that no longer exists.
    //
    // The one assertion in this module: on a host with live Config fields,
    // `Volatile.get()` hands back a deeply readonly snapshot, and every consumer
    // below (the command seam, the four gate phases, the report renderer) takes
    // the hand-written `GateConfig`. Nothing in this package writes the block, so
    // the snapshot's readonly wrapper is dropped once, at this single boundary —
    // and on a host without live fields there is no wrapper to drop.
    const gateConfig = resolveGateBlock(config.gate);
    // Fail loud on an unactable checklist. The host validates the Config schema
    // on every settings write, but this cross-field check (unique, non-empty,
    // in-range checklist ids and the thresholds they bound) is this package's own
    // rule, so it runs here — the write path cannot carry it.
    validateGateConfig(gateConfig);
    // Expose this row's live fields on the settings page. `auto: false` keeps the
    // generated card off: the gate knobs are rendered from the schema by the
    // form owner, and the package ships no custom page. The policy is an effect
    // so it unwinds with the row. Feature-detected: the settings service of a
    // host line without live Config fields has no `configure` at all, and the row
    // must still mount there.
    ctx.inject(['settings'], (child) => {
        const settings = child.settings;
        if (typeof settings.configure !== 'function')
            return;
        // Bound: the policy is read off the service instance, and the host's
        // implementation (like this row's stand-in) keeps its state on `this`.
        const configure = settings.configure.bind(settings);
        child.effect(() => configure({ auto: false }, ctx.fiber));
    });
    if (config.modules.adversary) {
        assertBoundedInteger('adversaryMaxFindings', config.adversaryMaxFindings, 20);
        assertPositiveInteger('adversaryTimeoutMs', config.adversaryTimeoutMs);
        assertNonEmptyNames('adversaryTools', config.adversaryTools);
        // The subagents seam itself is checked at review time, not here: row load
        // order means the provider may simply not have activated yet, and a
        // missing seam then settles as an honest "unavailable" notice.
    }
    const guardToolSet = new Set(config.guardTools);
    // The detection knobs always compile, so a bad regex or an empty name list
    // fails loud at load even when no module consumes them yet (a later
    // `/doublecheck report` and the delivery gate read the same compiled table).
    const detection = compileDetection({
        testToolNames: config.testToolNames,
        testCommandPatterns: config.testCommandPatterns,
        guardTools: config.guardTools,
        testFilePatterns: config.testFilePatterns,
    });
    const snapshots = new WeakMap();
    /** Reminder queued at pre-execute, attached to the same execution at post-execute. */
    const pendingReminders = new WeakMap();
    /** Process-local switch overrides written by `/doublecheck on|off` on hosts that cannot store the durable event. */
    const localOverrides = new WeakMap();
    /**
     * The effective switch for a session: the local override first, then the
     * durable `doublecheck/state` fold, then the configured default. The fold
     * rides the same incremental snapshot as the discipline facts, so the read
     * costs O(new events) instead of rescanning the log per tool call.
     */
    function doublecheckEnabled(session) {
        return localOverrides.get(session) ?? snapshotOf(session).stateEnabled ?? config.enableByDefault;
    }
    const prose = PROSE[config.language];
    /**
     * Fold `events[start..end)` into the snapshot; each event is folded once
     * per session. Beyond the discipline fold, this tracks the durable
     * once-semantics facts: reminder notices and review records ride the log as
     * `user/message` sources, so `remindOnce` and the once-per-green review
     * survive restarts, resumes, and forks without process memory.
     */
    function foldEvents(snapshot, events, start, end) {
        foldDisciplineRange(snapshot.discipline, events, start, detection);
        for (let index = start; index < end; index += 1) {
            const event = events[index];
            if (event === undefined)
                continue;
            if (event.type === 'user/message') {
                const source = event.data.source;
                const summary = noticeSummaryOf(source);
                if (summary !== undefined) {
                    if (summary === 'requirements check')
                        snapshot.grillReminded = true;
                    else if (summary === 'red/green check')
                        snapshot.redReminded = true;
                    else if (summary === 'green gate')
                        snapshot.greenReminded = true;
                    else if (summary === 'delivery report')
                        snapshot.reportReminded = true;
                }
                else if (source.kind === 'doublecheck-review') {
                    snapshot.lastReviewSeq = event.seq;
                    snapshot.editsAfterReview = 0;
                }
                else if (source.kind === 'doublecheck-gate') {
                    snapshot.gateRedReminded = true;
                }
                else if (source.kind === 'user') {
                    const parts = [];
                    for (const block of event.data.content) {
                        if (block.type === 'text')
                            parts.push(block.text);
                    }
                    if (parts.length > 0) {
                        snapshot.latestUserText = parts.join('\n');
                        snapshot.vague = isVagueTask(snapshot.latestUserText, config);
                        snapshot.lastTaskSeq = event.seq;
                    }
                }
            }
            else if (event.type === 'doublecheck/state') {
                snapshot.stateEnabled = event.data.enabled;
            }
            else if (event.type === 'doublecheck/gate') {
                const gate = event.data;
                snapshot.lastGate = {
                    seq: event.seq,
                    verdict: gate.verdict,
                    redCount: gate.phases === undefined ? 0 : countRedChecks(Object.values(gate.phases)),
                };
            }
            else if (event.type === 'tool/call' && event.seq > snapshot.lastReviewSeq) {
                // Implementation edits after the latest review re-arm the adversary
                // trigger for a second review round.
                const args = parseRawArguments(event.data.arguments);
                const path = mutationTargetPath(event.data.name, args, detection);
                if (path !== undefined && !isTestFilePath(path, detection)) {
                    snapshot.editsAfterReview += 1;
                }
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
            lastTaskSeq: 0,
            discipline: emptyDisciplineState(),
            grillReminded: false,
            redReminded: false,
            greenReminded: false,
            reportReminded: false,
            lastReviewSeq: -1,
            editsAfterReview: 0,
            lastGate: null,
            gateRedReminded: false,
        };
        foldEvents(snapshot, events, 0, events.length);
        snapshots.set(session, snapshot);
        return snapshot;
    }
    /**
     * Fold the session log to its current guard facts. The log is append-only
     * and the event snapshot is an immutable array replaced on each append, so
     * a resumed fold reuses the already-folded prefix: a per-call read costs
     * O(new events) instead of rescanning the whole log.
     */
    function snapshotOf(session) {
        const events = sessionEvents(session);
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
    /** A producer-owned notice message carrying the given prose. */
    function notice(summary, text) {
        return createUserMessage({ content: [{ type: 'text', text }], source: noticeSource(summary) });
    }
    /** The grill reminder for this reaction, or undefined when already reminded. */
    function nextGrillReminder(snapshot) {
        if (config.remindOnce && snapshot.grillReminded)
            return undefined;
        snapshot.grillReminded = true;
        return notice('requirements check', prose.grillReminder);
    }
    /** The red-gate reminder for this reaction, or undefined when already reminded. */
    function nextTddRedReminder(snapshot) {
        if (config.remindOnce && snapshot.redReminded)
            return undefined;
        snapshot.redReminded = true;
        return notice('red/green check', prose.tddReminder);
    }
    // The session command stays available even when every module is off:
    // `/doublecheck on` is how a disabled session re-enables the gates.
    ctx.commands.register({
        name: 'doublecheck',
        description: 'inspect or switch the dsh-doublecheck discipline gates for this session',
        input: { hint: 'status|report|on|off' },
        handler: doublecheckHandler({
            config,
            snapshotOf,
            detection,
            effectiveEnabled: doublecheckEnabled,
            stampsIgnorable: hostStampsIgnorable,
            setLocalOverride: (session, enabled) => localOverrides.set(session, enabled),
        }),
    });
    // The delivery gate panel: `/gate` stays available even when the gate or
    // every discipline module is off — it is the user's inspection surface.
    ctx.commands.register({
        name: 'gate',
        description: 'run the delivery quality gate and report the deliverable/rework decision',
        input: { hint: 'status|run|config' },
        handler: gateHandler({
            config: gateConfig,
            detection,
            prose,
            runGate: (agent, signal) => runGate(ctx, gateConfig, detection, agent, signal, config.language),
            settleGate: (state, agent, signal) => settleGate(ctx, gateConfig, state, agent, signal, hostStampsIgnorable()),
            stampsIgnorable: hostStampsIgnorable,
            planMode: ctx.get('planMode'),
        }),
    });
    // The gate-red turn notice: once per session, a settled rework verdict
    // suggests re-opening the work in plan mode. Installed even when every
    // discipline module is off — the gate panel is advisory, not a gate.
    if (gateConfig.enabled) {
        ctx.on('agent/turn-stopping', async ({ agent }) => {
            if (!doublecheckEnabled(agent.session))
                return;
            const snapshot = snapshotOf(agent.session);
            if (snapshot.gateRedReminded)
                return;
            const gate = snapshot.lastGate;
            if (gate === null || gate.verdict !== 'rework')
                return;
            snapshot.gateRedReminded = true;
            const text = prose.gateRedNotice(gate.redCount);
            agent.inject(gateInjection(gate.verdict, gate.redCount, text));
            ctx.emit('doublecheck/reminder', {
                agent,
                session: agent.session,
                intensity: config.intensity,
                gate: 'gate',
                verdict: 'gate-red',
                reminder: text,
            });
        });
    }
    if (!config.modules.grill && !config.modules.tdd && !config.modules.adversary) {
        ctx.logger.info('dsh-doublecheck: all discipline gates disabled; the /doublecheck and /gate commands remain active');
        return;
    }
    // The policy gate. Observe-and-decide: the grill gate owns vague,
    // spec-less sessions; the red gate owns implementation edits without a
    // failing test on record. Returning without `next()` for warn/block is the
    // deliberate veto — `remind` always delegates.
    ctx.on('tools/pre-execute', async (exec, next) => {
        const agent = exec.agent;
        if (agent === undefined || !guardToolSet.has(exec.name))
            return next();
        if (!doublecheckEnabled(agent.session))
            return next();
        const snapshot = snapshotOf(agent.session);
        // Grill gate: first discipline stage wins while it stays unsatisfied.
        // The gate reopens when a new direct-user task arrives after the latest
        // spec commit (seq comparison): a committed spec covers its own task,
        // not follow-up requests the user appended to the session.
        const grillOpen = !snapshot.discipline.hasSpec || snapshot.discipline.specSeq < snapshot.lastTaskSeq;
        if (config.modules.grill && grillOpen && snapshot.vague) {
            const reminder = nextGrillReminder(snapshot);
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
                        ...reminder !== undefined ? { reminder: prose.grillReminder } : {},
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
                    return { kind: 'ask', reason: prose.grillAsk };
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
                    return { kind: 'deny', reason: prose.grillDeny };
                }
                /* v8 ignore next -- GuardIntensity is a closed union; a future member must fail compilation here. */
                default:
                    return assertNever(config.intensity, 'guard intensity');
            }
        }
        // Red gate: implementation edits need a failing test on record. Writing
        // test files is the red step itself and always delegates, and a call that
        // names no file at all (a custom guard tool with another argument shape)
        // is not an implementation edit either.
        if (config.modules.tdd && snapshot.discipline.color !== 'red') {
            const args = exec.arguments;
            const path = mutationTargetPath(exec.name, args, detection);
            if (path === undefined || isTestFilePath(path, detection))
                return next();
            const reminder = nextTddRedReminder(snapshot);
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
                        ...reminder !== undefined ? { reminder: prose.tddReminder } : {},
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
                    return { kind: 'ask', reason: prose.tddAsk };
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
                    return { kind: 'deny', reason: prose.tddDeny };
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
    // Green gate, delivery gate, and adversary review at the turn boundary.
    // Advisory, not a veto — `agent/turn-stopping` never blocks the close, and
    // a review that cannot run settles as an honest "unavailable" notice. The
    // turn's abort signal cancels the review instead of letting it run out the
    // configured timeout.
    ctx.on('agent/turn-stopping', async ({ agent, signal: turnSignal }) => {
        if (!doublecheckEnabled(agent.session))
            return;
        const snapshot = snapshotOf(agent.session);
        if (config.modules.tdd && snapshot.discipline.pendingGreen) {
            if (!config.remindOnce || !snapshot.greenReminded) {
                snapshot.greenReminded = true;
                const text = config.intensity === 'remind' ? prose.greenReminder : prose.greenReminderStrict;
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
        // Delivery gate (advisory): once the loop reaches green and no
        // doublecheck_report is on record, expect the delivery record before
        // completion claims. Requires test-evidence tracking (tdd or adversary),
        // since `green` itself is only known when detection is compiled.
        if (config.modules.tdd || config.modules.adversary) {
            const discipline = snapshot.discipline;
            if (discipline.hasSpec && discipline.editCount > 0 && discipline.color === 'green'
                && !discipline.pendingGreen && discipline.stage !== 'verify') {
                if (!config.remindOnce || !snapshot.reportReminded) {
                    snapshot.reportReminded = true;
                    const text = prose.reportExpected;
                    agent.inject(notice('delivery report', text));
                    ctx.emit('doublecheck/reminder', {
                        agent,
                        session: agent.session,
                        intensity: config.intensity,
                        gate: 'delivery',
                        verdict: 'report-expected',
                        reminder: text,
                    });
                }
            }
        }
        if (!config.modules.adversary)
            return;
        const discipline = snapshot.discipline;
        if (!discipline.hasSpec || discipline.editCount === 0 || discipline.pendingGreen || discipline.color !== 'green')
            return;
        // Once-per-green, durable: a review is due only when implementation
        // edits exist after the latest review record (first review counts every
        // edit). Folded from the log, so resumes and forks re-derive the same.
        if (snapshot.editsAfterReview === 0)
            return;
        const outcome = await runAdversaryReview(ctx, adversaryConfig(config), agent, turnSignal);
        agent.inject(reviewInjection(outcome));
        ctx.emit('doublecheck/review', {
            session: agent.session,
            agent,
            verdict: outcome.verdict,
            findings: outcome.findings,
            text: outcome.text,
        });
        if (outcome.verdict === 'findings' && config.intensity !== 'remind') {
            agent.steer(notice('adversary review', config.intensity === 'block' ? prose.reviewSteerStrict : prose.reviewSteer));
        }
    });
    // The `doublecheck` session projection: folds the same durable discipline
    // facts the guard reads into a plain-JSON wire value a client renders.
    // Activates only when a projection registry is composed.
    ctx.inject(['sessionProjections'], (projectionCtx) => {
        const registry = projectionCtx.get('sessionProjections');
        if (registry === undefined)
            return;
        // The registry returns the disposer that unregisters this projection; it
        // MUST be owned by an effect. Registering without holding it left the old
        // closure live after a config hot-reload: turning `gate` (or any detection
        // knob) off and on again kept judging with the stale definitions — a
        // silent false-safety window, and a hard throw once the state version moved.
        projectionCtx.effect(() => registry.register({
            key: 'doublecheck',
            stateSchema: doublecheckStateSchema,
            init: emptyDoublecheckState,
            apply: (state, event) => applyDoublecheckEvent(state, event, detection),
            wire: {
                viewSchema: doublecheckViewSchema,
                view: viewDoublecheck,
            },
            stateVersion: 2,
        }), 'dsh-doublecheck: projection');
    });
    // The invariant companion, registered from the main plugin so its checks
    // see the live detection knobs. Activates only when an invariant registry
    // is composed. The registry binds its internal effect to the service
    // context and throws on a duplicate package name, so the returned disposer
    // is the only unregistration path: hold it on this inject scope's fiber.
    ctx.inject(['invariants'], (invariantCtx) => {
        const registry = invariantCtx.get('invariants');
        if (registry === undefined)
            return;
        invariantCtx.effect(() => registry.register(PACKAGE_NAME, installInvariant({ detection: () => detection })), 'dsh-doublecheck: invariant companion');
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
        language: config.language,
    };
}
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
