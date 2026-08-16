/**
 * Package-owned invariant companion for dsh-doublecheck.
 *
 * Three post-commit diagnostic checks over the events this package's write
 * paths produce (all three target events are committed before dispatch, so a
 * violation is reported — via the host registry's `fail` — rather than
 * vetoed):
 *
 * 1. Every `doublecheck/spec` announcement carries six non-empty spec fields.
 * 2. Every `doublecheck/report` announcement's verdict is consistent with the
 *    log re-derivation. When verification did not run, the two must be equal;
 *    when verification ran, a failing check must report `challenged` and a
 *    clean one must report `proven` or `unverified` (the `complete` fact rides
 *    the tool result, not this event, so equality is not checkable there).
 * 3. Every `doublecheck/review` announcement's findings satisfy the
 *    structured finding shape (severity enum, non-empty title and detail).
 * 4. Every `doublecheck/gate` announcement's verdict matches the re-derivation
 *    from its own phase results, and all four phases are present.
 *
 * The guard registers a facts-bearing installer from its own context; the
 * `./invariant` export is the standalone companion usable through a separate
 * profile row.
 * @module dsh-doublecheck/invariant
 */
import { SPEC_FIELD_NAMES } from "./domain/vocabulary.js";
import { deriveReportVerdict, foldReportFacts } from "./domain/report.js";
import { deriveGateVerdict, GATE_PHASES } from "./domain/gate.js";
/** Full npm package name owning the reported failures. */
export const PACKAGE_NAME = 'dsh-doublecheck';
/** Cordis companion plugin name. */
export const name = 'dsh-doublecheck-invariant';
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants'];
/** All six spec fields, in declaration order. */
const SPEC_FIELDS = SPEC_FIELD_NAMES;
/**
 * Build the installer over a facts source. The standalone companion and the
 * main plugin share this body; only the facts differ.
 * @param facts - the report re-derivation knobs.
 * @returns the installer the host registry activates in its child context.
 */
export function installInvariant(facts) {
    return (ctx, fail) => {
        ctx.on('doublecheck/spec', (payload) => {
            for (const field of SPEC_FIELDS) {
                if (typeof payload.spec[field] !== 'string' || payload.spec[field].trim() === '') {
                    fail(`doublecheck/spec announcement carries an empty "${field}" field`);
                }
            }
        });
        ctx.on('doublecheck/report', (payload) => {
            const folded = foldReportFacts(payload.session.events, facts.detection());
            if (payload.verification === null) {
                const rederived = deriveReportVerdict(folded, null);
                if (rederived !== payload.verdict) {
                    fail(`doublecheck/report announces verdict "${payload.verdict}" but the log re-derives "${rederived}"`);
                }
                return;
            }
            const hasFailure = payload.verification.checks.some(check => check.verdict === 'fail');
            if (hasFailure && payload.verdict !== 'challenged') {
                fail(`doublecheck/report carries a failing verification check but announces verdict "${payload.verdict}"`);
            }
            if (!hasFailure && payload.verdict !== 'proven' && payload.verdict !== 'unverified') {
                fail(`doublecheck/report carries clean verification checks but announces verdict "${payload.verdict}"`);
            }
        });
        ctx.on('doublecheck/review', (payload) => {
            const verdicts = ['findings', 'clean', 'unavailable'];
            if (!verdicts.includes(payload.verdict)) {
                fail(`doublecheck/review announces invalid verdict ${JSON.stringify(payload.verdict)}`);
            }
            for (const finding of payload.findings) {
                const severities = ['blocker', 'major', 'minor', 'info'];
                if (!severities.includes(finding.severity)) {
                    fail(`doublecheck/review finding has invalid severity ${JSON.stringify(finding.severity)}`);
                }
                if (typeof finding.title !== 'string' || finding.title.trim() === '') {
                    fail('doublecheck/review finding has an empty title');
                }
                if (typeof finding.detail !== 'string' || finding.detail.trim() === '') {
                    fail('doublecheck/review finding has an empty detail');
                }
            }
        });
        ctx.on('doublecheck/gate', (payload) => {
            const state = payload.state;
            const derived = deriveGateVerdict(GATE_PHASES.map(phase => state.phases[phase]).filter(phase => phase !== undefined));
            if (derived !== state.verdict) {
                fail(`doublecheck/gate announces verdict "${state.verdict}" but its phases derive "${derived}"`);
            }
            for (const phase of GATE_PHASES) {
                if (state.phases[phase] === undefined) {
                    fail(`doublecheck/gate carries no "${phase}" phase result`);
                }
            }
        });
    };
}
/**
 * Resolve the host registry through Cordis's named service lookup. Keeping
 * this narrow local contract lets the companion build without host source
 * files; a composed DSH profile still supplies the real `invariants` service.
 * @param ctx - Cordis context carrying the host service.
 * @returns the host invariant registry.
 * @throws {Error} when the companion is loaded without its host service.
 */
function getInvariantRegistry(ctx) {
    const registry = ctx.get('invariants');
    if (registry === undefined) {
        throw new Error(`invariant companion requires the "invariants" service for ${PACKAGE_NAME}`);
    }
    return registry;
}
/** Facts for the standalone companion: the report check degrades to no test-run evidence. */
const COMPANION_FACTS = {
    detection: () => ({
        testToolNames: [], testCommandPatterns: [], mutationTools: [], testFilePatterns: [],
    }),
};
/**
 * Register the standalone companion with envelope-only facts.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx) => Promise.resolve(getInvariantRegistry(ctx).register(PACKAGE_NAME, installInvariant(COMPANION_FACTS)));
