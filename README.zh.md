<div align="center">

# dsh-doublecheck

**DeepSeek Harness 的交付质量门禁：先拷问需求，再测试实现，最后证明交付——并用「可交付 / 需要返工」的裁决来把关交接。**

*需求在第一次改动之前就被拷问清楚；交付是被证明的，而不是被口头宣称的。*

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

## 兼容性

| 方面 | 状态 |
|---|---|
| Harness | DeepSeek Harness `0.1.0-rc.6` |
| Node | `^22.19.0 \|\| >=24.0.0` |
| 平台 | 全部（纯宿主；无原生代码，自身无直接网络请求） |
| 模型 | 任意（守卫本身从不调用模型；评审与批评阶段作为宿主 subagent 运行） |

## 你会得到什么

`dsh-doublecheck` 安装两个插件行，它们读取并执行同一份持久会话日志：

1. **`doublecheck-grill`** —— 需求熔炉：内置的 `grill-requirements` 技能，加上面向模型的 `doublecheck_skills`、`doublecheck_spec`、`doublecheck_report` 工具，以及按维度执行的验证工作流。
2. **`doublecheck-guard`** —— 纪律守卫：grill 门禁、红/绿证据门禁、对抗式评审、`/doublecheck` 与 `/gate` 命令、`doublecheck.gate` 设置命名空间，以及四阶段交付门禁。

两者共同执行**纪律闭环** —— *grill → design → red → green → review → verify*：

```text
grill ──▶ design ──▶ red ──▶ green ──▶ review ──▶ verify
   │
   └─ 六个需求维度、共识门禁，
      结构化 spec 提交到会话 + 工作区
```

| 阶段 | 含义 |
|---|---|
| **grill** | 拷问六个需求维度；在达成共识之前拒绝实现。 |
| **design** | 通过 `doublecheck_spec` 提交已确定的 spec。 |
| **red** | 在实现改动之前，用一次失败的测试运行来证明差距。 |
| **green** | 改动之后一次通过的测试运行闭合闭环。 |
| **review** | 一个分叉的对抗式批评者对照 spec 审计交付。 |
| **verify** | `doublecheck_report` + 按维度的验证工作流证明交付。 |

## 快速开始

```sh
# 1. install the bundle into your profile
dsh plugin --profile web add "github:PerryLink/dsh-doublecheck#main"

# or from npm (published releases)
dsh plugin --profile web add dsh-doublecheck

# 2. restart and verify the row
dsh --profile web --dump-config | grep -E -A3 'id: doublecheck-(grill|guard)'
```

两个行（`doublecheck-grill` 和 `doublecheck-guard`）随配置文件自动激活。

## 安装与卸载

- **git 渠道**（最新 `main`）：`dsh plugin --profile web add "github:PerryLink/dsh-doublecheck#main"` —— `prepare` 脚本只使用生产依赖进行构建。
- **npm 渠道**（发布版本）：`dsh plugin --profile web add dsh-doublecheck`。
- **tarball 渠道**：在本仓库中执行 `pnpm pack`，然后 `dsh plugin --profile web add ./dsh-doublecheck-<version>.tgz`。
- **卸载**：`dsh plugin --profile web remove dsh-doublecheck`（或从配置文件补丁中移除这些行）。

如需零配置的严格模式（每个门禁都以 `block` 强度开启、要求门禁覆盖率），在捆绑补丁之上应用随附的覆盖层：`dsh --profile web --patch ./node_modules/dsh-doublecheck/strict.patch.yml`。

## 配置

所有可调项都是 Schemastery 的 `Config` 字段（可在 cordis.yml 中修改）。按 id 定位的覆盖会替换整行——请重新声明你需要的每一个键。`cordis.patch.yml` 逐键内联说明；Schema 默认值是调优默认值的唯一来源。

