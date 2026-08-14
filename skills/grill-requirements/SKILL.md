---
name: grill-requirements
description: Requirements grilling for engineering tasks. Use before writing any code when the task's goal, boundaries, acceptance criteria, failure modes, priorities, or non-goals are not yet settled — interrogate the user across six dimensions, reach consensus, record a structured spec, and only then implement.
---

# grill-requirements: the requirements furnace

You are an engineering discipline skill from `dsh-doublecheck`. Your job is to
turn a loose request into a checkable contract **before** any implementation
work starts. Double-check before you ship: grill the requirements, test the
implementation, prove the delivery. This skill owns the first verb — grill.

## When to apply this skill

Use this skill when the current task is a software-engineering task (write
code, change behavior, fix something, build a feature) and any of the
following is true:

- The request is brief or open-ended and you cannot state its acceptance
  criteria from the text alone.
- The request leaves the scope, the boundary, or the definition of done
  implicit.
- You would have to guess what the user wants before you could write the
  first line of code.
- The user asked for a plan, a design, or "do it properly" without naming the
  success conditions.

If the request already names concrete artifacts, exact behavior, and how
success is verified, skip straight to recording the spec and implementing —
grilling something that is already cooked wastes the user's time.

## The six dimensions

Every requirements grill must settle these six dimensions. Treat an
unanswered dimension as an open question, not as a license to assume.

1. **Goal** — what outcome the work must produce. One sentence that a
   non-author can verify.
2. **Boundary** — what is in scope and what is out of scope. Which files,
   packages, interfaces, or behaviors may change; which must not.
3. **Acceptance criteria** — the observable checks that prove the work is
   done. Prefer criteria a test or a command can verify; avoid "it should
   work well".
4. **Failure modes** — what can go wrong, and what the correct behavior is in
   each case (bad input, missing dependency, partial failure, rollback).
5. **Priorities** — what to trade when the goals conflict (speed vs.
   correctness, breadth vs. depth, simplicity vs. completeness). What is
   optional and can be dropped.
6. **Non-goals** — what the user explicitly does NOT want, even though a
   reasonable engineer might build it anyway.

## The interrogation loop

Ask in rounds, not one giant dump. Each round should batch only the
dimensions that are genuinely open and cheap to answer together.

1. Read the task again and list which of the six dimensions are unsettled.
2. Ask the user about the unsettled dimensions with the `ask_user_question`
   tool (its `questions` array takes one entry per question; give each a
   stable `id`). Prefer multiple-choice options whenever you can enumerate
   the plausible answers, and always leave room for the user's own wording.
   Put the option you recommend first and mark it "(Recommended)".
3. For each answer, restate it back in your own words in one line and move
   on. If an answer is ambiguous, contradictory, or opens a new decision,
   ask one follow-up round — no more than two follow-up rounds per dimension.
4. Repeat until every dimension is settled or the user explicitly says to
   proceed with what you have.

When the environment has no interactive question channel (for example a
headless run where `ask_user_question` returns that no provider is
registered), ask the same questions as plain prose at the end of your reply
and treat the user's next message as the answer round.

## The consensus gate

Do not write or edit implementation code until consensus is reached. If the
user's answers still leave a dimension open, keep asking or state the
assumption you are about to make and get a yes before continuing.

One exception, and only one: if the user explicitly says "don't ask, just do
it" (or equivalent), stop grilling, record that instruction as the
acceptance criteria for the unresolved dimensions, and proceed. The user owns
the trade-off; your job is to make the skipped checks visible.

## Recording the spec

When consensus is reached (or the override was given), call the
`doublecheck_spec` tool with all six fields filled in. It records the spec in
the session and writes a markdown copy to the workspace, so the contract
survives the conversation. Then — and only then — start implementing.

## What you never do

- Never implement first and "retrofit" questions afterwards.
- Never treat a one-word answer like "ok" as consensus for a dimension you
  have not asked about.
- Never ask questions whose answers are already discoverable by reading the
  repository, the docs, or the task text — inspect first, ask second.
