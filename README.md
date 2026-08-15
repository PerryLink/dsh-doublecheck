# dsh-doublecheck

> **Double-check before you ship: grill the requirements, test the implementation, prove the delivery.**

[![version](https://img.shields.io/badge/version-0.6.0-blue)](https://github.com/PerryLink/dsh-doublecheck/releases)
[![npm](https://img.shields.io/npm/v/dsh-doublecheck)](https://www.npmjs.com/package/dsh-doublecheck)
[![downloads](https://img.shields.io/npm/dw/dsh-doublecheck)](https://www.npmjs.com/package/dsh-doublecheck)
[![license](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)
[![topics](https://img.shields.io/badge/topics-dsh%20%7C%20dsh--plugin-22c55e)](https://github.com/topics/dsh-plugin)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-doublecheck/ci.yml?branch=main)](https://github.com/PerryLink/dsh-doublecheck/actions/workflows/ci.yml)

An **engineering-discipline bundle** for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). Agents love to start coding; requirements hate being assumed. `dsh-doublecheck` installs a discipline loop that makes the agent **grill the requirements before the first edit, and prove the delivery instead of claiming it** — re-implemented natively on DSH's own extension points (skill registry, tool policy pipeline, approval seam, subagent and workflow seams, session log), not on borrowed prompt files. Tested against DSH `0.1.0-rc.6`.

The methodology is inspired by [obra/superpowers](https://github.com/obra/superpowers) and [TimothyVang/Grill-me](https://github.com/TimothyVang/Grill-me). Every prompt, term, example, and file in this package is written from scratch — nothing is copied from either project.

## Why

- Vague tasks produce wrong software. A brief request ("帮我做一个功能") hides six unsettled decisions; the agent currently guesses all of them and charges you for the guess.
- Disciplined teams do this in humans: requirements review → failing test → passing test → self-review → delivery proof. Agents deserve the same loop, enforced by the harness, not by vibes.

## The discipline loop

```
grill ──▶ design ──▶ red ──▶ green ──▶ review ──▶ verify
  │         │
  │      (v0.1)        (v0.2+)        (v0.3)         (v0.4)
  │
  └─ requirements furnace: six dimensions, consensus gate,
     structured spec committed to the session and the workspace
```

| Stage | Meaning | Status |
|---|---|---|
| **grill** | Interrogate the six requirement dimensions; refuse to implement until consensus. | ✅ v0.1 |
| **design** | Spec committed via `doublecheck_spec`. | ✅ v0.1 |
| **red** | A failing test run proves the gap; implementation edits need it on record. | ✅ v0.2 |
| **green** | A passing test run after the edits closes the loop. | ✅ v0.2 |
| **review** | A forked adversary critic audits the delivery against the spec. | ✅ v0.3 |
| **verify** | `doublecheck_report` + a per-dimension verification workflow prove the delivery. | ✅ v0.4 |

## Features

- 🔥 **`grill-requirements` skill** — a bundled Agent-Skills-format skill that interrogates the task across six dimensions (**goal, scope, acceptance criteria, failure modes, priorities, non-goals**) using DSH's native `ask_user_question` UI, refuses to write code until consensus, and records the contract.
- 🧰 **Stage skills for the whole loop** — `red-green-tdd` (write the failing test, run red, implement, run green), `delivery-review` (adversarial self-review against the spec once green), and `delivery-proof` (consolidate the evidence into the delivery report before claiming completion) join `grill-requirements`, so all six stages have model guidance, not just the first.
- 📜 **`doublecheck_spec` tool** — commits the grilled spec to the session log and writes a markdown copy to the workspace, so the contract survives the conversation. Empty or whitespace-only dimensions are rejected at the commit (v0.6): the grill must settle all six before the spec counts.
- 🔄 **Task-change re-grill** — a committed spec covers its own task: a new direct-user request after the latest spec commit reopens the grill gate for that follow-up instead of silently inheriting the old contract.
- 🛡️ **Discipline guard** — a soft gate on the tool policy pipeline. Vague task + no spec + heading for `edit`/`write` → **remind**, **hold for human approval**, or **block**, depending on `intensity`.
- 🟥🟩 **Red/green evidence gates** (`modules.tdd`) — hard checks over the session log: an implementation edit requires a **failing test run on record** since the last passing run (writing test files is always allowed — that is how the red step happens), and a turn that ends with edits but no passing run gets a green reminder injected. Custom guard tools work out of the box: the gates read both `file_path` and `path` argument keys, and a call that names no file at all is not treated as an implementation edit.
- 👁️ **Adversary review** (`modules.adversary`) — once the delivery reaches green, a forked critic subagent (DSH's native subagent seam, default `fork` provider) audits the session against the committed spec with an adversarial stance and returns structured findings, sorted blocker-first. `remind` injects the critique; `warn`/`block` additionally steer one round to make the model answer the findings. `adversaryModel` routes the critic to a separate model; the critic's tool allowlist is read-only by default. Findings ride the durable `doublecheck-review` message source. The review re-arms after the critic settles: implementation edits after the latest review record trigger another round, and cancelling the turn aborts the in-flight critic.
- 🌐 **Fully localized model surface** — every model-visible string the package injects or answers with (reminders, deny/ask feedback, review steering, switch notices, `/doublecheck` replies, and the critic's task prompt) honors `language: 'en' | 'zh'`; the workspace spec/report documents keep their stable English headings.
- 📊 **Doublecheck report + verification workflow** (`doublecheck_report`, v0.4) — consolidates the session's discipline evidence (spec, red/green timeline, review findings, edits) into a delivery report with a derived verdict (`grill → draft → red → green → objections/verified → proven/challenged/unverified`), written to the workspace. With `verify`, per-dimension checkers run through DSH's workflow seam (`verifyMode: all` fans out one parallel checker per dimension; `single` runs one combined checker) and their verdicts fold into the report — `proven` requires a verdict for every dimension.
- 🚦 **Delivery gate** — at the turn boundary, a delivery that reached green with no `doublecheck_report` on record gets a report-expected reminder before completion claims; a successful report advances the stage fold to `verify`.
- 🔁 **Durable state** — every model-visible artifact (spec, reminders, deny feedback, review findings, the `/doublecheck on|off` switch) lands in the session log; gate decisions derive from the log alone (`tool/call` + `tool/result`, including Code Mode sub-dispatches), so resumed and forked sessions enforce identically. `remindOnce` is durable too: a session that already received a reminder never gets it twice, even after a restart. The switch fold rides an incremental snapshot, so long sessions stay O(new events) per tool call.
- ⌨️ **`/doublecheck` session command** — `status` reports the effective switch, the configured modules, the enforcement intensity, and the folded stage facts (spec, test color, review, edit count); `report` folds the delivery report on the spot; `on|off` writes the durable `doublecheck/state` override and injects a switch notice.
- 📚 **`doublecheck_skills` tool** — lists and loads the package's skills through the official skill registry seam.
- 🔒 **Strict overlay** — `strict.patch.yml` turns every gate on at `block` intensity in one patch layer (ships with the package).
- 🧩 **Standalone invariant companion** — the `dsh-doublecheck/invariant` row is a real subpath export: it reports package-owned write-path contradictions (spec/report/review shape) through the host `invariants` registry without loading the guard.

## Demo

A real headless run with `intensity: block` and every gate enabled, transcript recorded from the durable session log:

```sh
dsh --profile demo headless "把这个项目里最慢的代码直接改快，别问我任何问题，直接改文件。"
```

1. **grill** blocks the first edit — no spec on record:
   `Error: Blocked by the dsh-doublecheck requirements guard: the task statement is vague and no doublecheck_spec exists for this session.`
2. The model records the spec (`doublecheck_spec`), writes a failing test (test files are always editable), and runs it — the log records `[exit code: 1]`, the red step.
3. Implementation edits now pass; a later run records `4 passed`, the green step.
4. The forked critic audits the delivery; its severity-tagged findings are injected, and `warn`/`block` steer one round so the model answers them.
5. `doublecheck_report` folds everything into a markdown report with a derived verdict — `proven` when every per-dimension verification check passes, `challenged` when a checker objects.

## Install

```sh
dsh plugin --profile <name> add dsh-doublecheck
dsh --profile <name> --dump-config   # expect a "# == dsh-doublecheck" layer
```

Both plugin rows activate automatically with the profile. Tarball installs work too:

```sh
pnpm pack
dsh plugin --profile <name> add ./dsh-doublecheck-0.6.0.tgz
```

Git installs need no npm:

```sh
dsh plugin --profile <name> add "github:PerryLink/dsh-doublecheck#v0.6.0"
```

For a zero-configuration strict mode (every gate on, `block` intensity), apply the shipped overlay on top of the bundle patch:

```sh
dsh --profile <name> --patch ./node_modules/dsh-doublecheck/strict.patch.yml
```

## Uninstall

```sh
dsh plugin --profile <name> remove dsh-doublecheck
```

To keep the package installed but disable one row, override it by id with `disabled: true` in the profile's `cordis.patch.yml` (`doublecheck-grill` / `doublecheck-guard`).

## Compatibility

- Verified against the `0.1.0-rc.6` peers (`@deepseek-ai/cordis ^4.0.1`); last verified 2026-08-14 on Windows with Node 22.
- The durable session switch (`/doublecheck on|off` → `doublecheck/state`) needs the host's `ignorable` append surface (post-rc.6 harness): on rc.6 hosts the options bag is ignored and the event stays required-on-read, so prefer in-memory switching there until the harness is upgraded.

## Permissions & data

- **Reads**: the session log (`tool/call` / `tool/result` / `tool/code-dispatch` and injected `user/message` sources) in-process only.
- **Writes**: `doublecheck-spec.md` and `doublecheck-report.md` in the session workspace (paths configurable), through the `ctx.fs` seam.
- **Model calls**: only the optional adversary review (`modules.adversary`, default off) and the `doublecheck_report` verification workflow (default on) start subagent runs; nothing else calls a model or the network.
- **Never touched**: credentials, environment variables, or any file outside the session workspace.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| No `# == dsh-doublecheck` layer in `--dump-config` | The bundle patch is missing or a row is `disabled` — check the profile patch order and row ids. |
| The gates never react | Run `/doublecheck status`: the session switch may be off, or every `modules.*` entry is false in the guard row. |
| "Adversary review did not run: the subagents seam is not mounted" | This profile composition provides no subagent provider — mount one (spine compositions do) or disable `modules.adversary`. |
| `doublecheck_report` shows `verification: null` | The `workflowEngine` seam is missing or the run was rejected/aborted — the report states this instead of guessing. |
| The report says `unverified` | Verification ran but not every spec dimension returned a verdict — re-run with `verify: true`; `proven` requires all six. |

## Configure

Override any row **by id** in the profile's `cordis.patch.yml`. A patch replaces the row's whole config — restate every key:

```yaml
- id: doublecheck-grill
  config:
    specFile: 'specs/doublecheck-spec.md'   # default: 'doublecheck-spec.md'
    reportFile: 'specs/doublecheck-report.md'   # default: 'doublecheck-report.md'
    reportVerify: true            # run the verify workflow by default
    verifyProvider: 'fork'        # provider for the per-dimension checkers
    reportTestToolNames: ['bash', 'pwsh']
    reportTestCommandPatterns:
      - '(?:^|[;&|]\s*)(?:(?:pnpm|npm|npx|yarn|bun)(?:\s+run)?\s+(?:test|vitest|jest|mocha)(?:\s|$))'
      - '(?:^|[;&|]\s*)(?:(?:pytest|go\s+test|cargo\s+test|make\s+test|ctest)(?:\s|$))'
      - '(?:^|[;&|]\s*)(?:node\s+--test(?:\s|$))'
      - '(?:^|[;&|]\s*)(?:deno\s+test|uv\s+run\s+pytest)(?:\s|$)'
    reportMutationTools: ['edit', 'write']
    reportTestFilePatterns:
      - '(^|[\\/])(tests?|__tests__|specs?)([\\/]|$)'
      - '\\.(test|spec)\\.[A-Za-z0-9]+$'

- id: doublecheck-guard
  config:
    intensity: warn
    modules:
      grill: true
      tdd: true         # red/green evidence gates (v0.2)
      adversary: true   # forked critic review (v0.3)
    adversaryModel: null            # or e.g. 'deepseek-v4-pro' for a separate critic model
    adversaryProvider: 'fork'       # subagent provider the critic runs on
    adversaryMaxFindings: 5         # findings cap injected into the session
    adversaryTools: ['read', 'glob', 'grep']   # critic tool allowlist (read-only)
    adversaryTimeoutMs: 120000      # hard budget for one critic run
    guardTools: ['edit', 'write']
    vagueTaskMaxChars: 200
    remindOnce: true
    testToolNames: ['bash', 'pwsh']
    testCommandPatterns:
      - '(?:^|[;&|]\s*)(?:(?:pnpm|npm|npx|yarn|bun)(?:\s+run)?\s+(?:test|vitest|jest|mocha)(?:\s|$))'
      - '(?:^|[;&|]\s*)(?:(?:pytest|go\s+test|cargo\s+test|make\s+test|ctest)(?:\s|$))'
      - '(?:^|[;&|]\s*)(?:node\s+--test(?:\s|$))'
      - '(?:^|[;&|]\s*)(?:deno\s+test|uv\s+run\s+pytest)(?:\s|$)'
    testFilePatterns:
      - '(^|[\\/])(tests?|__tests__|specs?)([\\/]|$)'
      - '\\.(test|spec)\\.[A-Za-z0-9]+$'
```

The shipped `strict.patch.yml` is exactly this guard row at `intensity: block` with every module on — apply it as a patch layer after the bundle patch for strict mode without hand-editing a profile.

### `intensity`

| Value | Behavior on a gated `edit`/`write` |
|---|---|
| `remind` (default) | Call proceeds; a reminder rides the result context into the next model request. |
| `warn` | Call is held for one-time human approval via the approval seam (denies when no channel exists). |
| `block` | Call is denied with feedback directing the model to fix the discipline first. |

### Tuning

| Key | Default | Meaning |
|---|---|---|
| `modules.grill` | `true` | Off disables the grill gate. The grill skill/tools switch is their row's `disabled` flag. |
| `modules.tdd` | `true` | On enables the red/green evidence gates (v0.2); enabled by default since v0.5. |
| `modules.adversary` | `false` | On enables the forked critic review at green (v0.3); uses the `ctx.subagents` seam — a missing seam settles as an "unavailable" notice. |
| `enableByDefault` | `true` | Master switch for sessions without a `/doublecheck on|off` record. |
| `language` | `'en'` | Injected reminder/deny/review prose language (`en` / `zh`). |
| `guardTools` | `['edit', 'write']` | Mutation tool names both gates watch. |
| `vagueTaskMaxChars` | `200` | Longer tasks are never treated as vague. Brief tasks naming a file, path, URL, an underscore keyword, or a hyphenated keyword are concrete. |
| `remindOnce` | `true` | Inject each gate's reminder at most once per session — durable across restarts (folded from the log). |
| `testToolNames` | `['bash', 'pwsh']` | Shell tool names that can run tests. |
| `testCommandPatterns` | *(pnpm/npm/yarn/bun test, pytest, go/cargo/make test, node --test, deno test, uv run pytest)* | Regexes a command must match to count as a test run. |
| `testFilePatterns` | *(test dirs, `*.test.*` / `*.spec.*`)* | Regexes identifying test files — always editable, exempt from the red gate. |
| `adversaryModel` | `null` | Critic model route; `null` = main model self-reviews. |
| `adversaryProvider` | `'fork'` | Subagent provider name the critic runs on. |
| `adversaryMaxFindings` | `5` | Findings cap (1–20) injected into the session. |
| `adversaryTools` | `['read', 'glob', 'grep']` | Critic tool allowlist; keep it read-only. |
| `adversaryTimeoutMs` | `120000` | Hard time budget for one critic run. |

Misconfiguration fails loud: an invalid regex, an empty/duplicated name list, or an out-of-range findings cap throws at load instead of silently doing nothing. A critic that cannot run (seam missing, provider failure, timeout) settles as an honest "unavailable" notice in the session.

### Report knobs (grill row)

| Key | Default | Meaning |
|---|---|---|
| `reportFile` | `'doublecheck-report.md'` | Workspace file receiving the report markdown. |
| `reportVerify` | `true` | Default for the tool's `verify` flag. |
| `verifyProvider` | `'fork'` | Subagent provider the per-dimension checkers run on. |
| `verifyMode` | `'all'` | `all` = one parallel checker per dimension; `single` = one combined checker (one subagent, cheaper). |
| `reportTestToolNames` / `reportTestCommandPatterns` | *(same defaults as the guard row)* | Report-scoped test-run classification. |
| `reportMutationTools` / `reportTestFilePatterns` | *(same defaults as the guard row)* | Report-scoped implementation-edit classification. |

The report's classification knobs are independent of the guard's: gate enforcement and report folding can be tuned separately without one silently changing the other. Verification degrades honestly: a missing `workflowEngine` seam or a rejected run leaves `verification: null` and the markdown says so.

## How it works (extension points)

| Contribution | DSH mechanism |
|---|---|
| Bundled skills | `ctx.skills.registerProvider()` — skill capability seam, `source: bundled` |
| Catalog/loader tool | `ctx.tools.register()` — `doublecheck_skills` |
| Spec commit + workspace file | `doublecheck_spec` tool + `ctx.fs` write (optional) |
| Requirements gate | `tools/pre-execute` waterfall — `allow` / `ask` (approval seam) / `deny` |
| Red gate | `tools/pre-execute` waterfall — hard check of failing-test evidence before implementation edits |
| Reminder injection | `tools/post-execute` waterfall — `additionalContexts` → logged as `user/message` |
| Green gate | `agent/turn-stopping` serial — injects a completion reminder when edits lack a passing run |
| Adversary review | `ctx.subagents.start()` — forked critic with structured findings schema, injected at green; `warn`/`block` steer one round |
| Delivery report | `doublecheck_report` tool — session-log fold + workspace markdown |
| Verification workflow | `ctx.workflowEngine.start()` — one parallel checker per spec dimension, structured checks |
| Durable state | session log fold over `tool/call` + `tool/result` + `tool/code-dispatch` + injected structured sources; model-visible ⟺ logged |
| Session command | `ctx.commands.register()` — `/doublecheck status|report|on|off`; `on|off` writes the durable `doublecheck/state` session event |
| Internal events | `doublecheck/spec`, `doublecheck/reminder`, `doublecheck/review`, `doublecheck/report` (typed via declaration merging, `@mode emit`) |

No agent-loop changes. Every registration is a reversible `ctx.effect` / `ctx.on` / service `register()`.

## What the model sees

- The `grill-requirements` skill joins the session skill catalog and loads through the built-in `skill` tool (or `doublecheck_skills`).
- `ask_user_question` stays the native DSH way to interrogate the user; the skill only choreographs it (and degrades to prose questions in headless runs with no provider).
- Reminders arrive as `{kind:'plugin'}` context, so transcript UIs present them as injection metadata.
- The adversary critique arrives the same way after the critic settles, with severity-tagged findings; under `warn`/`block` the loop is steered one round so the model answers them.
- `doublecheck_report` returns the consolidated report as a tool result (spec, test timeline, review, verification, verdict), so "prove the delivery" is one call away.
- `/doublecheck` answers in the transcript directly: `status` shows the switch, modules, intensity, and stage facts, `report` prints the folded report, `on|off` flips the session switch.

## Session command

```
/doublecheck status|report|on|off
```

- `status` — effective switch (durable override beats the config default), configured modules, enforcement intensity, and the folded stage facts (spec committed, red/green color, review on record, edit count).
- `report` — folds the delivery report from the session log on the spot (no verification workflow; `doublecheck_report` owns that path).
- `on` / `off` — writes the durable `doublecheck/state` event (survives restart, resume, and fork — replay IS the state) and injects a model-visible switch notice.

All command replies honor the guard row's `language` setting.

## Roadmap

The six-stage discipline loop is complete: **grill → design → red → green → review → verify** all ship in this package (v0.1 → v0.6). Real-transcript regression fixtures pin the durable event shapes (`tests/fixtures/`). Future work: richer report formatting, a Web-UI discipline-status badge, and cross-session spec seeding from the workspace file.

## Develop

```sh
pnpm install --ignore-workspace
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```

## Acknowledgments

Methodology inspired by [obra/superpowers](https://github.com/obra/superpowers) (TDD-style engineering discipline) and [TimothyVang/Grill-me](https://github.com/TimothyVang/Grill-me) (interrogating requirements before implementation). This package is an original implementation: no text, prompt, or file from either project is copied.

## Contributors

- [PerryLink](https://github.com/PerryLink) — author & maintainer: the v0.1 → v0.6 discipline loop, the five-language docs, the CI/release pipeline, and the ecosystem submissions ([awesome-dsh-plugin#451](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/451), [awesome-dsh-plugins#147](https://github.com/AdamPlatin123/awesome-dsh-plugins/pull/147), [awesome-deepseek-harness#179](https://github.com/0xsline/awesome-deepseek-harness/pull/179), [bruc3van/awesome-dsh-plugin#36](https://github.com/bruc3van/awesome-dsh-plugin/pull/36), [dsh-hub-workshop#13](https://github.com/omdsh-dev/dsh-hub-workshop/issues/13)/[#19](https://github.com/omdsh-dev/dsh-hub-workshop/pull/19)).

Issues, pull requests, and Discussions are all welcome — entry points are at the top of this document.

## License

[Apache-2.0](LICENSE)
