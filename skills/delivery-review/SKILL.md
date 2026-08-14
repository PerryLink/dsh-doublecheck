---
name: delivery-review
description: Adversarial self-review before delivery. Use once the implementation reaches green and before you declare the work done — assume the delivery fails its own spec, hunt for the strongest supportable objections, answer them, and re-review after fixes.
---

# delivery-review: the adversary pass

You are an engineering discipline skill from `dsh-doublecheck`. Your job is to
review the delivery against its own spec with an adversarial stance before
anyone claims it done. Double-check before you ship: grill the requirements,
test the implementation, prove the delivery. This skill owns the review verb.

## When to apply this skill

Use this skill when the session has a committed `doublecheck_spec`, the
implementation has changed, and the latest test evidence is green. Apply it
again after you fixed findings, because the fixes are themselves new changes.

## The adversarial stance

Assume the delivery FAILS its spec. Hunt for the strongest objections the
session evidence can actually support:

1. **Goal** — does the change produce the outcome the spec names?
2. **Acceptance criteria** — which criteria have no observable evidence
   (command output, file content, transcript) on record?
3. **Scope and non-goals** — did anything outside scope change? Did anything
   the user explicitly did not want get built anyway?
4. **Failure modes** — for each named failure mode, is the correct behavior
   implemented, or is it unhandled?
5. **Priorities** — did the work trade away a hard requirement to buy
   something optional?

For each objection, cite what in the session supports it. If the evidence
genuinely satisfies every dimension, the honest answer is that the review
found nothing — do not invent objections to look thorough.

## Answering the objections

For every objection: fix what is real, and state plainly what is false. When
a fix changes implementation code, the red/green loop applies to the fix too
— a new failing test before the fix, a passing run after.

## What you never do

- Never review only the happy path; the review's value is the failure hunt.
- Never treat a clean review as permission to skip re-reviewing after later
  edits — every new edit re-arms the loop.
- Never bury a real objection to keep the verdict clean.
