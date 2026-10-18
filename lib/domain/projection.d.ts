/**
 * The `doublecheck` session projection: the discipline facts a client renders
 * (Web UI status row), folded from the durable session log alone.
 *
 * The state is plain JSON (the persisted-cache precondition of the projection
 * registry) and mirrors the guard's own fold: a successful `doublecheck_spec`
 * pair commits the spec goal, test runs move the color, implementation edits
 * bump the edit count, and a `doublecheck-review` source record marks the
 * delivery reviewed. Resumed and forked sessions fold to the same view.
 *
 * The WIRE value is not this state: it is one bounded single-line string this
 * module renders (`renderDoublecheckLine`), because a JSON object of these
 * eight fields is at best 126 characters and every generic one-line renderer
 * truncates it — the old object view lost `gateVerdict`/`gateRedCount`
 * outright. See {@link DOUBLECHECK_LINE_MAX}.
 *
 * @module dsh-doublecheck/domain/projection
 */
import type { SessionEvent } from '@deepseek-ai/dsh-session';
import { type TestRunDetection } from './evidence.js';
import { type DisciplineStage, type TestColor } from './stages.js';
import { type GateVerdict } from './gate.js';
import type { DoublecheckView } from '../types.js';
/**
 * The hard budget of the wire line, in UTF-16 code units — the same unit
 * `String#length` and every one-line renderer measure.
 *
 * 120 is not arbitrary: the WeChat bridge's generic projection renderer
 * (`dsh-wechat` `renderProjectionValue`) keeps a value only while
 * `value.length <= 120` and otherwise cuts it to 117 units plus `…`. The
 * object-shaped view this projection used to emit was 131 units when EMPTY
 * and 139 with a short goal, so it was truncated for every possible value and
 * the two fields a user reads on a phone (`gateVerdict`, `gateRedCount`) were
 * exactly the ones cut off. A single bounded line keeps the whole payload
 * inside every renderer's first line.
 */
export declare const DOUBLECHECK_LINE_MAX = 120;
/**
 * Longest `goal:` excerpt kept on the line, in UTF-16 code units. A goal is
 * free text and is the one lossy field: it is sanitized to one line and
 * clipped (never dropped silently — a clipped excerpt ends with `…`). The
 * three fields a user reads first (`gate:`, `stage:`, `r<red>`) are never
 * clipped.
 */
export declare const DOUBLECHECK_GOAL_MAX = 40;
/** The projection unit's plain-JSON fold state. */
export interface DoublecheckProjectionState {
    /** The last discipline stage a successful call or test run reached. */
    stage: DisciplineStage;
    /** The latest test-run evidence: red = failing since the last pass. */
    color: TestColor;
    /** Whether a successful `doublecheck_spec` call exists in the log. */
    hasSpec: boolean;
    /** The goal of the latest committed spec, or '' before any spec. */
    specGoal: string;
    /** Whether an adversary review record exists in the log. */
    reviewed: boolean;
    /** Total implementation edits folded so far. */
    editCount: number;
    /** The latest delivery-gate verdict, or 'none' before any gate run. */
    gateVerdict: 'none' | GateVerdict;
    /** Red-light (failing) checks of the latest gate run. */
    gateRedCount: number;
    /** Spec-tool call ids (with their goals) whose results have not been folded yet. */
    pendingSpecCalls: Record<string, string>;
    /** Test-run call ids (with their commands) whose results have not been folded yet. */
    pendingTestCalls: Record<string, string>;
}
/** State for the empty log. */
export declare function emptyDoublecheckState(): DoublecheckProjectionState;
/**
 * One-event transition of the `doublecheck` projection unit. Uninterested
 * events return the same state reference (the registry's change gate).
 * @param state - the folded state before `event`.
 * @param event - one committed session event.
 * @param detection - the compiled red/green evidence knobs.
 * @returns the next state; the same reference when the event is not a
 *   discipline fact.
 */
export declare function applyDoublecheckEvent(state: DoublecheckProjectionState, event: SessionEvent, detection: TestRunDetection): DoublecheckProjectionState;
/**
 * Fold a session log from scratch to the projection state.
 * @param events - the session's append-only event log.
 * @param detection - the compiled red/green evidence knobs.
 * @returns the complete folded state.
 */
export declare function foldDoublecheckState(events: readonly SessionEvent[], detection: TestRunDetection): DoublecheckProjectionState;
/**
 * Project the folded state to the wire payload: one status line.
 *
 * The line is built in priority order and every part is bounded, so the total
 * can never exceed {@link DOUBLECHECK_LINE_MAX}:
 *
 * 1. `gate:<verdict> r<red>` — the latest gate verdict and its red-light count.
 * 2. `stage:<stage>` — the discipline stage reached on durable evidence.
 * 3. `test:<color> edits:<n> spec:<yes|no> review:<yes|no>` — the supporting facts.
 * 4. `goal:<excerpt>` — only when a spec exists and the excerpt is non-empty;
 *    clipped to whatever budget parts 1–3 left, at most
 *    {@link DOUBLECHECK_GOAL_MAX} units.
 *
 * The worst case of parts 1–3 is 84 units (`gate:deliverable r9999+`,
 * `stage:design`, `test:green edits:99999+ spec:yes review:yes`), leaving at
 * least 28 units for the goal excerpt — so no part is ever dropped to make
 * room, and a final hard clamp backstops the invariant.
 * @param state - the folded state.
 * @returns the whole current value for the `doublecheck` projection key.
 */
export declare function viewDoublecheck(state: DoublecheckProjectionState): DoublecheckView;
/**
 * Render the fold state as the bounded single-line wire value.
 *
 * Pure and total: any state (including a hand-built or version-mismatched one
 * with absurd counts) yields a one-line string of at most
 * {@link DOUBLECHECK_LINE_MAX} code units, never a throw.
 * @param state - the folded state.
 * @returns one line, `<= DOUBLECHECK_LINE_MAX` code units, with no newline.
 */
export declare function renderDoublecheckLine(state: DoublecheckProjectionState): string;
