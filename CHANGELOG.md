# Changelog

All notable changes to dsh-doublecheck are recorded here, newest first.

## v0.4.0 — 2026-08-14

The discipline loop is complete: **grill → design → red → green → review → verify**.

- `doublecheck_report` tool (grill row): folds the durable session evidence (spec from the spec call arguments, red/green test timeline, implementation edits, the injected `doublecheck-review` record) into a structured delivery report with a derived verdict (`grill` / `draft` / `red` / `green` / `objections` / `verified` / `proven` / `challenged`) and a workspace markdown copy.
- Verification workflow: `ctx.workflowEngine.start()` orchestrates one parallel adversarial checker per spec dimension (structured checks, `verifyProvider`, honest `verification: null` degradation when the seam is missing).
- Durable structured review: the adversary injection now rides a new `doublecheck-review` `MessageSourceMap` kind, so the report folds findings without re-parsing prose.
- Shared `DEFAULT_*` evidence constants; report-scoped classification knobs independent of the guard row.
- Vagueness: hyphenated keywords (e.g. `retry-limit`) mark a brief task concrete, with bare/edge-hyphen counterexamples.
- 103/103 tests across 8 files; typecheck, lint, build green.

## v0.3.0 — 2026-08-14

- Adversary review: once a delivery reaches green, a forked critic subagent (`ctx.subagents.start`, default `fork` provider, structured findings schema, read-only tool allowlist, hard timeout) audits the session against the committed spec. `remind` injects the critique; `warn`/`block` additionally steer one round. Honest "unavailable" notice when the critic cannot run.
- `modules.adversary` and `adversaryModel` are real switches; new knobs `adversaryProvider`, `adversaryMaxFindings`, `adversaryTools`, `adversaryTimeoutMs`.
- `doublecheck/review` event; the seam is validated lazily at review time (row load order made an apply-time check unreliable in real profiles).
- Vagueness: quoted keywords (ASCII + CJK quotes) and underscore keywords mark a brief task concrete.
- 87/87 tests; full-loop headless verification recorded from the session log.

## v0.2.0 — 2026-08-14

- Red gate (`tools/pre-execute`): implementation edits require a failing test run on record since the last passing run; test-file edits are always allowed. `intensity` picks `remind`/`warn`/`block`.
- Green gate (`agent/turn-stopping`): edits without a passing run inject a completion reminder.
- Test-run evidence folded from `tool/call` + `tool/result` + `tool/code-dispatch` (shell command patterns, exit-code markers, Code Mode sub-dispatches); `modules.tdd` is a real switch.
- 70/70 tests; block-mode headless verification recorded 2 red-gate denials, 1 reminder injection, red exit=1 evidence, then a green run.

## v0.1.0 — 2026-08-14

- `grill-requirements` bundled skill (six-dimension requirements interrogation via `ask_user_question`, consensus gate, prose fallback without a provider).
- `doublecheck_spec` and `doublecheck_skills` tools; skill capability seam registration (`source: bundled`).
- Discipline guard: vague task + no spec + heading for `edit`/`write` → remind / hold for approval / block.
- State derives from the session log alone; model-visible ⟺ logged throughout.
- 42/42 tests; dump-config, headless, and tarball-install acceptance runs.

## Acknowledgments

Methodology inspired by [obra/superpowers](https://github.com/obra/superpowers) and [TimothyVang/Grill-me](https://github.com/TimothyVang/Grill-me); original implementation.
