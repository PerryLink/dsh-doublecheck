# AGENTS.md

Standalone DeepSeek Harness plugin repository (`dsh-doublecheck`). Development follows the dsh-plugin-guide skill and the official plugin contract; this file records repo-local decisions.

## Layout

- `src/index.ts` — package entry: the shared domain model and pure helpers. It is NOT a plugin; the installable plugin rows live at the `./grill` and `./guard` subpath exports (see `cordis.patch.yml`).
- `src/invariant.ts` — the package-owned invariant companion; its standalone row loads via the `./invariant` subpath export (reports write-path contradictions without the guard).
- `src/grill/index.ts` — plugin row `doublecheck-grill`: bundled `grill-requirements` skill provider + the model-facing contract tools (`doublecheck_skills`, `doublecheck_spec`, `doublecheck_report`) and the v0.4 verification workflow.
- `src/guard/index.ts` — plugin row `doublecheck-guard`: the policy gates (grill / tdd red-green / adversary review) on the `tools/pre-execute` and `tools/post-execute` waterfalls.
- `src/guard/command.ts` — the `/doublecheck status|report|on|off` session command and the durable `doublecheck/state` fold.
- `src/guard/review.ts` — adversary review orchestration (forked critic subagent, structured findings, honest "unavailable" degradation).
- `src/guard/gate.ts` — the delivery quality gate (v0.7): the `gate.*` Schema config, fail-loud validation, the four-phase runner (deterministic requirements/tests folds + forked consistency/local reviewers), the dsh-auto-review weak dependency (durable `autoReview/*` verdict records; degrade-to-local), the `/gate status|run|config` command, the durable `doublecheck/gate` fold, and the `doublecheck.gate` settings namespace.
- `src/guard/prose.ts` — the injected reminder/deny/review/gate prose, per-language (`en` / `zh`); gate notices open with a one-sentence role statement and stay short.
- `src/domain/` — pure folds and vocabularies shared by both rows (stages, evidence, vagueness, vocabulary, report, gate). No Cordis imports.
- `src/events.ts` — process-local Cordis event vocabulary (`@mode emit`, observability-only) + the durable `doublecheck/state` and `doublecheck/gate` `SessionEventMap` members and the `doublecheck-gate` message source.
- `skills/` — four bundled discipline skills (`grill-requirements`, `red-green-tdd`, `delivery-review`, `delivery-proof`), each `<name>/SKILL.md` in the generic Agent Skills layout.
- `tests/` — vitest; real Cordis `Context` with scripted services (subagents/commands) and synthetic durable events; `tests/fixtures/` holds real-transcript regression logs.
- `scripts/` — session-log tooling (`decode-session`, `extract-fixture`, `scan-sessions`) + `release-notes.mjs` (extracts the top changelog section for the publish workflow's release job).

## Hard rules applied here

- Waterfall listeners (`tools/pre-execute`, `tools/post-execute`) always call `next()` unless they claim the request; claiming a request is the only deliberate short-circuit (veto/ask) and always emits `doublecheck/reminder` first.
- Model-visible ⟺ logged: every injected reminder/review/gate command notice rides the standard channels and lands in the session log as a `user/message` event with a `plugin`/structured source; the durable spec/report/state/gate facts ride `tool/call` results or `SessionEventMap` members.
- Fail closed / fail loud: guard config is validated in `apply` (assertions throw); the adversary and gate-reviewer seams are validated lazily at run time and degrade to honest "unavailable"/skip notices. Gate reports are audit-safe: counts, ids, and verdicts only, with secrets redacted before storage or display.
- Weak dependency on dsh-auto-review: never imported, never hard-required — the gate folds its durable verdict records and degrades to the local reviewer; the gate never synthesizes approval requests (the chain may reach a human).
- No agent-loop changes; only documented seams (skills provider, tools, `tools/pre-execute` / `post-execute`, subagents, commands, session events).
- Process-local `doublecheck/*` events are observability-only: listeners must not veto or reroute; durable state never depends on them.

## Build & publish

- `lib/` is committed on purpose: the git-install channel resolves the package without a build step. `prepare` runs `tsc --noEmitOnError` for channels that do build; every package the built `lib/` imports at runtime is therefore a regular `dependency` (pnpm installs no devDependencies for git-hosted packages) — that is `typescript` (the `prepare` build) and `zod` (the projection schema the sessionProjections registry expects as a `ZodType`).
- The committed `lib/` carries `js` + `d.ts` only (`sourceMap: false`, `declarationMap: false`); rebuild with `pnpm run build` after source changes and commit the regenerated tree.
- `pnpm run pack:check` runs build + pack; `prepublishOnly` additionally runs the full test suite. `files` ships `lib`, `skills`, `cordis.patch.yml`, `strict.patch.yml` (the all-gates-block overlay), `CHANGELOG.md`, the five READMEs, and `LICENSE`.
- Tag pushes run `publish.yml`: it publishes to npm when the repo's `NPM_TOKEN` secret is present (skipping versions already on the registry, so re-tags are harmless), then the `release` job creates the GitHub Release with the top `CHANGELOG.md` section as its notes (`scripts/release-notes.mjs`).
- Per-session artifacts (`doublecheck-spec.md`, `doublecheck-report.md`, `.dsh/`, `*.tgz`, `*.log`) are gitignored; `pnpm-workspace.yaml` is tracked (profile-level installs and the build-allowlist read it).

## Docs

- Five-language READMEs (`README.md`, `README.zh.md`, `README.es.md`, `README.pt.md`, `README.hi.md`) — keep all five in sync; the English file is the source of truth.
- The GitHub repo carries the `dsh-plugin` topic; the bundle patch's config keys restate only deliberate deviations — Schema defaults are the single source of tuning defaults.

## Checks

`pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build && pnpm run pack:check` — CI runs the same on a 3-OS × 2-Node matrix. A separate `smoke` job then packs the tarball, installs it into a scratch `dsh` profile, and asserts both bundle rows mount (`scripts/assert-profile.mjs`).
