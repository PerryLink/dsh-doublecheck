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
import { readFileSync } from 'node:fs';
import { renderGateReportJson, renderGateReportSarif } from "./domain/gate.js";
/** Parse CLI arguments into `{ format, input }`. */
function parseArgs(argv) {
    let format = 'json';
    let input = null;
    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === '--format' || arg === '-f') {
            const next = argv[index + 1];
            if (next !== 'json' && next !== 'sarif')
                throw new Error(`--format must be json or sarif, got ${JSON.stringify(next)}`);
            format = next;
            index += 1;
        }
        else if (arg === '--input' || arg === '-i') {
            input = argv[index + 1] ?? null;
            if (input === null)
                throw new Error('--input requires a file path');
            index += 1;
        }
        else if (arg === '--help' || arg === '-h') {
            throw new Error('usage: doublecheck-gate [--format json|sarif] [--input <file>]');
        }
        else if (!arg.startsWith('-')) {
            input = arg;
        }
        else {
            throw new Error(`unknown argument ${JSON.stringify(arg)}`);
        }
    }
    return { format, input };
}
/** Read the gate-state JSON from the input file or stdin (fd 0). */
function readState(input) {
    const raw = input !== null ? readFileSync(input, 'utf8') : readFileSync(0, 'utf8');
    return JSON.parse(raw);
}
/** Render and print the report, returning the process exit code. */
function main(argv) {
    let format;
    let input;
    try {
        ;
        ({ format, input } = parseArgs(argv));
        const state = readState(input);
        process.stdout.write((format === 'sarif' ? renderGateReportSarif : renderGateReportJson)(state) + '\n');
        return state.verdict === 'rework' ? 1 : 0;
    }
    catch (error) {
        process.stderr.write(`doublecheck-gate: ${error instanceof Error ? error.message : String(error)}\n`);
        return 2;
    }
}
process.exitCode = main(process.argv.slice(2));
