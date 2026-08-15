# AGENTS.md

Standalone DeepSeek Harness plugin repository (`dsh-doublecheck`). Development follows the dsh-plugin-guide skill and the official plugin contract; this file records repo-local decisions.

## Layout

- `src/index.ts` — package entry: the shared domain model and pure helpers. It is NOT a plugin; the installable plugin rows live at the `./grill` and `./guard` subpath exports (see `cordis.patch.yml`).
- `src/invariant.ts` — the package-owned invariant companion; its standalone row loads via the `./invariant` subpath export (reports write-path contradictions without the guard).
- `src/grill/index.ts` — plugin row `doublecheck-grill`: bundled `grill-requirements` skill provider + the model-facing contract tools (`doublecheck_skills`, `doublecheck_spec`, `doublecheck_report`) and the v0.4 verification workflow.
- `src/guard/index.ts` — plugin row `doublecheck-guard`: the policy gates (grill / tdd red-green / adversary review) on the `tools/pre-execute` and `tools/post-execute` waterfalls.
- `src/guard/command.ts` — the `/doublecheck status|report|on|off` session command and the durable `doublecheck/state` fold.
- `src/guard/review.ts` — adversary review orchestration (forked critic subagent, structured findings, honest "unavailable" degradation).
- `src/guard/prose.ts` — the injected reminder/deny/review prose, per-language (`en` / `zh`).
- `src/domain/` — pure folds and vocabularies shared by both rows (stages, evidence, vagueness, vocabulary, report). No Cordis imports.
- `src/events.ts` — process-local Cordis event vocabulary (`@mode emit`, observability-only) + the durable `doublecheck/state` `SessionEventMap` member.
- `skills/` — four bundled discipline skills (`grill-requirements`, `red-green-tdd`, `delivery-review`, `delivery-proof`), each `<name>/SKILL.md` in the generic Agent Skills layout.
- `tests/` — vitest; real Cordis `Context` with scripted services (subagents/commands) and synthetic durable events; `tests/fixtures/` holds real-transcript regression logs.
- `scripts/` — session-log tooling (`decode-session`, `extract-fixture`, `scan-sessions`) + `release-notes.mjs` (extracts the top changelog section for the publish workflow's release job).

## Hard rules applied here

- Waterfall listeners (`tools/pre-execute`, `tools/post-execute`) always call `next()` unless they claim the request; claiming a request is the only deliberate short-circuit (veto/ask) and always emits `doublecheck/reminder` first.
- Model-visible ⟺ logged: every injected reminder/review/command notice rides the standard channels and lands in the session log as a `user/message` event with a `plugin` source; the durable spec/report/state facts ride `tool/call` results or `SessionEventMap` members.
- Fail closed / fail loud: guard config is validated in `apply` (assertions throw); the adversary seam is validated lazily at review time and degrades to an honest "unavailable" notice.
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

`pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build && pnpm run pack:check` — CI runs the same on a 3-OS × 2-Node matrix.
