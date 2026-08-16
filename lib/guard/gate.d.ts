/**
 * The delivery gate runner: orchestrates the four-phase quality checklist
 * over one session's durable evidence and settles the deliverable/rework
 * decision.
 *
 * - **requirements** + **tests** — deterministic folds of the session log
 *   (no model calls): the key-question checklist against the committed
 *   spec, and the test-run/coverage evidence.
 * - **consistency** — a local forked reviewer audits the diff ↔ requirement
 *   mapping (every edit must serve a spec dimension).
 * - **review** — the delivery conclusion. With `engine: auto`, the
 *   dsh-auto-review engine's durable verdict records (`autoReview/verdict` /
 *   `autoReview/rejection`) are the evidence; when the engine is not
 *   installed or has no records this session, the phase degrades to the
 *   local forked reviewer and says so. `engine: local` always uses the
 *   local reviewer. The gate never synthesizes approval requests: that
 *   chain may reach a human.
 *
 * Everything a run settles is audit-safe: counts, ids, verdicts, and
 * redacted findings only. The settled state rides the durable
 * `doublecheck/gate` session event (replay IS the state), the workspace
 * `gate-report.md`, and the `/gate run` command result.
 *
 * @module dsh-doublecheck/guard/gate
 */
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { CommandInvocation, CommandResult } from '@deepseek-ai/dsh-commands';
import type { UserMessage } from '@deepseek-ai/dsh-llm';
import type Schema from '@deepseek-ai/schemastery';
import type { TestRunDetection } from '../domain/evidence.ts';
import { type GateQuestion, type GateState, type GateVerdict } from '../domain/gate.ts';
import type { GuardProse, ProseLanguage } from './prose.ts';
/** The reviewer knobs shared by the consistency and review phases. */
export interface GateReviewerConfig {
    enabled: boolean;
    /** Subagent provider name the local reviewer runs on (default `fork`). */
    provider: string;
    /** Model route for the local reviewer; null means the main model reviews. */
    model: string | null;
    /** Tools the local reviewer may call (read-only by default). */
    tools: string[];
    /** Hard time budget for one local reviewer run. */
    timeoutMs: number;
    /** Maximum structured findings per phase. */
    maxFindings: number;
}
/** The delivery-gate configuration block of the guard row. */
export interface GateConfig {
    /** Master switch for the gate panel and the turn-boundary red notice. */
    enabled: boolean;
    /** Suggest re-opening in plan mode when the verdict is rework. */
    planSuggestion: boolean;
    /** Workspace file (relative to the session cwd) receiving the gate report. */
    reportFile: string;
    /** The requirements-interrogation phase. */
    requirements: {
        enabled: boolean;
        /** The configurable key-question checklist. */
        checklist: GateQuestion[];
        /** Minimum required questions that must be confirmed for the phase to pass. */
        minConfirmed: number;
        /** Tool name whose calls count as user interrogation evidence. */
        interrogateTool: string;
    };
    /** The test-evidence phase. */
    tests: {
        enabled: boolean;
        /** Require a passing test run as the latest evidence. */
        requirePassingRun: boolean;
        /** Failing runs after the latest green allowed before the gate turns red. */
        allowFailingRuns: number;
        /** Require coverage evidence in the test output. */
        requireCoverage: boolean;
        /** Minimum coverage percentage when coverage is required. */
        minCoveragePct: number;
        /** Regex (one capture group) parsing a coverage percentage from test output. */
        coveragePattern: string;
    };
    /** The implementation-consistency phase (local forked reviewer). */
    consistency: GateReviewerConfig;
    /** The review-conclusion phase (engine verdict records + local degrade). */
    review: GateReviewerConfig & {
        /** `auto` = dsh-auto-review verdict records when present, else local. */
        engine: 'auto' | 'local';
    };
}
/** The default gate configuration: every phase on, the six key questions required. */
export declare const DEFAULT_GATE_CONFIG: GateConfig;
/** The delivery-gate configuration schema (the pluggable checklist + knobs). */
export declare const GateConfigSchema: Schema<GateConfig>;
/**
 * Validate the gate configuration fail-loud: checklist ids unique and
 * non-empty, valid spec-dimension bindings, bounded thresholds, compilable
 * coverage regex, and sound reviewer knobs. A bad gate config must not
 * silently produce an uncheckable checklist.
 * @param gate - the gate config block.
 */
