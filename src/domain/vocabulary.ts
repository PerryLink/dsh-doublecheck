/**
 * Shared discipline vocabulary: the durable structured facts the review and
 * report modules exchange. Kept type-only and import-cycle-free so events,
 * domain folds, and tool implementations all read the same definitions.
 *
 * @module dsh-doublecheck/domain/vocabulary
 */

/** The six dimensions of a grilled requirements spec (v0.1 canonical fields). */
export interface GrilledSpec {
  /** What outcome the work must produce, in one verifiable sentence. */
  goal: string
  /** What is in scope and what is out of scope for this change. */
  scope: string
  /** Observable checks that prove the work is done. */
  acceptanceCriteria: string
  /** What can go wrong and the correct behavior in each case. */
  failureModes: string
  /** What to trade when goals conflict; what is optional. */
  priorities: string
  /** What the user explicitly does not want. */
  nonGoals: string
}

/** One structured objection from the adversary review. */
export interface ReviewFinding {
  /** How much the finding threatens the delivery claim. */
  severity: 'blocker' | 'major' | 'minor' | 'info'
  /** One-line statement of the objection. */
  title: string
  /** The evidence in the session that supports the objection. */
  detail: string
}

/** What the adversary review concluded. */
export type ReviewVerdict = 'findings' | 'clean' | 'unavailable'

/** The derived delivery status of a doublecheck report. */
export type ReportVerdict =
  | 'grill'        // no spec on record — requirements unsettled
  | 'draft'        // spec exists but no implementation edits yet
  | 'red'          // latest test evidence is a failing run
  | 'green'        // green but unreviewed (no review or the critic could not run)
  | 'objections'   // the review produced findings
  | 'verified'     // green and the review came back clean
  | 'proven'       // green, reviewed clean, and every verification dimension passed
  | 'challenged'   // verification found at least one failing check
  | 'unverified'   // verification ran but not every spec dimension returned a verdict

/** One dimension checked by the verify workflow. */
export type VerifyDimension =
  | 'goal'
  | 'scope'
  | 'acceptanceCriteria'
  | 'failureModes'
  | 'priorities'
  | 'nonGoals'

/** All verify dimensions, in spec order. */
export const VERIFY_DIMENSIONS: readonly VerifyDimension[] = [
  'goal',
  'scope',
  'acceptanceCriteria',
  'failureModes',
  'priorities',
  'nonGoals',
]

/** One settled verification check. */
export interface VerifyCheck {
  /** The spec dimension this check examined. */
  dimension: VerifyDimension
  /** Whether the delivery satisfies this dimension on the session evidence. */
  verdict: 'pass' | 'fail'
  /** What in the session supports the verdict. */
  evidence: string
  /** Optional note about what to fix or re-examine. */
  note: string
}
