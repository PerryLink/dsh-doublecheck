/**
 * The delivery gate domain: the configurable quality-gate checklist that
 * turns one session's durable evidence into a deliverable/rework decision.
 *
 * Four phases compose the checklist:
 *
 * - **requirements** — a key-question checklist confirmed item by item
 *   against the committed spec (deterministic fold, no model calls).
 * - **tests** — test evidence from the session log: the latest run color,
 *   failing runs after green, and (optionally) a coverage percentage parsed
 *   from the test output.
 * - **consistency** — diff ↔ requirement mapping, audited by a local forked
 *   reviewer (orchestrated by the guard row; this module owns the result
 *   shape and the status fold).
 * - **review** — the delivery conclusion: the dsh-auto-review engine's
 *   durable verdict records when they exist (`engine: auto`), degraded to
 *   the local reviewer when the engine is not installed or has not run.
 *
 * Everything here is pure: the durable session log in, structured gate facts
 * out. Check summaries and suggestions are stable English audit ids (the
 * workspace documents keep English headings by package policy); the guard
 * row localizes the surrounding command chrome. Reports are audit-safe by
 * construction — counts, ids, and verdicts only — and {@link redactSecrets}
 * scrubs the model-produced finding texts before they are stored or shown.
 *
 * @module dsh-doublecheck/domain/gate
 */
import type { SessionEvent } from '@deepseek-ai/dsh-session';
import type { ObjectJsonSchema } from '@deepseek-ai/dsh-tools';
import { type TestRunDetection } from './evidence.js';
import { type GrilledSpec, type ReviewFinding } from './vocabulary.js';
/** The four gate phases, in checklist order. */
export type GatePhase = 'requirements' | 'tests' | 'consistency' | 'review';
/** All gate phases in checklist order. */
export declare const GATE_PHASES: readonly GatePhase[];
/** One checklist item's status. Worst-first: fail, warn, skip, pending, pass. */
export type GateCheckStatus = 'pass' | 'fail' | 'warn' | 'skip' | 'pending';
/** One settled checklist item. */
export interface GateCheck {
    /** Stable id — schema-configurable and unique within the gate. */
    id: string;
    /** The phase this check belongs to. */
    phase: GatePhase;
    /** Short human-readable check name (stable English audit id). */
    label: string;
    status: GateCheckStatus;
    /** One-line evidence summary: counts/verdicts only, no sensitive content. */
    summary: string;
    /** What to fix when the check failed (the rework suggestion). */
    suggestion: string;
}
/** One phase's settled result. */
export interface GatePhaseResult {
    phase: GatePhase;
    /** Whether the phase is enabled in the configuration. */
    enabled: boolean;
    /** The worst status of this phase's checks. */
    status: GateCheckStatus;
    checks: GateCheck[];
}
/** The gate's binary decision. */
export type GateVerdict = 'deliverable' | 'rework';
/** Which engine produced the review conclusion, or null when it did not run. */
export type GateReviewEngine = 'dsh-auto-review' | 'local' | null;
/** The complete settled gate state of one run. */
export interface GateState {
    verdict: GateVerdict;
    phases: Record<GatePhase, GatePhaseResult>;
    /** The engine behind the review phase of this run. */
    reviewEngine: GateReviewEngine;
    /** ISO timestamp of the run. */
    at: string;
}
/** One configurable key question of the requirements phase. */
export interface GateQuestion {
    /** Stable id — unique within the checklist. */
    id: string;
    /** The key question the grill must answer. */
    question: string;
    /**
     * The spec dimension whose committed text answers this question, or null
     * for a free-form question with no automatic evidence binding (rendered
     * as a warning: confirm manually).
     */
    specDimension: (keyof GrilledSpec) | null;
    /** A failed required question is a red light; an optional one is a warning. */
    required: boolean;
}
/** The default key-question checklist: one question per spec dimension. */
export declare const DEFAULT_GATE_QUESTIONS: readonly GateQuestion[];
/** Default regex parsing a coverage percentage from test output (one capture group, case-insensitive). */
export declare const DEFAULT_COVERAGE_PATTERN = "coverage[^\\d]{0,40}(\\d+(?:\\.\\d+)?)\\s*%";
/** The requirements-phase evidence folded from the log. */
export interface RequirementsEvidence {
    /** The latest committed spec, or null before any exists. */
    spec: GrilledSpec | null;
    /** `ask_user_question`-style interrogation calls on record. */
    interrogations: number;
}
/**
 * Fold the requirements evidence: the latest committed spec (a successful
 * `doublecheck_spec` pair, from the call's own arguments) and the count of
 * interrogation tool calls on record.
 * @param events - the session's append-only event log.
 * @param interrogateTool - the tool name that counts as user interrogation.
 * @returns the folded evidence.
 */
