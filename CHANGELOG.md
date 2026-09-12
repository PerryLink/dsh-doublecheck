# Changelog

All notable changes to dsh-doublecheck are recorded here, newest first.

## [Unreleased]

### Changed

- Rename the four translated READMEs to `README-<lang>.md`. npm selects the package-page readme as the first markdown file matching its `{README,README.*}` glob (`@npmcli/package-json`, publish path), and that glob order puts `README.<lang>.md` ahead of `README.md` — so npm was serving the Simplified-Chinese file for this package too (measured on 15/15 sampled packages of the family). The new names sit outside the glob, so the English source is served again. No content changed apart from the language-switcher link each translation holds to its siblings, and the repo readme gate still passes. Takes effect with the next release; an already-published version cannot gain a corrected readme retroactively.
- Pin the `@deepseek-ai/dsh-*` dev/test dependencies to the published `0.1.5-rc.2` line and record `0.1.5-rc.2` in `dshWorkshop.compatibility.dshVersions`; the monthly Compat workflow now runs against `0.1.5-rc.2`. The peer range `>=0.1.2-rc.1 <0.2.0 || >=0.1.5-alpha.1 <0.2.0` is unchanged, so no supported host line is dropped.

## [0.9.10] - 2026-09-10

### Changed

- Pin the `@deepseek-ai/dsh-*` dev/test dependencies to the published `0.1.5-rc.1` line and record `0.1.5-rc.1` in `dshWorkshop.compatibility.dshVersions`; the monthly Compat workflow now runs against `0.1.5-rc.1`. The peer range `>=0.1.2-rc.1 <0.2.0 || >=0.1.5-alpha.1 <0.2.0` is unchanged, so no supported host line is dropped.

### Docs

- Refresh the five-language README compatibility baseline to `dsh-v0.1.5-rc.1` (verified 2026-09-10).

## [0.9.9] - 2026-09-09

### Fixed

- Register the gate settings namespace as **`doublecheck-gate`**. The previous `doublecheck.gate` name violated the host's `NAMESPACE_PATTERN` (`/^[a-z][a-z0-9-]*$/`), so `ctx.settings.register` threw a `TypeError` (the pattern has rejected dots since the settings seam landed), the guard swallowed it into a warn, and the namespace never reached `ctx.settings.describe()` — no settings surface could see or edit the checklist. The namespace is now typed against the host `SettingsProvider`, so a dotted name also fails at compile time.
- Wire the registered namespace into the runtime: `apply` now reads the resolved `SettingsScope` once at load, so the user section overrides the composition `gate.*` values for the `/gate` panel and the gate-red notice (`applies: restart`). Writes pass through `validate: validateGateConfig`, so a duplicate checklist id is refused at update time and the last good value stays in place.
- Remove the `expose: true` registration option: the host has no such option and silently ignored it.

### Changed

- Add `@deepseek-ai/dsh-settings` as a devDependency (type-only import) for the real settings contract in tests and the compile-time namespace guard; no runtime dependency change.
- Add `tests/settings.spec.ts`: the host rejects a dotted namespace with `/must match/`; `doublecheck-gate` is registered with `applies: 'restart'`, the composition base, and appears in `ctx.settings.describe()`; the row mounts without the "namespace skipped" warning; and a user section reaches the `/gate config` output. A pre-existing `doublecheck.gate` section (if any) was never read by any release and is now simply ignored.

### Docs

- Five-language READMEs and `AGENTS.md`: the `doublecheck-gate` namespace name, the `ctx.settings.describe()` visibility scope (the package ships no client card, so the shipped Web GUI plugin page does not list it), and the user-section-overrides-composition behavior.

## [0.9.8] - 2026-09-09

### Fixed

- Adapt the PTC sub-dispatch event vocabulary to the session-format V3 line: the host renamed the durable `tool/code-dispatch` event to `tool/ptc-dispatch` (payload unchanged), so on `0.1.5-alpha.1` the four evidence folds (discipline stage, test evidence, report facts, session projection) silently missed PTC test runs and dispatched `edit`/`write` calls. A shared `ptcSettle()` normalizer now folds the current label and matches the predecessor label structurally, so both the published `0.1.2-rc.1` line and the V3 line stay supported by the unchanged peer band.
- Point `scripts/scan-sessions.mjs` at the generation-suffixed log filename (`session.v3.jsonl.zstd`, highest `vN` per directory) instead of the hardcoded flat `session.jsonl.zstd`, and require the session project directory as an explicit argument so the tool can never default to the real `~/.dsh` store.

### Changed