export declare function validateGateConfig(gate: GateConfig): void;
/**
 * Run the full delivery gate over the agent's session and settle the state.
 * The deterministic phases fold first; the two reviewer phases run in
 * parallel. Failures degrade to honest skip notices, never to throws.
 * @param ctx - plugin context (subagents, commands, fs seams).
 * @param config - the gate configuration.
 * @param detection - the compiled test-run detection knobs.
 * @param agent - the gated agent.
 * @param signal - the caller's cancellation signal.
 * @param language - prose language for the reviewer tasks.
 * @returns the settled gate state.
 */
export declare function runGate(ctx: Context, config: GateConfig, detection: TestRunDetection, agent: Agent, signal: AbortSignal, language: ProseLanguage): Promise<GateState>;
/**
 * Settle one gate run's side effects: the durable `doublecheck/gate` session
 * event (when the host stamps `ignorable`), the observability announcement,
 * and the workspace `gate-report.md` copy. Failures of the file write never
 * fail the run — the command result and the durable event remain.
 * @param ctx - plugin context.
 * @param config - the gate configuration.
 * @param state - the settled gate state.
 * @param agent - the gated agent.
 * @param signal - the caller's cancellation signal.
 * @param stampsIgnorable - whether the host stamps the `ignorable` marker.
 */
export declare function settleGate(ctx: Context, config: GateConfig, state: GateState, agent: Agent, signal: AbortSignal, stampsIgnorable: boolean): Promise<void>;
/** The closures the `/gate` command reads; all live inside the guard's `apply` scope. */
export interface GateCommandDeps {
    config: GateConfig;
    detection: TestRunDetection;
    prose: GuardProse;
    /** Runs the full gate and returns the settled state. */
    runGate: (agent: Agent, signal: AbortSignal) => Promise<GateState>;
    /** Settles the durable append, the announcement, and the workspace file. */
    settleGate: (state: GateState, agent: Agent, signal: AbortSignal) => Promise<void>;
    /** Whether the host stamps the `ignorable` marker (the durable write gate). */
    stampsIgnorable: () => boolean;
    /** The optional plan-mode service (weak seam: `ctx.get('planMode')`). */
    planMode?: {
        get(agent: Agent): {
            active?: boolean;
        } | undefined;
    };
}
/**
 * The `/gate` command handler: `status` renders the live checklist progress
 * plus the latest settled run; `run` settles the full gate and returns the
 * PR-ready markdown report; `config` renders the effective checklist.
 * @param deps - the guard closures the handler reads.
 * @returns the command handler for `ctx.commands.register`.
 */
export declare function gateHandler(deps: GateCommandDeps): (invocation: CommandInvocation) => CommandResult | Promise<CommandResult>;
/**
 * The injected gate-red notice message: short model-facing prose (role
 * statement first) with the structured verdict and red count riding the
 * durable `doublecheck-gate` message source, so the durable once-semantics
 * and the report folds read the record without re-parsing the prose.
 * @param verdict - the settled verdict.
 * @param redCount - the red-item count.
 * @param text - the model-facing notice text.
 * @returns the injection-ready user message.
 */
export declare function gateInjection(verdict: GateVerdict, redCount: number, text: string): UserMessage;
/**
 * Render the effective gate configuration as markdown — the `/gate config`
 * output: the pluggable checklist, the thresholds, and the reviewer knobs.
 * Configuration contains no secrets by construction; nothing is redacted.
 * @param config - the gate configuration.
 * @returns the configuration document.
 */
export declare function renderGateConfigMarkdown(config: GateConfig): string;
