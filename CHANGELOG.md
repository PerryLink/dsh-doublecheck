# Changelog

All notable changes to dsh-doublecheck are recorded here, newest first.

## v0.7.3 — 2026-08-22

### Changed

- **rc2 compatibility release**: every `@deepseek-ai/dsh-*` devDependency pins exactly `0.1.1-rc.2`, the CI and compat workflow pins and the `minimumReleaseAgeExclude` list follow, and the workshop manifest's `dshVersions` plus the five READMEs document the `0.1.1-rc.2` harness baseline.
- **Session-projection rc2 contract**: the `doublecheck` projection now registers the rc2 shape — `stateSchema` (a new plain-JSON state schema covering the fold bookkeeping fields) plus `wire: { viewSchema, view }` for the client-visible payload — and merges `doublecheck` into both `SessionProjectionStateMap` (host state) and `SessionProjectionMap` (client view). `@deepseek-ai/dsh-session-projection` peerDependency raises to `>=0.1.1-rc.2 <0.2.0` because the `wire`/`stateSchema` registration is rc2-only.

## v0.7.2 — 2026-08-21

### Changed

- **rc8 compatibility release**: every `@deepseek-ai/dsh-*` dependency moves to the `0.1.0-rc.8` wave — devDependencies pin exactly `0.1.0-rc.8`, peerDependencies declare `>=0.1.0-rc.8 <0.2.0`, the CI and compat workflow pins and the `minimumReleaseAgeExclude` list follow, and the workshop manifest's `dshVersions` plus the five READMEs document the `0.1.0-rc.8` harness baseline. No behavior change.

## v0.7.1 — 2026-08-19

### Fixed

- **Invariant companion survives hot-reload**: the guard's inline invariant registration now holds the host registry's disposer through the inject scope's `ctx.effect` (the registry binds its own effect to the service context, so the returned disposer is the only unregistration path). Disposing the guard fiber — config hot-reload, profile disable — unregisters the companion and its `doublecheck/*` listeners; remounting re-registers cleanly instead of throwing `package "dsh-doublecheck" is already registered`. Regression covered by a dispose-and-remount lifecycle test against a duplicate-strict registry.

## v0.7.0 — 2026-08-16

The delivery quality gate release: the discipline loop grows a productized front panel that aggregates the session's durable evidence into one **deliverable / rework required** decision.

- **Delivery quality gate** (`/gate status|run|config`): a configurable four-phase checklist — **requirements interrogation** (a key-question checklist confirmed item by item against the committed spec), **test evidence** (latest run color, failing runs after green, and an optional coverage threshold parsed from test output), **implementation consistency** (a local forked reviewer maps diffs to spec dimensions), and the **review conclusion** — folded from the durable session log. One binary decision with red items, rework suggestions, and a PR-ready markdown report (`gate-report.md` + the durable `doublecheck/gate` session event, `ignorable`-stamped).
- **dsh-auto-review weak dependency**: `gate.review.engine: auto` consumes the engine's durable `autoReview/verdict` / `autoReview/rejection` records when they exist (rejections become red lights), and degrades to the local forked reviewer with an honest warn note — "not installed" vs "installed but has no verdict records in this session" (detected structurally plus a `ctx.commands.list()` presence probe; no import, no hard dependency). `engine: local` always reviews locally. The gate never synthesizes approval requests.
- **Plan-mode integration**: a rework verdict suggests re-opening the work in plan mode — in the report banner, on the `/gate status` panel line (reading the optional `ctx.planMode` service), and in a once-per-session short turn notice riding the new `doublecheck-gate` message source (`doublecheck/reminder` gate `'gate'`, verdict `'gate-red'`).
- **Pluggable checklist (Schema config)**: `gate.requirements.checklist` is a Schema-validated array (`id` / `question` / `specDimension` / `required`), every phase has an `enabled` switch, and the thresholds and reviewer knobs are config keys; validated fail-loud at load (duplicate ids, unknown dimensions, bad regexes, empty tool lists throw) and exposed through the **`doublecheck.gate` settings namespace** (`expose: true`, `applies: restart`) when the harness settings service is mounted.
- **Audit-safe reports**: gate reports embed counts, ids, and verdicts only — no file contents or session text. Model-produced finding texts pass a secret redactor (cloud keys, GitHub/OpenAI/Slack tokens, bearer tokens, private-key blocks, password assignments, long hex/base64 runs) before storage or display.
- **Panel surfaces**: `/gate status` renders the live deterministic phases plus the latest settled run (verdict, red count, engine, timestamp); the `doublecheck` session projection now carries `gateVerdict` + `gateRedCount` (stateVersion 2); `/doublecheck status` shows the latest gate verdict; the four-phase progress doubles as the in-conversation card.
- **Short role-statement prose**: the gate-red turn notice and the consistency reviewer task open with a one-sentence role statement and stay short (Minimal-persona style); `en` / `zh` localized.
- **Invariant companion + skills**: the invariant now checks the `doublecheck/gate` announcement (verdict re-derivation, all four phases present); the `delivery-proof` skill routes the model through `/gate run` before completion claims; `strict.patch.yml` restates the full gate block with `requireCoverage: true`.
- **OMDSH Workshop intake manifest**: `package.json#dshWorkshop` (`omdsh-workshop-package/v1`) declares the transactional `harness-profile` integration, lifecycle, permissions, and the named runtime capability (`/gate status`) for the hub.omdsh.dev Registry intake. Author-declared facts only — verification evidence stays pending until the Workshop adapter run produces it.
- **Community engineering**: structured issue forms (bug report / feature request), a pull-request checklist template, a security policy with private vulnerability reporting, GitHub Discussions enabled (welcome post), main-branch CI status protection, npm downloads badge, and a Contributors section across the five READMEs.
- **CI profile smoke**: a `smoke` job packs the bundle, installs it into a scratch profile with the real `dsh` CLI, and asserts both rows mount (`scripts/assert-profile.mjs`) — the end-to-end check for `cordis.patch.yml` that unit tests cannot see. Ported from PR #1, which this closes.

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
