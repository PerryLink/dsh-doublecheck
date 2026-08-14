# Changelog

All notable changes to dsh-doublecheck are recorded here, newest first.

## v0.5.0 — 2026-08-14

The discipline loop gets a human-facing cockpit and a hardened delivery pipeline.

- `/doublecheck` session command: `status` (effective switch + modules + folded stage), `report` (folds the delivery report on the spot), `on|off` (durable `doublecheck/state` session event — survives restart, resume, and fork; model-visible switch notice).
- Master switch: `enableByDefault` config (default `true`) plus the per-session override; when off, all gates delegate to the human chain.
- Red/green gates on by default: `modules.tdd` now defaults to `true` (v0.5 decision — the "test the implementation" check is free of model cost; the adversary fork remains opt-in).
- Durable `remindOnce`: reminder flags are folded from the log (plugin notice sources), so a reminder is never repeated after restart/resume.
- Injected prose localized: `language: 'en' | 'zh'` (prose module).
- Engineering closure: 3-OS × 2-Node CI matrix, coverage gate, real-transcript regression fixtures, `typescript` moved to `dependencies` (self-contained `prepare`), `lib/` committed without source maps, `cordis.patch.yml` slimmed to non-default overrides only, `repository`/`homepage`/`bugs` metadata.
- Verification refactor: the report's verification folds carry a `complete` flag; `proven` requires a verdict on every spec dimension.
- Verify workflow gains `verifyMode` (`all` fans out one parallel checker per dimension, `single` runs one combined checker).
- The grill gate reopens on a new direct-user task after the latest spec commit (seq comparison): follow-up requests are grilled under their own spec.
- Delivery gate (`agent/turn-stopping`): green reached with no `doublecheck_report` on record injects a report-expected reminder; a successful report advances the stage fold to `verify`.
- The adversary review re-arms durably: implementation edits after the latest review record trigger a second round; the critic aborts with the turn's signal.
- Code Mode edit dispatches count as implementation edits in the guard and report folds (the policy gates already saw them).
- Three new bundled skills: `red-green-tdd`, `delivery-review`, `delivery-proof` — stages 3–6 of the loop now have model guidance.
- Report timeline rows truncate long shell commands to a readable preview.

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
