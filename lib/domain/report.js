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
import { isTestCommand, isTestFilePath, joinTextBlocks, mutationTargetPath, parseRawArguments, shellCommand, testOutcome, } from "./evidence.js";
import { SPEC_TOOL_NAME } from "./stages.js";
import { VERIFY_DIMENSIONS, } from "./vocabulary.js";
/** Maximum timeline rows rendered into the report document. */
const TIMELINE_RENDER_CAP = 20;
/** Empty facts: nothing evidenced yet. */
export function emptyReportFacts() {
    return { spec: null, testRuns: { failed: 0, passed: 0 }, timeline: [], edits: 0, review: null };
}
/**
 * Fold a session log into report facts.
 * @param events - the session's append-only event log.
 * @param detection - the compiled test-run/mutation detection knobs.
 * @returns the complete folded facts.
 */
export function foldReportFacts(events, detection) {
    const facts = emptyReportFacts();
    const pendingTests = new Map();
    for (const event of events) {
        switch (event.type) {
            case 'tool/call': {
                const args = parseRawArguments(event.data.arguments);
                if (event.data.name === SPEC_TOOL_NAME) {
                    const spec = readSpecFromArgs(args);
                    if (spec !== null) {
                        facts.spec = spec;
                        facts.timeline.push({ kind: 'spec', detail: preview(spec.goal) });
                    }
                }
                const command = shellCommand(event.data.name, args, detection);
                if (command !== undefined && isTestCommand(command, detection)) {
                    pendingTests.set(event.data.callId, command);
                }
                const path = mutationTargetPath(event.data.name, args, detection);
                if (path !== undefined && !isTestFilePath(path, detection)) {
                    facts.edits += 1;
                }
                break;
            }
            case 'tool/result': {
                const command = pendingTests.get(event.data.message.source.callId);
                if (command === undefined)
                    break;
                pendingTests.delete(event.data.message.source.callId);
                foldTestRun(facts, command, testOutcome(joinTextBlocks(event.data.message.content), event.data.error !== undefined));
                break;
            }
            case 'tool/code-dispatch': {
                const args = parseRawArguments(event.data.arguments);
                const command = shellCommand(event.data.name, args, detection);
                if (command !== undefined && isTestCommand(command, detection)) {
                    foldTestRun(facts, command, testOutcome(joinTextBlocks(event.data.content), event.data.isError));
                }
                break;
            }
            case 'user/message': {
                const source = event.data.source;
                if (source.kind !== 'doublecheck-review')
                    break;
                const record = source;
                facts.review = { verdict: record.verdict, findings: [...record.findings] };
                facts.timeline.push({ kind: 'review', detail: record.verdict });
                break;
            }
        }
    }
    return facts;
}
/** Fold one settled test-run outcome into the counts and timeline. */
function foldTestRun(facts, command, outcome) {
    if (outcome === 'fail') {
        facts.testRuns.failed += 1;
        facts.timeline.push({ kind: 'red', detail: command });
    }
    else if (outcome === 'pass') {
        facts.testRuns.passed += 1;
        facts.timeline.push({ kind: 'green', detail: command });
    }
}
/** Read the six spec fields from a spec tool call's arguments, or null when malformed. */
function readSpecFromArgs(args) {
    if (args === undefined)
        return null;
    const { goal, scope, acceptanceCriteria, failureModes, priorities, nonGoals } = args;
    if (typeof goal !== 'string' || typeof scope !== 'string' || typeof acceptanceCriteria !== 'string'
        || typeof failureModes !== 'string' || typeof priorities !== 'string' || typeof nonGoals !== 'string') {
        return null;
    }
    return { goal, scope, acceptanceCriteria, failureModes, priorities, nonGoals };
}
/**
 * Derive the delivery verdict from the folded facts, the optional review,
 * and the optional verification outcome.
 * @param facts - the folded session facts.
 * @param checks - verification checks when the verify workflow ran, else null.
 * @returns the report verdict.
 */
