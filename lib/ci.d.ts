#!/usr/bin/env node
/**
 * Headless gate-report CLI for CI (`doublecheck-gate`).
 *
 * Consumes a serialized {@link GateState} (the JSON the gate settles and
 * writes next to `gate-report.md`) and emits a machine-readable report for a
 * GH Actions PR comment or status check. It does NOT re-run the four-phase
 * gate — it only serializes the already-settled state — so the gate runner
 * and the evidence folds stay exactly as they are.
 *
 * Usage:
 *   doublecheck-gate --format json --input gate-report.json
 *   doublecheck-gate --format sarif < gate-report.json
 *
 * Exit code: 0 = deliverable, 1 = rework, 2 = usage/parse error.
 *
 * @module dsh-doublecheck/ci
 */
export {};
