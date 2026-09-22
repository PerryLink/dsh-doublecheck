# AGENTS.md

Standalone DeepSeek Harness plugin repository (`dsh-doublecheck`). Development follows the dsh-plugin-guide skill and the official plugin contract; this file records repo-local decisions.

## Layout

- `src/index.ts` — package entry: the shared domain model and pure helpers. It is NOT a plugin; the installable plugin rows live at the `./grill` and `./guard` subpath exports (see `cordis.patch.yml`).
- `src/invariant.ts` — the package-owned invariant companion; its standalone row loads via the `./invariant` subpath export (reports write-path contradictions without the guard).
- `src/grill/index.ts` — plugin row `doublecheck-grill`: bundled `grill-requirements` skill provider + the model-facing contract tools (`doublecheck_skills`, `doublecheck_spec`, `doublecheck_report`) and the v0.4 verification workflow.
- `src/guard/index.ts` — plugin row `doublecheck-guard`: the policy gates (grill / tdd red-green / adversary review) on the `tools/pre-execute` and `tools/post-execute` waterfalls.
- `src/guard/command.ts` — the `/doublecheck status|report|on|off` session command and the durable `doublecheck/state` fold.
- `src/guard/review.ts` — adversary review orchestration (forked critic subagent, structured findings, honest "unavailable" degradation).
- `src/guard/gate.ts` — the delivery quality gate (v0.7): the `gate.*` Schema config, fail-loud validation, the four-phase runner (deterministic requirements/tests folds + forked consistency/local reviewers), the dsh-auto-review weak dependency (durable `autoReview/*` verdict records; degrade-to-local), the `/gate status|run|config` command, and the durable `doublecheck/gate` fold. `GateConfigSchema` is the whole guard row's one live field (`Config.gate`, marked `.volatile()` in `src/guard/index.ts`), so it is the row's editable settings card; the row reads the resolved block once at load, because `gate.enabled` decides whether the turn-boundary notice is installed.
- `src/guard/prose.ts` — the injected reminder/deny/review/gate prose, per-language (`en` / `zh`); gate notices open with a one-sentence role statement and stay short.
- `src/domain/` — pure folds and vocabularies shared by both rows (stages, evidence, vagueness, vocabulary, report, gate). No Cordis imports. `src/domain/evidence.ts` owns `ptcSettle()`, the one normalizer for settled PTC sub-dispatch events.
- `src/events.ts` — process-local Cordis event vocabulary (`@mode emit`, observability-only) + the durable `doublecheck/state` and `doublecheck/gate` `SessionEventMap` members + this package's `MessageSourceMap` members: the notice kind `dsh-doublecheck` (mixed with `ContextFormed`) and the structured `doublecheck-review` / `doublecheck-gate` records. `noticeSource()` and `noticeSummaryOf()` live here so both guard modules build a notice, and the fold reads one back, through a single definition.
- `skills/` — four bundled discipline skills (`grill-requirements`, `red-green-tdd`, `delivery-review`, `delivery-proof`), each `<name>/SKILL.md` in the generic Agent Skills layout.
- `tests/` — vitest; real Cordis `Context` with scripted services (subagents/commands) and synthetic durable events; `tests/fixtures/` holds real-transcript regression logs.
- `scripts/` — session-log tooling (`decode-session`, `extract-fixture`, `scan-sessions`; all take an explicit log/directory path and never read the real session store by default) + the gates and release helpers (`assert-profile`, `check-readme-sync`, `verify-skills`, `verify-self-contained`, `verify-artifacts`, `fix-dts`, `release-notes`, `smoke-insert` / `verify-block` / `verify-report` / `verify-review` / `verify-tdd` patch overlays).

## Hard rules applied here