export function deriveReportVerdict(facts, checks) {
    if (facts.spec === null)
        return 'grill';
    if (facts.edits === 0)
        return 'draft';
    const lastTest = facts.timeline.findLast(entry => entry.kind === 'red' || entry.kind === 'green');
    if (lastTest?.kind === 'red')
        return 'red';
    if (checks !== null) {
        return checks.every(check => check.verdict === 'pass') ? 'proven' : 'challenged';
    }
    if (facts.review === null || facts.review.verdict === 'unavailable')
        return 'green';
    return facts.review.verdict === 'findings' ? 'objections' : 'verified';
}
/** Render the report facts as the model-facing markdown document. */
export function renderReportMarkdown(data) {
    const lines = [
        '# Doublecheck report',
        '',
        `> Verdict: **${data.verdict}**`,
        '',
        '## Spec',
    ];
    if (data.spec === null) {
        lines.push('No spec recorded; the requirements grill has not committed anything yet.', '');
    }
    else {
        lines.push(`- Goal: ${data.spec.goal}`, `- Scope: ${data.spec.scope}`, `- Acceptance criteria: ${data.spec.acceptanceCriteria}`, `- Failure modes: ${data.spec.failureModes}`, `- Priorities: ${data.spec.priorities}`, `- Non-goals: ${data.spec.nonGoals}`, '');
    }
    lines.push('## Test evidence', `- failing runs: ${data.testRuns.failed}`, `- passing runs: ${data.testRuns.passed}`, '');
    const rows = data.timeline.slice(-TIMELINE_RENDER_CAP);
    lines.push(...rows.map(row => `- [${row.kind}] ${row.detail}`));
    if (data.timeline.length > rows.length) {
        lines.push(`- … ${data.timeline.length - rows.length} earlier rows omitted`);
    }
    lines.push('', '## Adversary review');
    if (data.review === null) {
        lines.push('No adversary review ran for this session.');
    }
    else if (data.review.verdict === 'findings') {
        lines.push(...data.review.findings.map(finding => `- [${finding.severity}] ${finding.title} — ${finding.detail}`));
    }
    else {
        lines.push(`Verdict: ${data.review.verdict}`);
    }
    lines.push('', '## Verification');
    if (data.verification === null) {
        lines.push('Not run.');
    }
    else {
        for (const check of data.verification.checks) {
            lines.push(`- [${check.verdict}] ${check.dimension}: ${check.evidence} ${check.note.length > 0 ? `(${check.note})` : ''}`.trim());
        }
    }
    lines.push('', `## Delivery`, `- implementation edits: ${data.edits}`, '');
    return lines.join('\n');
}
/** The structured output each verification child must satisfy. */
export const VERIFY_CHECK_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: ['dimension', 'verdict', 'evidence', 'note'],
    properties: {
        dimension: { type: 'string', enum: [...VERIFY_DIMENSIONS] },
        verdict: { type: 'string', enum: ['pass', 'fail'] },
        evidence: { type: 'string' },
        note: { type: 'string' },
    },
};
/** The verify workflow identity block. */
export const VERIFY_META = {
    name: 'doublecheck-verify',
    description: 'Verify a doublecheck delivery across the six spec dimensions and return one check per dimension.',
    phases: [{ title: 'doublecheck verify' }],
};
/**
 * Build the verify workflow script body: one parallel checker per spec
 * dimension, each an adversarial one-dimension audit of the inherited
 * session, returning the structured check schema.
 * @returns the plain-JS script body for `WorkflowStartRequest.script`.
 */
export function buildVerifyScript() {
    return [
        "phase('doublecheck verify')",
        'const checks = await parallel(args.dimensions.map(function (dimension) {',
        '  return function () {',
        "    return agent('You verify one dimension of a requirements spec against the session you inherited. "
            + "The dimension: ' + dimension + '. The spec says: ' + args.spec[dimension] + '. "
            + "Assume the delivery FAILS this dimension. Examine the inherited session for evidence: "
            + "the recorded spec, the red/green test runs, the edits, and any review findings. "
            + "Answer through the required structured output: pass only when the session evidence "
            + "satisfies the dimension; fail otherwise, with evidence cited from the session "
            + "and a note on what to fix.',",
        `    { label: 'verify-' + dimension, schema: ${JSON.stringify(VERIFY_CHECK_SCHEMA)} })`,
        '  }',
        '}))',
        'return { checks: checks.filter(Boolean) }',
    ].join('\n');
}
/** Truncate a spec goal for timeline rows. */
function preview(text) {
    return text.length > 120 ? `${text.slice(0, 120)}…` : text;
}
//# sourceMappingURL=report.js.map