| 键 | 默认值 | 含义 |
|---|---|---|
| `specFile` | `'doublecheck-spec.md'` | 已提交 spec markdown 的工作区文件（grill 行）。 |
| `reportFile` | `'doublecheck-report.md'` | 交付报告的工作区文件（grill 行）。 |
| `reportVerify` | `true` | 默认运行验证工作流（grill 行）。 |
| `verifyProvider` | `'fork'` | 各维度检查器运行的 subagent 提供者（grill 行）。 |
| `verifyMode` | `'all'` | `all` = 每个维度一个并行检查器；`single` = 一个合并检查器（grill 行）。 |
| `intensity` | `'remind'` | grill、红/绿和评审门禁的执行强度（`remind` / `warn` / `block`）。 |
| `enableByDefault` | `true` | 没有 `/doublecheck on\|off` 记录的会话的主开关。 |
| `language` | `'en'` | 注入的提醒/拒绝/评审/门禁文案语言（`en` / `zh`）。 |
| `guardTools` | `['edit', 'write']` | 两个门禁监视的修改工具名称。 |
| `vagueTaskMaxChars` | `200` | 超过此长度的任务绝不会被视为模糊。 |
| `remindOnce` | `true` | 每个提醒每会话最多注入一次（跨重启持久）。 |
| `testToolNames` | `['bash', 'pwsh']` | 可以运行测试的 shell 工具名称。 |
| `testCommandPatterns` | *(pnpm/npm/yarn/bun test、pytest、go/cargo/make test、node --test、deno test、uv run pytest)* | 命令必须匹配才能计为一次测试运行的正则。 |
| `testFilePatterns` | *(测试目录、`*.test.*` / `*.spec.*`)* | 识别测试文件的正则——始终可编辑，免于红门禁。 |
| `modules.grill` | `true` | 关闭则禁用 grill 门禁。 |
| `modules.tdd` | `true` | 开启则启用红/绿证据门禁。 |
| `modules.adversary` | `false` | 开启则在绿色后启用分叉批评者评审。 |
| `adversaryModel` | `null` | 批评者模型路由；`null` = 主模型自评。 |
| `adversaryProvider` | `'fork'` | 批评者运行的 subagent 提供者。 |
| `adversaryMaxFindings` | `5` | 注入会话的发现上限（1–20）。 |
| `adversaryTools` | `['read', 'glob', 'grep']` | 批评者工具允许列表；请保持只读。 |
| `adversaryTimeoutMs` | `120000` | 一次批评者运行的硬性时间预算。 |
| `gate.enabled` | `true` | 门禁面板与回合边界红色通知的主开关。 |
| `gate.planSuggestion` | `true` | 在红色报告中附加计划模式复查建议。 |
| `gate.reportFile` | `'gate-report.md'` | 门禁报告的工作区文件。 |
| `gate.requirements.checklist` | *(六个 spec 维度问题)* | 可插拔的关键问题清单：`{ id, question, specDimension, required }`。 |
| `gate.requirements.minConfirmed` | `6` | 必须通过的最少必答问题数（1..必答数量）。 |
| `gate.requirements.interrogateTool` | `'ask_user_question'` | 其调用计为询问证据的工具名称。 |
| `gate.tests.requirePassingRun` | `true` | 最近一次测试运行未通过（或缺失）即为红灯。 |
| `gate.tests.allowFailingRuns` | `0` | 最近一次绿色之后允许的失败运行次数，超过则红灯。 |
| `gate.tests.requireCoverage` | `false` | 开启则要求在测试输出中有覆盖率证据。 |
| `gate.tests.minCoveragePct` | `80` | 最低覆盖率百分比（0–100）。 |
| `gate.consistency.*` | `provider: 'fork'`、`model: null`、`tools: ['read','glob','grep']`、`timeoutMs: 120000`、`maxFindings: 5` | 本地一致性评审者的旋钮（`model: null` = 主模型）。 |
| `gate.review.engine` | `'auto'` | `auto` = 存在时使用 dsh-auto-review 的裁决记录，否则使用本地评审者；`local` = 始终使用本地评审者。 |
| `gate.review.provider` | `'fork'` | 本地评审评审者的提供者（其 `model`/`tools`/`timeoutMs`/`maxFindings` 与 `gate.consistency.*` 相同）。 |

配置错误会在加载时大声失败：无效的正则、空或重复的名称列表、越界阈值、重复的清单 id 都会抛错，而不是悄无声息地什么都不做。`strict.patch.yml` 是全门禁阻断覆盖层，以 `intensity: block` 重新声明守卫行，开启所有模块并要求覆盖率。

## 工具与界面