export declare function foldRequirementsEvidence(events: readonly SessionEvent[], interrogateTool: string): RequirementsEvidence;
/** The tests-phase evidence folded from the log. */
export interface TestEvidence {
    /** Failing test runs on record. */
    failed: number;
    /** Passing test runs on record. */
    passed: number;
    /** The outcome of the latest settled test run. */
    lastOutcome: 'pass' | 'fail' | 'none';
    /** Failing runs after the latest passing run (the open red window). */
    failingAfterGreen: number;
    /** The best coverage percentage parsed from the test outputs, or null. */
    coveragePct: number | null;
}
/**
 * Fold the test evidence: run counts, the latest outcome, the failing runs
 * since the latest green, and the best parsed coverage percentage.
 * @param events - the session's append-only event log.
 * @param detection - the compiled test-run detection knobs.
 * @param coverageRegex - regex with one capture group matching a percentage.
 * @returns the folded evidence.
 */
export declare function foldTestEvidence(events: readonly SessionEvent[], detection: TestRunDetection, coverageRegex: RegExp): TestEvidence;
/** The requirements-phase tuning. */
export interface RequirementsGateConfig {
    /** The configurable key-question checklist. */
    checklist: readonly GateQuestion[];
    /** Minimum required questions that must be confirmed for the phase to pass. */
    minConfirmed: number;
}
/**
 * Evaluate the requirements phase: each key question is confirmed item by
 * item against the committed spec. A failed required question is a red
 * light; a failed optional question is a warning; a free-form question
 * without a spec-dimension binding is a manual-confirm warning.
 * @param evidence - the folded requirements evidence.
 * @param config - the requirements-phase tuning.
 * @returns the settled phase result.
 */
export declare function evaluateRequirements(evidence: RequirementsEvidence, config: RequirementsGateConfig): GatePhaseResult;
/** The tests-phase tuning. */
export interface TestsGateConfig {
    /** Require a passing test run as the latest evidence. */
    requirePassingRun: boolean;
    /** Failing runs after the latest green allowed before the gate turns red. */
    allowFailingRuns: number;
    /** Require coverage evidence in the test output. */
    requireCoverage: boolean;
    /** Minimum coverage percentage when coverage is required. */
    minCoveragePct: number;
}
/**
 * Evaluate the tests phase: the latest run color, the open red window, and
 * (optionally) the coverage percentage. Deterministic — no model calls.
 * @param evidence - the folded test evidence.
 * @param config - the tests-phase tuning.
 * @returns the settled phase result.
 */
export declare function evaluateTests(evidence: TestEvidence, config: TestsGateConfig): GatePhaseResult;
/** The structured output the consistency and local review subagents must satisfy. */
export declare const GATE_FINDINGS_SCHEMA: ObjectJsonSchema;
/**
 * Evaluate the consistency phase from the local reviewer's findings: blocker
 * and major findings are red lights, minor/info findings are warnings, and
 * an unavailable reviewer is an honest skip (never a red light — a broken
 * critic is not evidence of a defect, and a skipped phase keeps the verdict
 * honest instead of silent).
 * @param findings - the structured findings, or null when the reviewer could not run.
 * @param unavailableReason - why the reviewer could not run (for the skip notice).
 * @returns the settled phase result.
 */
