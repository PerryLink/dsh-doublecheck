/**
 * The doublecheck report fold: consolidate the durable discipline evidence of
 * one session into report facts, derive the delivery verdict, and render the
 * model-facing report document.
 *
 * Everything here folds the session log alone — the spec (from the
 * `doublecheck_spec` call arguments), the test-run timeline (red/green
 * outcomes), the implementation edits, and the injected
 * `doublecheck-review` source records — so a report re-derived after resume
 * or fork reads identically.
 *
 * @module dsh-doublecheck/domain/report
 */
import type { SessionEvent } from '@deepseek-ai/dsh-session';
import type { ObjectJsonSchema } from '@deepseek-ai/dsh-tools';
import type { WorkflowMeta } from '@deepseek-ai/dsh-workflow';
import { type TestRunDetection } from './evidence.ts';
import { type GrilledSpec, type ReportVerdict, type ReviewFinding, type ReviewVerdict, type VerifyCheck } from './vocabulary.ts';
/** One timeline row of the report fold, in log order. */
export interface ReportTimelineEntry {
    /** The evidence kind this row records. */
    kind: 'spec' | 'red' | 'green' | 'review';
    /** Short human-readable detail (command, spec goal preview, or verdict). */
    detail: string;
}
/** The folded discipline facts of one session. */
export interface ReportFacts {
    /** The latest committed spec, or null before any spec exists. */
    spec: GrilledSpec | null;
    /** Counts of failing and passing test runs on record. */
    testRuns: {
        failed: number;
        passed: number;
    };
    /** Spec/test/review evidence in log order. */
    timeline: ReportTimelineEntry[];
    /** Implementation edits (non-test-file mutations) on record. */
    edits: number;
    /** The latest injected adversary review, or null when none ran. */
    review: {
        verdict: ReviewVerdict;
        findings: ReviewFinding[];
    } | null;
}
/** The full canonical report value the tool returns. */
export interface ReportData extends ReportFacts {
    /** The derived delivery status. */
    verdict: ReportVerdict;
    /** Verification checks, when the verify workflow ran. */
    verification: {
        checks: VerifyCheck[];
    } | null;
    /** Workspace markdown copy outcome. */
    path: string | null;
    written: boolean;
}
/** Empty facts: nothing evidenced yet. */
export declare function emptyReportFacts(): ReportFacts;
/**
 * Fold a session log into report facts.
 * @param events - the session's append-only event log.
 * @param detection - the compiled test-run/mutation detection knobs.
 * @returns the complete folded facts.
 */
export declare function foldReportFacts(events: readonly SessionEvent[], detection: TestRunDetection): ReportFacts;
/**
 * Derive the delivery verdict from the folded facts, the optional review,
 * and the optional verification outcome.
 * @param facts - the folded session facts.
 * @param checks - verification checks when the verify workflow ran, else null.
 * @returns the report verdict.
 */
export declare function deriveReportVerdict(facts: ReportFacts, checks: VerifyCheck[] | null): ReportVerdict;
/** Render the report facts as the model-facing markdown document. */
export declare function renderReportMarkdown(data: ReportData): string;
/** The structured output each verification child must satisfy. */
export declare const VERIFY_CHECK_SCHEMA: ObjectJsonSchema;
/** The verify workflow identity block. */
export declare const VERIFY_META: WorkflowMeta;
/**
 * Build the verify workflow script body: one parallel checker per spec
 * dimension, each an adversarial one-dimension audit of the inherited
 * session, returning the structured check schema.
 * @returns the plain-JS script body for `WorkflowStartRequest.script`.
 */
export declare function buildVerifyScript(): string;
//# sourceMappingURL=report.d.ts.map