- Waterfall listeners (`tools/pre-execute`, `tools/post-execute`) always call `next()` unless they claim the request; claiming a request is the only deliberate short-circuit (veto/ask) and always emits `doublecheck/reminder` first.
- Model-visible ⟺ logged: every injected reminder/review/gate command notice rides the standard channels and lands in the session log as a `user/message` event carrying this package's own message-source kind (`dsh-doublecheck` for notices, `doublecheck-review` / `doublecheck-gate` for their structured records — never the host's removed catch-all `plugin` kind); the durable spec/report/state/gate facts ride `tool/call` results or `SessionEventMap` members.
- The notice source outlives the release line: `noticeSummaryOf()` (`src/events.ts`) recognizes the current kind, the `plugin:dsh-doublecheck` kind the host's V3→V4 migration stamps on a released catch-all wrapper, and the released wrapper itself. All three must keep folding, or a resumed pre-upgrade session re-shows reminders it already showed. Build notices only through `noticeSource()`.
- Settings are the row's own Config: the host has no settings-namespace registry, so a row exposes fields by marking them `.volatile()` and registers its page policy with `settings.configure({ auto: false }, ctx.fiber)`. `Config.gate` is this package's one live field, and it is feature-detected at load (`gateField()` / `resolveGateBlock()` in `src/guard/index.ts`): a host line whose schemastery predates `.volatile()` gets plain composition config and no card, and must still mount. Read the block once at load (a deeply readonly snapshot through `.get()` there), never live.
- Fail closed / fail loud: guard config is validated in `apply` (assertions throw); the adversary and gate-reviewer seams are validated lazily at run time and degrade to honest "unavailable"/skip notices. Gate reports are audit-safe: counts, ids, and verdicts only, with secrets redacted before storage or display.
- Weak dependency on dsh-auto-review: never imported, never hard-required — the gate folds its durable verdict records and degrades to the local reviewer; the gate never synthesizes approval requests (the chain may reach a human).
- No agent-loop changes; only documented seams (skills provider, tools, `tools/pre-execute` / `post-execute`, subagents, commands, session events).
- Process-local `doublecheck/*` events are observability-only: listeners must not veto or reroute; durable state never depends on them.
- PTC sub-dispatch vocabulary: every fold reads a settled sub-dispatch through `ptcSettle()` (`src/domain/evidence.ts`) instead of switching on one event label. The current line emits `tool/ptc-dispatch` (session format V3 renamed the predecessor `tool/code-dispatch`); the predecessor label is matched structurally so a host on the older release line keeps folding identically. Never re-add a bare `case 'tool/ptc-dispatch'` or `case 'tool/code-dispatch'` to a fold. That legacy branch is read compatibility only — this package never writes the retired label, and it must stay that way: the host refuses a physical row carrying it without `ignorable: true`.

## Build & publish

- `lib/` is committed on purpose: the git-install channel resolves the package without a build step. `prepare` runs `tsc --noEmitOnError` for channels that do build; every package the built `lib/` imports at runtime is therefore a regular `dependency` (pnpm installs no devDependencies for git-hosted packages) — that is `typescript` (the `prepare` build) and `zod` (the projection schema the sessionProjections registry expects as a `ZodType`).
- The committed `lib/` carries `js` + `d.ts` only (`sourceMap: false`, `declarationMap: false`); rebuild with `pnpm run build` after source changes and commit the regenerated tree.
- `pnpm run pack:check` runs build + pack; `prepublishOnly` additionally runs the full test suite. `files` ships `lib`, `skills`, `cordis.patch.yml`, `strict.patch.yml` (the all-gates-block overlay), `CHANGELOG.md`, the five READMEs, and `LICENSE`.
- Tag pushes run `release.yml`: it publishes to npm through **trusted publishing (OIDC, no secret)** — skipping versions already on the registry, so re-tags are harmless — then the `release` job creates the GitHub Release with the top `CHANGELOG.md` section as its notes (`scripts/release-notes.mjs`).
- Per-session artifacts (`doublecheck-spec.md`, `doublecheck-report.md`, `.dsh/`, `*.tgz`, `*.log`) are gitignored; `pnpm-workspace.yaml` is tracked (profile-level installs and the build-allowlist read it).

## Docs

- Five-language READMEs (`README.md`, `README-zh.md`, `README-es.md`, `README-pt.md`, `README-hi.md`) — keep all five in sync; the English file is the source of truth.
- The GitHub repo carries the `dsh-plugin` topic; the bundle patch's config keys restate only deliberate deviations — Schema defaults are the single source of tuning defaults.

## Checks

`pnpm run typecheck && pnpm run typecheck:ci && pnpm run lint && pnpm test && pnpm run build && pnpm run pack:check` — CI runs the same on a 3-OS × 2-Node matrix. `typecheck:ci` resolves published types (`tsconfig.ci.json`, no `paths`); the committed `tsconfig.json` carries no `paths` either, so both baselines coincide while the devDependencies stay pinned to the current published line. A separate `smoke` job then packs the tarball, installs it into a scratch `dsh` profile, and asserts both bundle rows mount (`scripts/assert-profile.mjs`) on every pinned dsh release line (`0.1.2-rc.1`, `0.1.5-alpha.1`, `0.1.7-alpha.1`). Those old lines are what keep the live-field shim honest: `gate` must resolve as plain config there, and as a `Volatile` reference on `0.1.7-alpha.1`.
