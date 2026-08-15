# Changelog

All notable changes to dsh-doublecheck are recorded here, newest first.

## Unreleased

- **OMDSH Workshop intake manifest**: `package.json#dshWorkshop` (`omdsh-workshop-package/v1`) declares the transactional `harness-profile` integration, lifecycle, permissions, and the named runtime capability (`/doublecheck status`) for the hub.omdsh.dev Registry intake. Author-declared facts only — verification evidence stays pending until the Workshop adapter run produces it.
- **Community engineering**: structured issue forms (bug report / feature request), a pull-request checklist template, a security policy with private vulnerability reporting, GitHub Discussions enabled (welcome post), main-branch CI status protection, npm downloads badge, and a Contributors section across the five READMEs.

## v0.6.0 — 2026-08-14

The hardening release: the whole model-visible surface honors `language`, the projection schema's runtime dependency is declared, and the gates get quieter and more precise.

- **Runtime dependency fix**: `zod` moved from devDependencies to `dependencies` — the built `lib/` imports it for the `doublecheck` projection schema (`ZodType` is the sessionProjections registry contract), and git-hosted installs skip devDependencies.
- **Complete localization**: the switch notices, the `/doublecheck` command replies (including a richer `status` line with intensity, default switch, `remindOnce`, and the edit count), the held-back-findings note, and the critic's task prompt now honor `language: 'en' | 'zh'`. The workspace spec/report documents keep their English headings as stable artifacts.
- **Fail-fast spec commit**: `doublecheck_spec` rejects empty or whitespace-only dimensions instead of recording an uncheckable contract (the invariant companion reuses the shared field list).
- **Deterministic review order**: findings are sorted blocker-first (stable within a severity) in both the injected prose and the durable `doublecheck-review` record.
- **Custom guard tools**: `mutationTargetPath` recognizes the `path` argument key beside `file_path`, and a guard-tool call that names no file at all no longer trips the red gate.
- **O(1) switch reads**: the durable `doublecheck/state` fold rides the guard's incremental snapshot instead of rescanning the whole log per tool call.
- **One effective switch**: the `/doublecheck` command now reads the same effective switch the gates enforce (process-local override → durable `doublecheck/state` → configured default), so `status` and repeated `on|off` answer consistently even on rc.6 hosts where the override is in-memory.
- **Standalone invariant companion subpath**: `dsh-doublecheck/invariant` is now a real `exports` entry (`./invariant` → `lib/invariant.js` + `.d.ts`); the row was documented but not importable before.
- **Wider default test coverage**: `deno test` and `uv run pytest` joined the default test-command patterns.
- **`strict.patch.yml` restored**: the v0.5-changeloged all-gates-`block` overlay now actually ships (added to `files`).
- **Release pipeline**: `NPM_TOKEN` lives in the repo secrets; the publish step skips versions already on the registry (idempotent re-tags) instead of failing, and a new `release` job creates the GitHub Release with the top changelog section as its notes.
- **Package metadata**: `publishConfig.access: 'public'`, `sideEffects: false`, an npm version badge across the five READMEs, and `README.hi.md` fully synced to v0.6.

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
- The `doublecheck` session projection registers through the `sessionProjections` seam (plain-JSON discipline view for UI consumers, zod-validated wire value), and the invariant companion reports package-owned write-path contradictions through the host `invariants` registry.
- The durable `doublecheck/state` write is adaptive: hosts that stamp `ignorable` store it durably; rc.6 peers keep the override process-local instead of writing an event first-party readers would reject.
- A `strict.patch.yml` overlay turns every gate on at `block` intensity; a tag-driven `publish.yml` releases to npm (needs the `NPM_TOKEN` secret).
- Guard hardening: the detection knobs always compile (bad regexes fail loud even in grill-only configs), the verify workflow's broken engine settles the report as unverified instead of failing the call, and the review text names how many findings `adversaryMaxFindings` held back.
- Coverage thresholds gate CI: ≥90% statements/lines, ≥80% branches, ≥85% functions.

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
