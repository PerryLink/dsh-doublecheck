# dsh-doublecheck

> **Double-check before you ship: grill the requirements, test the implementation, prove the delivery.**

[![version](https://img.shields.io/badge/version-0.4.0-blue)](https://github.com/PerryLink/dsh-doublecheck/releases)
[![license](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)
[![topics](https://img.shields.io/badge/topics-dsh%20%7C%20dsh--plugin-22c55e)](https://github.com/topics/dsh-plugin)

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

## Features (v0.4)

- 🔥 **`grill-requirements` skill** — a bundled Agent-Skills-format skill that interrogates the task across six dimensions (**goal, scope, acceptance criteria, failure modes, priorities, non-goals**) using DSH's native `ask_user_question` UI, refuses to write code until consensus, and records the contract.
- 📜 **`doublecheck_spec` tool** — commits the grilled spec to the session log and writes a markdown copy to the workspace, so the contract survives the conversation.
- 🛡️ **Discipline guard** — a soft gate on the tool policy pipeline. Vague task + no spec + heading for `edit`/`write` → **remind**, **hold for human approval**, or **block**, depending on `intensity`.
- 🟥🟩 **Red/green evidence gates** (`modules.tdd`) — hard checks over the session log: an implementation edit requires a **failing test run on record** since the last passing run (writing test files is always allowed — that is how the red step happens), and a turn that ends with edits but no passing run gets a green reminder injected.
- 👁️ **Adversary review** (`modules.adversary`) — once the delivery reaches green, a forked critic subagent (DSH's native subagent seam, default `fork` provider) audits the session against the committed spec with an adversarial stance and returns structured findings. `remind` injects the critique; `warn`/`block` additionally steer one round to make the model answer the findings. `adversaryModel` routes the critic to a separate model; the critic's tool allowlist is read-only by default. Findings ride the durable `doublecheck-review` message source.
- 📊 **Doublecheck report + verification workflow** (`doublecheck_report`, v0.4) — consolidates the session's discipline evidence (spec, red/green timeline, review findings, edits) into a delivery report with a derived verdict (`grill → draft → red → green → objections/verified → proven/challenged`), written to the workspace. With `verify`, one parallel checker per spec dimension runs through DSH's workflow seam and their verdicts fold into the report.
- 🔁 **Durable state** — every model-visible artifact (spec, reminders, deny feedback, review findings) lands in the session log; gate decisions derive from the log alone (`tool/call` + `tool/result`, including Code Mode sub-dispatches), so resumed and forked sessions enforce identically.
- 📚 **`doublecheck_skills` tool** — lists and loads the package's skills through the official skill registry seam.

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
dsh plugin --profile <name> add ./dsh-doublecheck-0.4.0.tgz
```

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
    testFilePatterns:
      - '(^|[\\/])(tests?|__tests__|specs?)([\\/]|$)'
      - '\\.(test|spec)\\.[A-Za-z0-9]+$'
```

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
| `modules.tdd` | `false` | On enables the red/green evidence gates (v0.2). |
| `modules.adversary` | `false` | On enables the forked critic review at green (v0.3); uses the `ctx.subagents` seam — a missing seam settles as an "unavailable" notice. |
| `guardTools` | `['edit', 'write']` | Mutation tool names both gates watch. |
| `vagueTaskMaxChars` | `200` | Longer tasks are never treated as vague. Brief tasks naming a file, path, URL, an underscore keyword, or a hyphenated keyword are concrete. |
| `remindOnce` | `true` | Inject each gate's reminder at most once per session. |
| `testToolNames` | `['bash', 'pwsh']` | Shell tool names that can run tests. |
| `testCommandPatterns` | *(pnpm/npm/yarn/bun test, pytest, go/cargo/make test, node --test)* | Regexes a command must match to count as a test run. |
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
| Internal events | `doublecheck/spec`, `doublecheck/reminder`, `doublecheck/review`, `doublecheck/report` (typed via declaration merging, `@mode emit`) |

No agent-loop changes. Every registration is a reversible `ctx.effect` / `ctx.on` / service `register()`.

## What the model sees

- The `grill-requirements` skill joins the session skill catalog and loads through the built-in `skill` tool (or `doublecheck_skills`).
- `ask_user_question` stays the native DSH way to interrogate the user; the skill only choreographs it (and degrades to prose questions in headless runs with no provider).
- Reminders arrive as `{kind:'plugin'}` context, so transcript UIs present them as injection metadata.
- The adversary critique arrives the same way after the critic settles, with severity-tagged findings; under `warn`/`block` the loop is steered one round so the model answers them.
- `doublecheck_report` returns the consolidated report as a tool result (spec, test timeline, review, verification, verdict), so "prove the delivery" is one call away.

## Roadmap

The six-stage discipline loop is complete: **grill → design → red → green → review → verify** all ship in this package (v0.1 → v0.4). Future work: snapshot coverage for the review/report transcripts, and richer report formatting.

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

## License

[Apache-2.0](LICENSE)
