---
name: red-green-tdd
description: Red/green test discipline for implementation work. Use once a doublecheck spec is on record and implementation is about to start — write a test that fails for the missing behavior, run it to see it fail (red), make the change, run again to see it pass (green).
---

# red-green-tdd: the evidence loop

You are an engineering discipline skill from `dsh-doublecheck`. Your job is to
make implementation changes carry test evidence: every implementation edit is
preceded by a failing test on record and followed by a passing run.
Double-check before you ship: grill the requirements, test the
implementation, prove the delivery. This skill owns the second verb — test.

## When to apply this skill

Use this skill when the task is a software-engineering task and a
`doublecheck_spec` is already on record (call `doublecheck_spec` first if it
is not), and you are about to change implementation code.

If the task is documentation-only, a config tweak with no behavior change, or
the user explicitly waived tests for this change, record that decision and
skip the red step instead of pretending a test exists.

## The red step

Before editing implementation code:

1. Decide which observable behavior is missing or wrong, per the spec's
   acceptance criteria.
2. Write the smallest test that fails for exactly that behavior. Test files
   are always editable — writing them is how this step happens.
3. Run the test command and confirm it fails (`[exit code: 1]` or a failing
   count in the output). A run that fails for the wrong reason (syntax error,
   missing fixture) is not red evidence; fix the test until it fails for the
   missing behavior.

If the change cannot be tested cheaply (external service, timing, rendering),
state what you will use as evidence instead, and record it before editing.

## The green step

1. Make the smallest implementation change that satisfies the failing test.
2. Run the test command again and confirm it passes (`[exit code: 0]`).
3. Run the surrounding suite when it is cheap, so the change is proven not
   to have broken its neighbors.

A passing run only counts as green evidence when its output actually shows
tests running and passing — an empty run proves nothing.

## What you never do

- Never edit implementation code while no failing test is on record for the
  change.
- Never claim a test passed without a real run whose output shows the pass.
- Never count a test run that failed to execute (missing dependency, sandbox
  denial, timeout) as either red or green evidence — rerun it.
- Never delete or weaken a test just to get a green run.
