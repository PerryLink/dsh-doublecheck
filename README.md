# dsh-doublecheck

> **Double-check before you ship: grill the requirements, test the implementation, prove the delivery.**

[![license](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)
[![version](https://img.shields.io/badge/dsh-0.1.0--rc.6-8A2BE2)](https://www.npmjs.com/package/@deepseek-ai/dsh)
[![topic](https://img.shields.io/badge/topic-dsh--plugin-22c55e)](https://github.com/topics/dsh-plugin)

An **engineering-discipline bundle** for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). Agents love to start coding; requirements hate being assumed. `dsh-doublecheck` installs a discipline loop that makes the agent **grill the requirements before the first edit, and prove the delivery instead of claiming it** — re-implemented natively on DSH's own extension points (skill registry, tool policy pipeline, approval seam, session log), not on borrowed prompt files.

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
| **red** | A failing test proves the gap. | 🔜 v0.2 |
| **green** | The fix makes it pass; the log proves the order. | 🔜 v0.2 |
| **review** | Adversary critic reviews the delivery (`adversaryModel`). | 🔜 v0.3 |
| **verify** | Workflow orchestration + consolidated doublecheck report. | 🔜 v0.4 |

## Features (v0.1)

- 🔥 **`grill-requirements` skill** — a bundled Agent-Skills-format skill that interrogates the task across six dimensions (**goal, scope, acceptance criteria, failure modes, priorities, non-goals**) using DSH's native `ask_user_question` UI, refuses to write code until consensus, and records the contract.
- 📜 **`doublecheck_spec` tool** — commits the grilled spec to the session log and writes a markdown copy to the workspace, so the contract survives the conversation.
- 🛡️ **Discipline guard** — a soft gate on the tool policy pipeline. Vague task + no spec + heading for `edit`/`write` → **remind**, **hold for human approval**, or **block**, depending on `intensity`.
- 🔁 **Durable state** — every model-visible artifact (spec, reminders, deny feedback) lands in the session log; guard decisions derive from the log alone, so resumed and forked sessions enforce identically.
- 📚 **`doublecheck_skills` tool** — lists and loads the package's skills through the official skill registry seam.

## Install

```sh
dsh plugin --profile <name> add dsh-doublecheck
dsh --profile <name> --dump-config   # expect a "# == dsh-doublecheck" layer
```

Both plugin rows activate automatically with the profile. Tarball installs work too:

```sh
pnpm pack
dsh plugin --profile <name> add ./dsh-doublecheck-0.1.0.tgz
```

## Configure

Override any row **by id** in the profile's `cordis.patch.yml`. A patch replaces the row's whole config — restate every key:

```yaml
- id: doublecheck-grill
  config:
    specFile: 'specs/doublecheck-spec.md'   # default: 'doublecheck-spec.md'

- id: doublecheck-guard
  config:
    intensity: warn
    modules:
      grill: true
      tdd: false        # reserved for v0.2 — must stay false in v0.1
      adversary: false  # reserved for v0.3 — must stay false in v0.1
    adversaryModel: null
    guardTools: ['edit', 'write']
    vagueTaskMaxChars: 200
    remindOnce: true
```

### `intensity`

| Value | Behavior on a vague, spec-less `edit`/`write` |
|---|---|
| `remind` (default) | Call proceeds; a reminder rides the result context into the next model request. |
| `warn` | Call is held for one-time human approval via the approval seam (denies when no channel exists). |
| `block` | Call is denied with feedback directing the model to grill first. |

### Tuning

| Key | Default | Meaning |
|---|---|---|
| `modules.grill` | `true` | Off disables the guard. The grill skill/tools switch is their row's `disabled` flag. |
| `guardTools` | `['edit', 'write']` | Mutation tool names the guard watches. |
| `vagueTaskMaxChars` | `200` | Longer tasks are never treated as vague. Brief tasks naming a file, path, or URL are concrete. |
| `remindOnce` | `true` | Inject the reminder at most once per session. |
| `adversaryModel` | `null` | Reserved for the v0.3 critic; `null` = main model self-reviews. Non-null fails to load in v0.1. |

Misconfiguration fails loud: enabling a reserved module or setting `adversaryModel` throws at load instead of silently doing nothing.

## How it works (extension points)

| Contribution | DSH mechanism |
|---|---|
| Bundled skills | `ctx.skills.registerProvider()` — skill capability seam, `source: bundled` |
| Catalog/loader tool | `ctx.tools.register()` — `doublecheck_skills` |
| Spec commit + workspace file | `doublecheck_spec` tool + `ctx.fs` write (optional) |
| Requirements gate | `tools/pre-execute` waterfall — `allow` / `ask` (approval seam) / `deny` |
| Reminder injection | `tools/post-execute` waterfall — `additionalContexts` → logged as `user/message` |
| Durable state | session log fold over `tool/call` + `tool/result`; model-visible ⟺ logged |
| Internal events | `doublecheck/spec`, `doublecheck/reminder` (typed via declaration merging, `@mode emit`) |

No agent-loop changes. Every registration is a reversible `ctx.effect` / `ctx.on` / service `register()`.

## What the model sees

- The `grill-requirements` skill joins the session skill catalog and loads through the built-in `skill` tool (or `doublecheck_skills`).
- `ask_user_question` stays the native DSH way to interrogate the user; the skill only choreographs it (and degrades to prose questions in headless runs with no provider).
- Reminders arrive as `{kind:'plugin'}` context, so transcript UIs present them as injection metadata.

## Roadmap

- **v0.2** — red/green evidence gates: session-log verification that a failing test preceded the fix.
- **v0.3** — adversary module: a critic sub-agent reviews the delivery; `adversaryModel` selects the route.
- **v0.4** — workflow orchestration and a consolidated doublecheck report.

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