| 界面 | 类型 | 说明 |
|---|---|---|
| `doublecheck_skills` | 工具 | 通过技能注册表接口列出并加载包内四个内置技能。 |
| `doublecheck_spec` | 工具 | 将拷问得出的六维 spec 提交到会话日志和工作区 markdown 副本。 |
| `doublecheck_report` | 工具 | 将纪律证据折叠为交付报告（可选的按维度验证工作流）。 |
| `/doublecheck status\|report\|on\|off` | 命令 | 开关、模块、强度、阶段事实、折叠报告，以及持久的开/关覆盖。 |
| `/gate status\|run\|config` | 命令 | 实时清单进度、已确定的可交付/返工报告，以及生效配置。 |
| `grill-requirements`、`red-green-tdd`、`delivery-review`、`delivery-proof` | 技能 | 覆盖全部六个闭环阶段的内置纪律技能。 |
| `doublecheck.gate` | 设置命名空间 | 可插拔清单，暴露给支持设置的 UI（`expose: true`、`applies: restart`）。 |
| `strict.patch.yml` | 覆盖层 | 一个补丁层内以 `block` 强度开启每个门禁并启用覆盖率要求。 |
| `dsh-doublecheck/invariant` | 伴生行 | 通过宿主 `invariants` 注册表报告包自有写路径矛盾。 |

## 门禁阶段

交付门禁把会话的持久证据聚合为可配置的四阶段清单，并确定一个 **可交付 / 需要返工** 的裁决。每个阶段只折叠会话日志（重放即状态），因此一次运行在恢复或分叉后会得到相同的结果。

| 阶段 | 检查 | 证据来源 | 模型成本 |
|---|---|---|---|
| 需求询问 | 逐项确认的关键问题清单（默认六个 spec 维度问题） | 已提交的 `doublecheck_spec` + `ask_user_question` 调用 | 无 |
| 测试证据 | 最近运行颜色、绿色后的失败运行、可选覆盖率阈值 | 会话日志中的 shell 测试运行（`[exit code: N]`、覆盖率百分比） | 无 |
| 实现一致性 | 差异 ↔ 需求映射：每次改动都必须服务于某个 spec 维度 | 本地分叉评审者（结构化发现、只读工具） | 一个 subagent |
| 评审结论 | 交付裁决；`engine: auto` 在存在时消费 dsh-auto-review 的持久裁决记录，否则使用本地评审者 | `autoReview/verdict` / `autoReview/rejection` 事件，或本地分叉评审者 | 一个 subagent（本地） |