- Add the `typecheck:ci` gate (`tsconfig.ci.json`, published-type resolution) and run it in `prepublishOnly`; no behavior change.
- Extend the CI/compat install probes to a `0.1.2-rc.1` + `0.1.5-alpha.1` matrix instead of replacing the old pin, so both release lines keep an install smoke.

### Docs

- Refresh the five-language README compatibility sections: harness baseline `dsh-v0.1.5-alpha.1`, the `tool/ptc-dispatch` event name, and the `Session.append` / settings-seam facts re-verified on `0.1.5-alpha.1`; no behavior change.

## [0.9.7] - 2026-09-07

### Fixed

- Regenerate the committed `lib/` after the seam-marker docs commit so the CI build-drift gate stays green; no behavior change.

### Docs

- Fix the DSH plugin badge URL: shields.io rejects the four-segment static badge form with "404 badge not found"; the label now uses the documented double-dash form (`dsh--plugin`), rendering identically; no behavior change.


## [0.9.6] - 2026-09-07

### Fixed

- Align the `@deepseek-ai/dsh-*` peer ranges to `>=0.1.2-rc.1 <0.2.0`: the older `>=0.1.0-rc.8 <0.2.0` band resolved to only the `0.1.0-rc.8` prerelease under registry-driven resolution and broke fresh tarball installs; no behavior change.

### Docs

- Refresh the five-language README support-version wording: the verified GitHub tag `dsh-v0.1.3-alpha.1` now leads the compatibility claim, while npm `0.1.2-rc.1` stays the published dependency-pin line (peers `>=0.1.2-rc.1 <0.2.0`); no behavior change.


## [0.9.5] - 2026-09-04

### Changed

- Align the devDependency pins to the published dsh `0.1.2-rc.1` line (11 packages), move the CI/compat `dsh` CLI probes from `0.1.1-rc.2` to `0.1.2-rc.1`, extend the `minimumReleaseAgeExclude` list with the rc.1 line, and re-verify the adaptation claims; no behavior change (the runtime still detects the non-stamping host by probe, so durable writes keep being skipped).

## [0.9.4] - 2026-09-02

### Docs

- Sync the five-language READMEs to the 0.1.2-alpha.5 facts; no behavior change.

## [0.9.3] - 2026-09-02

### Changed

- Align the devDependency pins to the published dsh 0.1.2-alpha.5 line and re-verify the adaptation claims; no behavior change.

## [0.9.2] - 2026-09-01

### Changed

- Align the devDependency pins to the published dsh `0.1.2-alpha.3` line (11 `@deepseek-ai/dsh-*` packages) and align `cordis`/`schemastery` to `^4.0.2`/`^3.18.2`. The durable-write gate behavior is unchanged on `0.1.2-alpha.3` (`Session.append` still cannot stamp the `ignorable` envelope); the five-language READMEs record the alpha.3 fact.

## [0.9.1] - 2026-08-30

### Fixed

- Tests no longer import the `CallId` brand from `@deepseek-ai/dsh-llm` (renamed to `ToolCallId` on host master): the call-id brand is now derived from the `dsh-tools` execution contract, staying green on both the published rc line and the 0.1.2-alpha.1 checkout.
- Docs now state the 0.1.2-alpha.1 reality for the durable `doublecheck/state` / `doublecheck/gate` writes: the host removed the `ignorable` envelope, so the probe fails safe and the switch degrades to process-local. Behavior unchanged.

## [0.9.0] - 2026-08-26

### Added

- **Headless CI gate report (JSON/SARIF).** `/gate run` now also writes a `gate-report.json` next to `gate-report.md` — the same settled `GateState` as lossless JSON. The new `doublecheck-gate` CLI serializes that state to JSON or SARIF 2.1.0 for GitHub Actions PR comments/status checks (`doublecheck-gate --format json|sarif --input gate-report.json`), exiting `0` on `deliverable` and `1` on `rework`. The CLI never re-runs the four-phase gate or the evidence folds — it only serializes the already-settled state.

## [0.8.0] - 2026-08-23

### Added

- **dsh-eval evidence in the test-evidence phase**: the new `gate.tests.evalReports.*` config block (weak dependency, `enabled: false` by default) folds the dsh-auto-review eval engine's `dsh-eval` report file — its prompt-regression / stress / fairness suites — into the gate's test evidence as one audit-safe counts check. A present report whose suite passed every case is a pass; a report with failing/erroring/cancelled cases is a red light with a rework suggestion; a missing or malformed report degrades to an honest skip (or a red light when `required: true`). The folded counts ride the durable `doublecheck/gate` record, so a settled run still replays even though the source file is not part of the session log.

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
- **Package metadata**: `publishConfig.access: 'public'`, `sideEffects: false`, an npm version badge across the five READMEs, and `README-hi.md` fully synced to v0.6.

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