export declare function evaluateConsistency(findings: ReviewFinding[] | null, unavailableReason: string): GatePhaseResult;
/** The dsh-auto-review engine's durable evidence folded from the log. */
export interface EngineReviewEvidence {
    engine: 'dsh-auto-review';
    /** Calls the engine approved. */
    approvals: number;
    /** Calls the engine rejected. */
    rejections: number;
    /** The latest risk level on record, or null. */
    latestRisk: string | null;
}
/**
 * Fold the dsh-auto-review engine's durable verdict records
 * (`autoReview/verdict` / `autoReview/rejection`) from the session log. The
 * engine row provides no service, so its verdict events ARE the weak
 * dependency: records present means the engine is installed and has judged
 * this session's calls; no records means it did not run, and the gate
 * degrades to the local reviewer.
 * @param events - the session's append-only event log.
 * @returns the engine evidence, or null when the engine has no records here.
 */
export declare function foldAutoReviewEvidence(events: readonly SessionEvent[]): EngineReviewEvidence | null;
/**
 * Evaluate the review conclusion phase. With `engine: auto`, the engine's
 * durable verdict records are the evidence; when the engine has no records
 * (not installed, or nothing triggered it this session), the phase degrades
 * to the local reviewer's findings with a warn check naming the degrade
 * reason. With `engine: local`, the local reviewer is always the evidence.
 * A rejected engine call is a red light.
 * @param engine - the engine evidence, or null.
 * @param localFindings - the local reviewer's findings, or null when it could not run.
 * @param localUnavailable - why the local reviewer could not run.
 * @param engineConfigured - the configured engine preference.
 * @param degradeNote - why the engine was not used (for the warn check).
 * @returns the settled phase result and the engine that produced it.
 */
export declare function evaluateReview(engine: EngineReviewEvidence | null, localFindings: ReviewFinding[] | null, localUnavailable: string, engineConfigured: 'auto' | 'local', degradeNote?: string | null): {
    result: GatePhaseResult;
    engine: GateReviewEngine;
};
/** A disabled phase: present in the report as skipped, contributing nothing. */
export declare function skippedPhase(phase: GatePhase): GatePhaseResult;
/**
 * Derive the gate's binary decision: any enabled phase with a failing check
 * means rework. Warnings and skipped phases never flip the decision — a
 * skipped review keeps the report honest ("not reviewed") without inventing
 * a red light.
 * @param phases - the settled phase results.
 * @returns the gate verdict.
 */
export declare function deriveGateVerdict(phases: readonly GatePhaseResult[]): GateVerdict;
/**
 * The count of red-light (failing) checks across the phases.
 * @param phases - the settled phase results.
 * @returns the red-item count.
 */
export declare function countRedChecks(phases: readonly GatePhaseResult[]): number;
/**
 * Redact secrets from a model-produced text. The gate report is auditable
 * by policy: counts, ids, and verdicts only. This scrubber catches the
 * common credential shapes (cloud keys, GitHub tokens, OpenAI-style keys,
 * Slack tokens, bearer tokens, private-key blocks, password assignments,
 * and long hex/base64 runs) before a finding title or detail is stored or
 * shown, so a reviewer quoting evidence cannot leak a credential.
 * @param text - the text to scrub.
 * @returns the text with recognized secrets replaced by `[redacted]`.
 */
export declare function redactSecrets(text: string): string;
/**
 * Render the settled gate state as the model/human-facing markdown report —
 * the `/gate run` output, ready to paste into a PR description.
 * @param state - the settled gate state.
 * @param planSuggestion - whether to append the plan-mode re-check suggestion.
 * @returns the report document.
 */
export declare function renderGateReportMarkdown(state: GateState, planSuggestion: boolean): string;
/**
 * Render one phase's checklist as markdown lines (shared by the full report
 * and the `/gate status` panel).
 * @param result - the phase result to render.
 * @returns the markdown lines, without the trailing blank line.
 */
export declare function renderPhaseMarkdown(result: GatePhaseResult): string[];
/** Human-readable phase headings (stable English audit ids). */
export declare function phaseLabel(phase: GatePhase): string;