红灯是失败的检查（缺失 spec、最近运行失败、覆盖率低于下限、未映射的改动、blocker/major 发现）——每一项都附带返工建议。警告与跳过永远不会翻转裁决。门禁将 [dsh-auto-review](https://github.com/PerryLink/dsh-auto-review) 作为弱依赖集成：`review.engine: auto` 在存在时折叠其裁决记录，否则降级到本地评审者；门禁从不合成审批请求。

## 示例报告

`/gate run` 返回这份 markdown——可直接粘贴到 PR 描述中：

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

## 权限与数据

- **读取**：仅进程内读取会话日志（`tool/call` / `tool/result` / `tool/code-dispatch`、注入的 `user/message` 来源，以及外部的 `autoReview/*` 裁决记录）；可选的计划模式服务状态。
- **写入**：会话工作区中的 `doublecheck-spec.md`、`doublecheck-report.md` 和 `gate-report.md`（路径可配置），通过 `ctx.fs` 接口；持久的 `doublecheck/state` 和 `doublecheck/gate` 会话事件。
- **模型调用**：门禁的一致性阶段和本地评审阶段（每次 `/gate run` 各一个 subagent）、可选的对抗式评审，以及 `doublecheck_report` 验证工作流会启动 subagent 运行；除此之外不调用模型或网络。
- **绝不触碰**：凭据、环境变量，或会话工作区之外的任何文件。workshop 清单只声明 `filesystem:read` 和 `filesystem:write`。门禁报告只携带计数、id 和裁决；评审文本中被识别的机密在存储或显示之前会被脱敏。

## 安全边界

- **模型可见 ⟺ 已记录。** 每条注入的提醒、评审和门禁通知都经由标准通道并落入会话日志；持久的 spec/state/gate 事实经由工具结果或 `SessionEventMap` 成员。
- **失败关闭 / 大声失败。** 守卫和门禁配置在 `apply` 中校验（断言抛错）；无法运行的评审者或对抗式接口会退化为诚实的 "unavailable"/跳过通知，而非伪造裁决。
- **审计安全报告。** 门禁和交付报告只记录计数、id 和裁决——不含文件内容或会话文本——模型生成的发现文本在存储或显示之前会经过机密脱敏器。
- **自身无网络。** 该插件不发起直接网络请求；批评者和评审者 subagent 经由宿主的 subagent 接口运行。
- **对 dsh-auto-review 的弱依赖。** 它从不被 import 或硬性要求；门禁折叠其持久裁决记录并降级到本地评审者，且从不合成审批请求。

## 已知限制

- **rc.6 上的持久写入。** `/doublecheck on\|off` → `doublecheck/state` 与 `/gate run` → `doublecheck/gate` 需要宿主的 `ignorable` 追加接口（rc.6 之后）；在 rc.6 宿主上选项包被忽略，事件保持必需读取，因此开关停留在内存中，门禁记录只存在于命令结果 + 工作区文件，直到升级宿主。
- **可选接口。** `doublecheck.gate` 设置命名空间仅在挂载设置服务时注册；`/gate status` 的计划模式行读取可选的 `ctx.planMode`（没有则显示 `unknown`）；对抗式评审需要 `ctx.subagents`；验证需要 `workflowEngine`。
- **本地降级。** 当 dsh-auto-review 缺失或本会话没有裁决记录时，`gate.review.engine: auto` 会降级到本地评审者——报告会写明原因，而不是捏造裁决。

## 开发

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

## 主题

`dsh`, `dsh-plugin`, `deepseek-harness`, `engineering-discipline`, `requirements`, `guard`, `skill`, `quality-gate`, `delivery-gate`

## 贡献者

- [@PerryLink](https://github.com/PerryLink) —— 创建者与维护者：grill → design → red → green → review → verify 纪律闭环、四阶段交付门禁、五语言文档，以及 CI/发布流水线。

## PerryLink DSH Plugin Family

本项目是 [PerryLink](https://github.com/PerryLink) 维护的 [15 个 DeepSeek Harness 插件](https://github.com/PerryLink)之一。如果这个对你有所帮助，其余的很可能也会帮到你：

| Plugin | One-liner |
|---|---|
| [dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel) | Read-only MCP runtime panel: /mcp command + Settings tab with status, tools and errors |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** | Engineering-discipline guard + delivery quality gate: requirements grill, test gates, adversary review, /gate deliverable/rework panel |
| [dsh-background-agents](https://github.com/PerryLink/dsh-background-agents) | Durable background child agents with a Web UI sidebar, messaging and interrupt |
| [dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions) | LSP diagnostics, formatting, completion, code actions and rename over language servers |
| [dsh-output-styles](https://github.com/PerryLink/dsh-output-styles) | Claude Code outputStyles-equivalent runtime style switching |
| [dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind) | Claude Code /rewind-equivalent: snapshots, session forks, one-shot restore |
| [dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules) | Claude Code-style declarative allow/deny/ask permission rules with audit |
| [dsh-auto-review](https://github.com/PerryLink/dsh-auto-review) | Second-model auto-review on the approval chain, fail-closed by default |
| [dsh-memento](https://github.com/PerryLink/dsh-memento) | Approval-gated cross-session memory: ctx.memory seam + SQLite + memory tool |
| [dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security) | Security-audit skill pack: secret scan, dependency and supply-chain review |
| [dsh-session-pin](https://github.com/PerryLink/dsh-session-pin) | Pin sessions in the Web sidebar with durable ordering |
| [dsh-composer-history](https://github.com/PerryLink/dsh-composer-history) | Terminal-style input history for the web composer: arrows, Ctrl+R search |
| [dsh-github](https://github.com/PerryLink/dsh-github) | GitHub PR/issues integration for DSH, every write gated by approval |
| [dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide) | Plugin-development knowledge base as an on-demand agent skill |
| [dsh-claude-move](https://github.com/PerryLink/dsh-claude-move) | Migrate Claude Code sessions, memory, skills and CLAUDE.md into DSH |

## 许可证

[Apache License 2.0](LICENSE) © 2026 dsh-doublecheck contributors
