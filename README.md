<div align="center">

# dsh-doublecheck
- **1024 store channel**: `npm i -g dsh1024` once, then `dsh1024 plugin --profile web add dsh-doublecheck` (counts toward the [deepseek1024.com](https://deepseek1024.com) install ranking).
[![Gitee](https://img.shields.io/badge/Gitee-mirror-c71d23?logo=gitee)](https://gitee.com/perrylink/dsh-doublecheck)

**The delivery quality gate for DeepSeek Harness: grill the requirements, test the implementation, prove the delivery — then gate the handoff with a deliverable/rework decision.**

*Requirements get interrogated before the first edit; delivery is proven, never claimed.*

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![DSH plugin](https://img.shields.io/badge/dsh-plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-doublecheck/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-doublecheck/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-doublecheck?label=version)](https://github.com/PerryLink/dsh-doublecheck/releases)
[![npm version](https://img.shields.io/npm/v/dsh-doublecheck)](https://www.npmjs.com/package/dsh-doublecheck)
[![npm downloads](https://img.shields.io/npm/dm/dsh-doublecheck)](https://www.npmjs.com/package/dsh-doublecheck)

[English](README.md) · [简体中文](README.zh.md) · [Español](README.es.md) · [Português](README.pt.md) · [हिन्दी](README.hi.md)

</div>

---

## Compatibility

| Surface | Status |
|---|---|
| Harness | DeepSeek Harness `0.1.1-rc.2` |
| Node | `^22.19.0 \|\| >=24.0.0` |
| Platforms | All (pure host; no native code, no direct network requests of its own) |
| Model | Any (the guard itself never calls a model; the critic and reviewer phases run as harness subagents) |

## What you get

`dsh-doublecheck` installs two plugin rows that read and enforce from the same durable session log:

1. **`doublecheck-grill`** — the requirements furnace: the bundled `grill-requirements` skill plus the model-facing `doublecheck_skills`, `doublecheck_spec`, and `doublecheck_report` tools and the per-dimension verification workflow.
2. **`doublecheck-guard`** — the discipline guard: the grill gate, the red/green evidence gates, the adversary review, the `/doublecheck` and `/gate` commands, the `doublecheck.gate` settings namespace, and the four-phase delivery gate.

Together they enforce the **discipline loop** — *grill → design → red → green → review → verify*:

```text
grill ──▶ design ──▶ red ──▶ green ──▶ review ──▶ verify
   │
   └─ six requirement dimensions, consensus gate,
      structured spec committed to the session + workspace
```

| Stage | Meaning |
|---|---|
| **grill** | Interrogate the six requirement dimensions; refuse to implement until consensus. |
| **design** | The settled spec is committed via `doublecheck_spec`. |
| **red** | A failing test run proves the gap before implementation edits. |
| **green** | A passing test run after the edits closes the loop. |
| **review** | A forked adversary critic audits the delivery against the spec. |
| **verify** | `doublecheck_report` + a per-dimension verification workflow prove the delivery. |

## Quick start

```sh
# 1. install the bundle into your profile
dsh plugin --profile web add "github:PerryLink/dsh-doublecheck#main"

# or from npm (published releases)
dsh plugin --profile web add dsh-doublecheck

# 2. restart and verify the row
dsh --profile web --dump-config | grep -E -A3 'id: doublecheck-(grill|guard)'
```

Both rows (`doublecheck-grill` and `doublecheck-guard`) activate automatically with the profile.

## Install & uninstall

- **git channel** (latest `main`): `dsh plugin --profile web add "github:PerryLink/dsh-doublecheck#main"` — the `prepare` script builds with production dependencies only.
- **npm channel** (published releases): `dsh plugin --profile web add dsh-doublecheck`.
- **tarball channel**: `pnpm pack` in this repo, then `dsh plugin --profile web add ./dsh-doublecheck-<version>.tgz`.
- **uninstall**: `dsh plugin --profile web remove dsh-doublecheck` (or remove the rows from the profile patch).

For a zero-configuration strict mode (every gate on at `block` intensity, gate coverage required), apply the shipped overlay on top of the bundle patch: `dsh --profile web --patch ./node_modules/dsh-doublecheck/strict.patch.yml`.

## Configuration

All tunables are Schemastery `Config` fields (changeable from cordis.yml). An id-targeted override replaces the whole row — restate every key you need. `cordis.patch.yml` documents each key inline; Schema defaults are the single source of tuning defaults.

| Key | Default | Meaning |
|---|---|---|
| `specFile` | `'doublecheck-spec.md'` | Workspace file for the committed spec markdown (grill row). |
| `reportFile` | `'doublecheck-report.md'` | Workspace file for the delivery report (grill row). |
| `reportVerify` | `true` | Run the verification workflow by default (grill row). |
| `verifyProvider` | `'fork'` | Subagent provider for the per-dimension checkers (grill row). |
| `verifyMode` | `'all'` | `all` = one parallel checker per dimension; `single` = one combined checker (grill row). |
| `intensity` | `'remind'` | Enforcement strength of the grill, red/green, and review gates (`remind` / `warn` / `block`). |
| `enableByDefault` | `true` | Master switch for sessions without a `/doublecheck on\|off` record. |
| `language` | `'en'` | Injected reminder/deny/review/gate prose language (`en` / `zh`). |
| `guardTools` | `['edit', 'write']` | Mutation tool names both gates watch. |
| `vagueTaskMaxChars` | `200` | Longer tasks are never treated as vague. |
| `remindOnce` | `true` | Inject each reminder at most once per session (durable across restarts). |
| `testToolNames` | `['bash', 'pwsh']` | Shell tool names that can run tests. |
| `testCommandPatterns` | *(pnpm/npm/yarn/bun test, pytest, go/cargo/make test, node --test, deno test, uv run pytest)* | Regexes a command must match to count as a test run. |
| `testFilePatterns` | *(test dirs, `*.test.*` / `*.spec.*`)* | Regexes identifying test files — always editable, exempt from the red gate. |
| `modules.grill` | `true` | Off disables the grill gate. |
| `modules.tdd` | `true` | On enables the red/green evidence gates. |
| `modules.adversary` | `false` | On enables the forked critic review at green. |
| `adversaryModel` | `null` | Critic model route; `null` = main model self-reviews. |
| `adversaryProvider` | `'fork'` | Subagent provider the critic runs on. |
| `adversaryMaxFindings` | `5` | Findings cap (1–20) injected into the session. |
| `adversaryTools` | `['read', 'glob', 'grep']` | Critic tool allowlist; keep it read-only. |
| `adversaryTimeoutMs` | `120000` | Hard time budget for one critic run. |
| `gate.enabled` | `true` | Master switch for the gate panel and the turn-boundary red notice. |
| `gate.planSuggestion` | `true` | Append the plan-mode re-check suggestion to red reports. |
| `gate.reportFile` | `'gate-report.md'` | Workspace file for the gate report. |
| `gate.requirements.checklist` | *(six spec-dimension questions)* | Pluggable key-question checklist: `{ id, question, specDimension, required }`. |
| `gate.requirements.minConfirmed` | `6` | Minimum required questions that must pass (1..required count). |
| `gate.requirements.interrogateTool` | `'ask_user_question'` | Tool name whose calls count as interrogation evidence. |
| `gate.tests.requirePassingRun` | `true` | A non-passing (or missing) latest test run is a red light. |
| `gate.tests.allowFailingRuns` | `0` | Failing runs after the latest green allowed before red. |
| `gate.tests.requireCoverage` | `false` | On requires coverage evidence in the test output. |
| `gate.tests.minCoveragePct` | `80` | Minimum coverage percentage (0–100). |
| `gate.tests.evalReports.enabled` | `false` | On folds the dsh-eval report (dsh-auto-review's eval engine) into the test evidence. |
| `gate.tests.evalReports.dir` | `'.eval-reports'` | Workspace-relative directory holding the engine's report. |
| `gate.tests.evalReports.file` | `'report.json'` | Report file name inside the directory. |
| `gate.tests.evalReports.required` | `false` | A missing report is a red light exactly when true (a skip otherwise). |
| `gate.consistency.*` | `provider: 'fork'`, `model: null`, `tools: ['read','glob','grep']`, `timeoutMs: 120000`, `maxFindings: 5` | The local consistency reviewer's knobs (`model: null` = main model). |
| `gate.review.engine` | `'auto'` | `auto` = dsh-auto-review verdict records when present, else the local reviewer; `local` = always local. |
| `gate.review.provider` | `'fork'` | The local review reviewer's provider (its `model`/`tools`/`timeoutMs`/`maxFindings` match `gate.consistency.*`). |

Misconfiguration fails loud at load: invalid regexes, empty or duplicated name lists, out-of-range thresholds, and duplicate checklist ids throw instead of silently doing nothing. `strict.patch.yml` is the all-gates-block overlay that restates the guard row at `intensity: block` with every module on and the coverage requirement enabled.

## Tools & surfaces

| Surface | Kind | Notes |
|---|---|---|
| `doublecheck_skills` | tool | Lists and loads the package's four bundled skills through the skill registry seam. |
| `doublecheck_spec` | tool | Commits the grilled six-dimension spec to the session log and a workspace markdown copy. |
| `doublecheck_report` | tool | Folds the discipline evidence into a delivery report (optional per-dimension verification workflow). |
| `/doublecheck status\|report\|on\|off` | command | Switch, modules, intensity, stage facts, folded report, and the durable on/off override. |
| `/gate status\|run\|config` | command | Live checklist progress, the settled deliverable/rework report, and the effective config. |
| `grill-requirements`, `red-green-tdd`, `delivery-review`, `delivery-proof` | skill | Bundled discipline skills covering all six loop stages. |
| `doublecheck.gate` | settings namespace | The pluggable checklist, exposed to settings-capable UIs (`expose: true`, `applies: restart`). |
| `strict.patch.yml` | overlay | Every gate on at `block` intensity plus the coverage requirement, in one patch layer. |
| `dsh-doublecheck/invariant` | companion row | Reports package-owned write-path contradictions through the host `invariants` registry. |

## Gate phases

The delivery gate aggregates the session's durable evidence into a configurable four-phase checklist and settles one **deliverable / rework required** decision. Every phase folds the session log alone (replay IS the state), so a run re-derives identically after resume or fork.

| Phase | Checks | Evidence source | Model cost |
|---|---|---|---|
| Requirements interrogation | Key-question checklist confirmed item by item (six spec-dimension questions by default) | Committed `doublecheck_spec` + `ask_user_question` calls | none |
| Test evidence | Latest run color, failing runs after green, optional coverage threshold, optional dsh-eval report | Shell test runs in the session log (`[exit code: N]`, coverage percentages); the dsh-eval report file when `gate.tests.evalReports.enabled` | none |
| Implementation consistency | Diff ↔ requirement mapping: every edit must serve a spec dimension | Local forked reviewer (structured findings, read-only tools) | one subagent |
| Review conclusion | The delivery verdict; `engine: auto` consumes dsh-auto-review's durable verdict records when present, else the local reviewer | `autoReview/verdict` / `autoReview/rejection` events, or the local forked reviewer | one subagent (local) |

Red lights are failed checks (a missing spec, a failing latest run, coverage below minimum, an unmapped edit, blocker/major findings) — each carries a rework suggestion. Warnings and skips never flip the decision. The gate integrates [dsh-auto-review](https://github.com/PerryLink/dsh-auto-review) as a weak dependency: `review.engine: auto` folds its verdict records when present and degrades to the local reviewer otherwise; `gate.tests.evalReports.enabled` folds its eval engine's dsh-eval report (prompt-regression / stress / fairness suites) into the test evidence and skips honestly when no report exists. The gate never synthesizes approval requests.

## Example report

`/gate run` returns this markdown — paste it into a PR description:

````markdown
# Delivery gate report

> **Verdict: rework required** — 2 red item(s)
> The gate is red. Re-open the work in plan mode to re-check the open items before delivering.

## 1. Requirements interrogation — PASS
- [✔] **What outcome must the delivery produce?** — spec dimension "goal" committed
- [✔] **What is in scope, and what is out of scope?** — spec dimension "scope" committed
- [✔] **Which observable checks prove the work is done?** — spec dimension "acceptanceCriteria" committed
- [✔] **What can go wrong, and what is the correct behavior in each case?** — spec dimension "failureModes" committed
- [✔] **What is traded when goals conflict; what is optional?** — spec dimension "priorities" committed
- [✔] **What does the user explicitly not want?** — spec dimension "nonGoals" committed

## 2. Test evidence — FAIL
- [✔] **passing test run** — latest test run passed
- [✔] **failing cases after green** — 0 failing run(s) after green (allowed: 0)
- [✖] **coverage evidence** — 61% coverage below the 80% minimum — rework: raise coverage above the configured minimum

## 3. Implementation consistency — WARN
- [⚠] **[minor] src/telemetry.ts touched without a requirement** — [minor] the edit adds a metric no spec dimension covers

## 4. Review conclusion — PASS
- [✔] **dsh-auto-review conclusion** — 3 call(s) approved by dsh-auto-review (latest risk: low)

## Red items
1. **tests/coverage** — 61% coverage below the 80% minimum — *rework: raise coverage above the configured minimum*
2. **consistency/finding-1** — [minor] the edit adds a metric no spec dimension covers — *rework: src/telemetry.ts touched without a requirement*

## Audit
- review engine: dsh-auto-review
- generated at: 2026-08-14T12:00:00.000Z
- counts, ids, and verdicts only: no file contents or session text are embedded, and recognized secrets are redacted.
````

## CI output

`/gate run` also writes a `gate-report.json` (the same settled state as lossless JSON, next to `gate-report.md`). The `doublecheck-gate` CLI turns that file into machine-readable output for GitHub Actions:

```sh
# JSON (PR comment / status payload)
doublecheck-gate --format json --input gate-report.json
# SARIF 2.1.0 (code-scanning upload / status check)
doublecheck-gate --format sarif < gate-report.json
```

The CLI only serializes the already-settled `GateState` — it never re-runs the four-phase gate or the evidence folds. Its exit code maps the verdict: `0` = deliverable, `1` = rework, `2` = usage/parse error.

## Permissions & data

- **Reads**: the session log (`tool/call` / `tool/result` / `tool/code-dispatch`, injected `user/message` sources, and the foreign `autoReview/*` verdict records) in-process only; the optional plan-mode service state.
- **Writes**: `doublecheck-spec.md`, `doublecheck-report.md`, `gate-report.md`, and `gate-report.json` in the session workspace (paths configurable) through the `ctx.fs` seam; the durable `doublecheck/state` and `doublecheck/gate` session events.
- **Model calls**: the gate's consistency and local-review phases (one subagent each per `/gate run`), the optional adversary review, and the `doublecheck_report` verification workflow start subagent runs; nothing else calls a model or the network.
- **Never touched**: credentials, environment variables, or any file outside the session workspace. The workshop manifest declares `filesystem:read` and `filesystem:write` only. Gate reports carry counts, ids, and verdicts only; recognized secrets in reviewer texts are redacted before storage or display.

## Security boundaries

- **Model-visible ⟺ logged.** Every injected reminder, review, and gate notice rides the standard channels and lands in the session log; the durable spec/state/gate facts ride tool results or `SessionEventMap` members.
- **Fail closed / fail loud.** Guard and gate config are validated in `apply` (assertions throw); a reviewer or adversary seam that cannot run settles as an honest "unavailable"/skip notice instead of a fake verdict.
- **Audit-safe reports.** Gate and delivery reports record counts, ids, and verdicts only — no file contents or session text — and model-produced finding texts pass a secret redactor before storage or display.
- **No network of its own.** The plugin makes no direct network requests; the critic and reviewer subagents ride the harness subagent seam.
- **Weak dependency on dsh-auto-review.** It is never imported or hard-required; the gate folds its durable verdict records and degrades to the local reviewer, and never synthesizes approval requests.

## Known limitations

- **Durable writes.** `/doublecheck on\|off` → `doublecheck/state` and `/gate run` → `doublecheck/gate` ride the host's `ignorable` append surface (post-rc.6 through `0.1.1-rc.2`). On hosts without that surface (rc.6/rc.8, and `0.1.2-alpha.1`, which removed the envelope — `0.1.2-alpha.3` restores the field for stored-log read compatibility only and still cannot stamp it), the writes are skipped and the switch stays process-local.
0.1.2-alpha.3 (adapted 2026-09-01): the session envelope keeps its ignorable field for stored-log read compatibility only - Session.append still cannot stamp it, so audit-gate behavior is unchanged.
- **Optional seams.** The `doublecheck.gate` settings namespace registers only when the settings service is mounted; the `/gate status` plan-mode line reads the optional `ctx.planMode` (shows `unknown` without it); the adversary review needs `ctx.subagents`; verification needs `workflowEngine`.
- **Local degrade.** `gate.review.engine: auto` degrades to the local reviewer when dsh-auto-review is absent or has no verdict records this session — the report names the reason instead of inventing a verdict.
- **dsh-eval evidence is file-based.** The dsh-auto-review eval engine (`dsh-eval`) writes its prompt-regression / stress / fairness results to a workspace report file, not the session log. `gate.tests.evalReports.enabled` folds that file (off by default; skips when absent) and the folded counts ride the durable `doublecheck/gate` record so a settled run still replays.

## Development

```sh
pnpm install             # node ^22.19 || >=24
pnpm run build           # tsc --noEmitOnError (lib/ is committed)
pnpm run prepare         # tsc --noEmitOnError (git-install channel)
pnpm run prepublishOnly  # build + full test suite
pnpm run typecheck       # tsc --noEmit + tests tsconfig
pnpm run lint            # eslint src tests
pnpm test                # vitest run
pnpm run test:coverage   # vitest run --coverage
pnpm run pack:check      # build + pack the tarball
```

## Topics

`dsh`, `dsh-plugin`, `deepseek-harness`, `engineering-discipline`, `requirements`, `guard`, `skill`, `quality-gate`, `delivery-gate`

## Contributors

- [@PerryLink](https://github.com/PerryLink) — creator and maintainer: the grill → design → red → green → review → verify discipline loop, the four-phase delivery gate, the five-language docs, and the CI/release pipeline.

## PerryLink DSH Plugin Family

This project is one of the [33 DeepSeek Harness plugins](https://github.com/PerryLink) maintained by [PerryLink](https://github.com/PerryLink). If this one helps you, the others likely will too:

| Plugin | One-liner |
|---|---|
| **[dsh-dsh-auto-review](https://github.com/PerryLink/dsh-dsh-auto-review)** | Second-model auto-review on the approval chain, fail-closed by default | |
| **[dsh-dsh-background-agents](https://github.com/PerryLink/dsh-dsh-background-agents)** | Durable background child agents with a Web UI sidebar, messaging and interrupt | |
| **[dsh-dsh-budget](https://github.com/PerryLink/dsh-dsh-budget)** | Cost governance for DeepSeek Harness: budgets, carbon, and latency in one panel. | |
| **[dsh-dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-dsh-checkpoint-rewind)** | Claude Code /rewind-equivalent: snapshots, session forks, one-shot restore | |
| **[dsh-dsh-claude-move](https://github.com/PerryLink/dsh-dsh-claude-move)** | Migrate Claude Code sessions, memory, skills and CLAUDE.md into DSH | |
| **[dsh-dsh-click](https://github.com/PerryLink/dsh-dsh-click)** | Cross-platform native desktop control for DeepSeek Harness — Windows first. | |
| **[dsh-dsh-composer-history](https://github.com/PerryLink/dsh-dsh-composer-history)** | Terminal-style input history for the web composer: arrows, Ctrl+R search | |
| **[dsh-dsh-data-quality](https://github.com/PerryLink/dsh-dsh-data-quality)** | Dataset quality checks and citation cross-checks (the optional numeric bridge consumed here) | |
| **[dsh-dsh-defend](https://github.com/PerryLink/dsh-dsh-defend)** | Prompt-injection, jailbreak, and secret-leak defense for DeepSeek Harness. | |
| **[dsh-dsh-draw](https://github.com/PerryLink/dsh-dsh-draw)** | Unified static-image generation routing for DeepSeek Harness. | |
| **[dsh-dsh-fast](https://github.com/PerryLink/dsh-dsh-fast)** | Read-only performance diagnostics for DeepSeek Harness. | |
| **[dsh-dsh-fund-research](https://github.com/PerryLink/dsh-dsh-fund-research)** | Deterministic research reports for Chinese public mutual funds | |
| **[dsh-dsh-github](https://github.com/PerryLink/dsh-dsh-github)** | GitHub PR/issues integration for DSH, every write gated by approval | |
| **[dsh-dsh-industry-research](https://github.com/PerryLink/dsh-dsh-industry-research)** | Industry research orchestration that seals its deliverables through this plugin's `ctx.researchReport.assemble` | |
| **[dsh-dsh-library](https://github.com/PerryLink/dsh-dsh-library)** | Local document knowledge base for DeepSeek Harness. | |
| **[dsh-dsh-local-ai](https://github.com/PerryLink/dsh-dsh-local-ai)** | Local-model (Ollama) integration for DeepSeek Harness. | |
| **[dsh-dsh-lsp-actions](https://github.com/PerryLink/dsh-dsh-lsp-actions)** | LSP diagnostics, formatting, completion, code actions and rename over language servers | |
| **[dsh-dsh-mask](https://github.com/PerryLink/dsh-dsh-mask)** | PII masking middleware: anonymize at the model boundary, restore at the display layer | |
| **[dsh-dsh-mcp-panel](https://github.com/PerryLink/dsh-dsh-mcp-panel)** | Read-only MCP runtime panel: /mcp command + Settings tab with status, tools and errors | |
| **[dsh-dsh-memento](https://github.com/PerryLink/dsh-dsh-memento)** | Approval-gated cross-session memory: ctx.memory seam + SQLite + memory tool | |
| **[dsh-dsh-observe](https://github.com/PerryLink/dsh-dsh-observe)** | OpenTelemetry and Langfuse observability exporter for DeepSeek Harness. | |
| **[dsh-dsh-output-styles](https://github.com/PerryLink/dsh-dsh-output-styles)** | Claude Code outputStyles-equivalent runtime style switching | |
| **[dsh-dsh-permission-rules](https://github.com/PerryLink/dsh-dsh-permission-rules)** | Claude Code-style declarative allow/deny/ask permission rules with audit | |
| **[dsh-dsh-plugin-guide](https://github.com/PerryLink/dsh-dsh-plugin-guide)** | Plugin-development knowledge base as an on-demand agent skill | |
| **[dsh-dsh-research-report](https://github.com/PerryLink/dsh-dsh-research-report)** | Verifiable research-report engine: content-addressed evidence ledger and sealed versions | |
| **[dsh-dsh-score](https://github.com/PerryLink/dsh-dsh-score)** | Multi-dimensional quality scoring for DeepSeek Harness plugins. | |
| **[dsh-dsh-session-pin](https://github.com/PerryLink/dsh-dsh-session-pin)** | Pin sessions in the Web sidebar with durable ordering | |
| **[dsh-dsh-session-sync](https://github.com/PerryLink/dsh-dsh-session-sync)** | Cross-device session sync for DeepSeek Harness — a dedicated git mirror of your session store. | |
| **[dsh-dsh-skill-pack-security](https://github.com/PerryLink/dsh-dsh-skill-pack-security)** | Security-audit skill pack: secret scan, dependency and supply-chain review | |
| **[dsh-dsh-talk](https://github.com/PerryLink/dsh-dsh-talk)** | Voice-first session loop for DeepSeek Harness: talk to it, hear it answer. | |
| **[dsh-dsh-test-drive](https://github.com/PerryLink/dsh-dsh-test-drive)** | Isolated install-and-smoke test drives for DeepSeek Harness plugins. | |
| **[dsh-dsh-translate](https://github.com/PerryLink/dsh-dsh-translate)** | Vendor parameter translation and deterministic JSON repair for DeepSeek Harness. | |

## License

[Apache License 2.0](LICENSE) © 2026 dsh-doublecheck contributors
