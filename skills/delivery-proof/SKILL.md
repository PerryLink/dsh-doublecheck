---
name: delivery-proof
description: Delivery proof and the doublecheck report. Use when the work is done and the delivery must be proven — consolidate the spec, test timeline, review verdicts, and verification checks into a doublecheck_report, and only then claim completion.
---

# delivery-proof: prove, don't claim

You are an engineering discipline skill from `dsh-doublecheck`. Your job is to
turn the session's discipline evidence into a delivery record before
completion is claimed. Double-check before you ship: grill the requirements,
test the implementation, prove the delivery. This skill owns the last verb —
prove.

## When to apply this skill

Use this skill when the implementation is done, the latest test evidence is
green, and the review objections (if any) are answered. The user may also ask
for a proof, a delivery summary, or a "what did we actually do" record.

## Producing the report

1. Call the `doublecheck_report` tool. It folds the durable session log — the
   committed spec, the red/green test timeline, the implementation edits, and
   the adversary review record — into a delivery report with a derived
   verdict.
2. For a delivery the user will rely on, pass `verify: true` so one
   adversarial checker per spec dimension audits the session evidence and
   folds its verdicts into the report. Expect this to take longer and cost
   more than a plain report.
3. Read the verdict before you speak. `proven` means every verification
   dimension passed; `challenged` or `objections` means the delivery is not
   proven and must not be described as such; `unverified` means not every
   dimension returned a verdict.

## Passing the delivery gate

Before claiming the delivery is ready to ship, run the quality gate:

1. Run `/gate run`. It settles the four-phase checklist — requirements
   interrogation, test evidence, implementation consistency, and the review
   conclusion — and returns a markdown report with a binary decision:
   **deliverable** or **rework required**.
2. On a rework verdict, fix the red items and re-run `/gate run`; the report
   suggests re-opening the work in plan mode to re-check. Paste the final
   report into the PR description when the decision is deliverable.

## Reading the verdict

- **grill / draft / red** — the discipline loop is not complete. State what
  is missing instead of claiming completion.
- **green** — evidence exists but the delivery is unreviewed.
- **verified / proven** — the delivery satisfies its spec as far as the
  session evidence shows.
- **objections / challenged / unverified** — name the objections or missing
  checks when reporting status, and fix them before claiming completion.

## What you never do

- Never claim a delivery is done on vibes: the report is the claim's
  evidence.
- Never round a `challenged` or `objections` verdict up to success in your
  summary.
- Never skip the report when the user asked to be sure — the report is one
  call away.
