<div align="center">

# dsh-doublecheck
- **1024 商店渠道**：先 `npm i -g dsh1024`，再 `dsh1024 plugin --profile web add dsh-doublecheck`（计入 [deepseek1024.com](https://deepseek1024.com) 安装排行）。

**DeepSeek Harness 的交付质量门禁：先拷问需求，再测试实现，最后证明交付——并用「可交付 / 需要返工」的裁决来把关交接。**

*需求在第一次改动之前就被拷问清楚；交付是被证明的，而不是被口头宣称的。*

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Gitee](https://img.shields.io/badge/Gitee-mirror-c71d23?logo=gitee)](https://gitee.com/perrylink/dsh-doublecheck)
[![DSH plugin](https://img.shields.io/badge/dsh--plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![dsh-doctor](https://raw.githubusercontent.com/PerryLink/dsh-plugin-doctor/main/badges/PerryLink__dsh-doublecheck.svg)](https://github.com/PerryLink/dsh-plugin-doctor#verified-徽章)
[![DSH Market](https://raw.githubusercontent.com/2BingLing/dsh-market/master/assets/readme/badge-listed-zh.svg)](https://dsh.market/)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-doublecheck/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-doublecheck/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-doublecheck?label=version)](https://github.com/PerryLink/dsh-doublecheck/releases)
[![npm version](https://img.shields.io/npm/v/dsh-doublecheck)](https://www.npmjs.com/package/dsh-doublecheck)
[![npm downloads](https://img.shields.io/npm/dm/dsh-doublecheck)](https://www.npmjs.com/package/dsh-doublecheck)
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-doublecheck?metric=downloads&lang=zh)](https://dshfind.com/zh/plugins/PerryLink/dsh-doublecheck?ref=badge)

[English](README.md) · [简体中文](README-zh.md) · [Español](README-es.md) · [Português](README-pt.md) · [हिन्दी](README-hi.md)

```sh
dsh plugin --profile <name> add dsh-doublecheck
```


</div>

---


**📖 生态实测知识库**（实测数据，不是营销）：[插件开发指南 · 选型实测数据 · 维护取舍判据](https://perrylink.github.io/dsh-plugin-guide/)。

<!-- star-cta -->
## ⭐ 如果它帮到了你

这个插件是 [DSH 插件家族](https://github.com/PerryLink)的一员（40+ 个，全部 Apache-2.0）。如果你在用，**给个 star** —— 它不会解锁任何功能，但会让下一个人在搜索里更容易找到它。

*English:* part of a 40+ plugin family for DeepSeek Harness. If it is useful, **a star helps the next person find it** — nothing is gated behind it.

## What is dsh-doublecheck?

DeepSeek Harness 的交付质量门禁：先拷问需求，再测试实现，最后证明交付——并用「可交付 / 需要返工」的裁决来把关交接。

需求在第一次改动之前就被拷问清楚；交付是被证明的，而不是被口头宣称的。

![dsh-doublecheck 终端演示：dsh-doublecheck — /gate report (example block from the README)](https://raw.githubusercontent.com/PerryLink/dsh-doublecheck/main/docs/assets/dsh-doublecheck-hero.png)

![Animated terminal demo of dsh-doublecheck](https://raw.githubusercontent.com/PerryLink/dsh-doublecheck/main/docs/assets/dsh-doublecheck-demo.gif)

*同一次运行，动图版。*

## 兼容性

| 方面 | 状态 |
|---|---|
| Harness | DeepSeek Harness `dsh-v0.2.1-alpha.1`。已于 2026-09-24 核验（双 typecheck 尺子 + 全量测试绿）；peer 区间接纳 `0.1.2-rc.1`、`0.1.5-alpha.1`、`0.1.5-rc.2`、`0.1.6-alpha.2`、`0.1.7-alpha.1` 与 `0.1.7-rc.2`，不丢任何已支持宿主线。 |
| Node | `^22.19.0 \|\| >=24.0.0` |
| 平台 | 全部（纯宿主；无原生代码，自身无直接网络请求） |
| 模型 | 任意（守卫本身从不调用模型；评审与批评阶段作为宿主 subagent 运行） |

## 你会得到什么

`dsh-doublecheck` 安装两个插件行，它们读取并执行同一份持久会话日志：

1. **`doublecheck-grill`** —— 需求熔炉：内置的 `grill-requirements` 技能，加上面向模型的 `doublecheck_skills`、`doublecheck_spec`、`doublecheck_report` 工具，以及按维度执行的验证工作流。
2. **`doublecheck-guard`** —— 纪律守卫：grill 门禁、红/绿证据门禁、对抗式评审、`/doublecheck` 与 `/gate` 命令、实时的 `gate` 设置卡片，以及四阶段交付门禁。

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
dsh plugin --profile web add github:PerryLink/dsh-doublecheck
```

```sh
# 1. install the bundle into your profile
dsh plugin --profile web add github:PerryLink/dsh-doublecheck

# or from npm (published releases)
dsh plugin --profile web add dsh-doublecheck

# 2. restart and verify the row
dsh --profile web --dump-config | grep -E -A3 'id: doublecheck-(grill|guard)'
```

两个行（`doublecheck-grill` 和 `doublecheck-guard`）随配置文件自动激活。

## 安装与卸载

- **git 渠道**（最新 `main`）：`dsh plugin --profile web add github:PerryLink/dsh-doublecheck` —— `prepare` 脚本只使用生产依赖进行构建。
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
| `gate.tests.evalReports.enabled` | `false` | 开启则把 dsh-eval 报告（dsh-auto-review 的评测引擎）并入测试证据。 |
| `gate.tests.evalReports.dir` | `'.eval-reports'` | 存放引擎报告的工作区相对目录。 |
| `gate.tests.evalReports.file` | `'report.json'` | 目录内的报告文件名。 |
| `gate.tests.evalReports.required` | `false` | 为 true 时缺失报告即为红灯（否则跳过）。 |
| `gate.consistency.*` | `provider: 'fork'`、`model: null`、`tools: ['read','glob','grep']`、`timeoutMs: 120000`、`maxFindings: 5` | 本地一致性评审者的旋钮（`model: null` = 主模型）。 |
| `gate.review.engine` | `'auto'` | `auto` = 存在时使用 dsh-auto-review 的裁决记录，否则使用本地评审者；`local` = 始终使用本地评审者。 |
| `gate.review.provider` | `'fork'` | 本地评审评审者的提供者（其 `model`/`tools`/`timeoutMs`/`maxFindings` 与 `gate.consistency.*` 相同）。 |

上表中每个 `gate.*` 键都属于同一个**活动字段**：守卫行把整个 `gate` 块标记为 `.volatile()`，因此它就是该行的可编辑设置卡片（表单命名空间即该行的 profile 条目 id）。其余键是来自 profile patch 的普通 composition 配置。该块在加载时读取一次，所以编辑在下次加载生效——`gate.enabled` 决定回合边界的红灯提示是否安装。若宿主的 schemastery 早于 `.volatile()`，本行照旧挂载：没有卡片，该块仍取自 profile patch。

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
| `gate` | 活动配置字段 | 可插拔清单是守卫行唯一的 `.volatile()` 字段：从该行的设置卡片编辑（命名空间 = 该行的 profile 条目 id），在加载时读取一次。 |
| `strict.patch.yml` | 覆盖层 | 一个补丁层内以 `block` 强度开启每个门禁并启用覆盖率要求。 |
| `dsh-doublecheck/invariant` | 伴生行 | 通过宿主 `invariants` 注册表报告包自有写路径矛盾。 |
| `doublecheck` | 会话投影 | 客户端渲染的一行有界状态：阶段、最近裁决、红灯数、编辑数与 spec/review 标记。见[如何读这一行](#如何读这一行)。 |

### 如何读这一行

`doublecheck` 会话投影是一个**字符串**，而且刻意只有一行——这样任何客户端都能完整显示它、不会切掉任何内容。聊天桥的 `/status`、状态栏或任何自定义消费者都原样渲染：

```text
gate:rework r2 | stage:green | test:green edits:12 spec:yes review:yes | goal:ship parser fix
```

| 片段 | 读法 |
|---|---|
| `gate:<裁决> r<n>` | 最近一次交付门禁的裁决——未运行时是 `none`，否则是 `deliverable` 或 `rework`——以及它的红灯数 `r<n>`。 |
| `stage:<阶段>` | 依据持久证据到达的纪律阶段：`grill`、`design`、`red`、`green`、`review`、`verify`。 |
| `test:<颜色>` | 最近一次测试运行的颜色：`none`、`red`、`green`。 |
| `edits:<n>` | 从会话日志折叠出的实现编辑数（写测试文件不计入）。 |
| `spec:yes` / `spec:no` | 日志中是否存在已提交的 `doublecheck_spec`。 |
| `review:yes` / `review:no` | 是否存在对手审查记录。 |
| `goal:<摘录>` | 已提交的 spec 目标，会被裁剪。仅当 `spec:yes` 时出现。 |

这一行的长度**由构造保证有界**，因此不会被任何渲染器截断：

- 硬预算：**120 个字符**。凡是原样保留 120 字符以内取值的渲染器——微信桥的通用投影渲染器就是其中之一——都会完整显示这一行。旧的「对象」形态**空态就有 131 个字符**，这正是裁决与红灯数过去总被切掉的原因。
- 前三段是**无损的**。红灯数超过 `9999`、编辑数超过 `99999` 时打印为 `9999+` / `99999+`，而不会无限增长；非有限值或负数打印为 `0`。
- `goal:` 是唯一有损的一段。它会被压成单行（换行与控制字符变空格，`|` 变 `/`），并裁剪到剩余预算，最多 40 个字符，被裁剪时以 `…` 结尾。完整目标见 `/doublecheck status` 与交付报告。
- 这是一眼速览，不是记录本身：`/gate status` 与 `/doublecheck status` 渲染完整状态。

该投影的 `stateVersion` 为 **3**。递增它会丢弃旧版本写入的持久化投影缓存行，并以该键从会话日志重新折叠，因此升级后的会话会重算这一行，而不是显示过期值。折叠状态本身没有变化，升级前的会话不会因此加载失败。

## 门禁阶段

交付门禁把会话的持久证据聚合为可配置的四阶段清单，并确定一个 **可交付 / 需要返工** 的裁决。每个阶段只折叠会话日志（重放即状态），因此一次运行在恢复或分叉后会得到相同的结果。

| 阶段 | 检查 | 证据来源 | 模型成本 |
|---|---|---|---|
| 需求询问 | 逐项确认的关键问题清单（默认六个 spec 维度问题） | 已提交的 `doublecheck_spec` + `ask_user_question` 调用 | 无 |
| 测试证据 | 最近运行颜色、绿色后的失败运行、可选覆盖率阈值、可选 dsh-eval 报告 | 会话日志中的 shell 测试运行（`[exit code: N]`、覆盖率百分比）；开启 `gate.tests.evalReports.enabled` 时的 dsh-eval 报告文件 | 无 |
| 实现一致性 | 差异 ↔ 需求映射：每次改动都必须服务于某个 spec 维度 | 本地分叉评审者（结构化发现、只读工具） | 一个 subagent |
| 评审结论 | 交付裁决；`engine: auto` 在存在时消费 dsh-auto-review 的持久裁决记录，否则使用本地评审者 | `autoReview/verdict` / `autoReview/rejection` 事件，或本地分叉评审者 | 一个 subagent（本地） |

红灯是失败的检查（缺失 spec、最近运行失败、覆盖率低于下限、未映射的改动、blocker/major 发现）——每一项都附带返工建议。警告与跳过永远不会翻转裁决。门禁将 [dsh-auto-review](https://github.com/PerryLink/dsh-auto-review) 作为弱依赖集成：`review.engine: auto` 在存在时折叠其裁决记录，否则降级到本地评审者；`gate.tests.evalReports.enabled` 把其评测引擎的 dsh-eval 报告（prompt 回归 / 压测 / 公平性套件）并入测试证据，并在报告不存在时如实跳过。门禁从不合成审批请求。

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

## CI 输出

`/gate run` 还会写一个 `gate-report.json`（与无损 JSON 相同的已定状态，位于 `gate-report.md` 旁边）。`doublecheck-gate` CLI 把该文件转成可供 GitHub Actions 使用的机器可读输出：

```sh
# JSON（PR 评论 / 状态载荷）
doublecheck-gate --format json --input gate-report.json
# SARIF 2.1.0（code-scanning 上传 / 状态检查）
doublecheck-gate --format sarif < gate-report.json
```

CLI 只序列化已定的 `GateState` —— 它从不重新运行四阶段门禁或证据折叠。其退出码映射裁决：`0` = 可交付，`1` = 返工，`2` = 用法/解析错误。

## 权限与数据

- **读取**：仅进程内读取会话日志（`tool/call` / `tool/result` / `tool/ptc-dispatch`、注入的 `user/message` 来源，以及外部的 `autoReview/*` 裁决记录）；可选的计划模式服务状态。V3 改名前的宿主用旧标签 `tool/code-dispatch` 记录 PTC 子调用；两个标签折叠结果完全一致。注入的提示携带本包自有的 `dsh-doublecheck` 消息来源 kind；该 kind 出现之前记录的日志会以 `plugin:dsh-doublecheck`（宿主 V3→V4 迁移对已发布的 catch-all 包装所做的改写）或已发布的 `plugin` 包装抵达，三种形态折叠结果一致。
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

- **持久写入。** `/doublecheck on\|off` → `doublecheck/state` 与 `/gate run` → `doublecheck/gate` 需要宿主的 `ignorable` 追加接口（rc.6 之后至 `0.1.1-rc.2`）。在无此接口的宿主上（rc.6/rc.8，以及移除该信封的 `0.1.2-alpha.1`——`0.1.2-rc.1` 仅恢复存量日志读取兼容字段、仍无法盖章），写入被跳过、开关保持进程内状态。
0.1.2-rc.1（2026-09-02 已适配）：会话信封保留 ignorable 字段但仅用于存量日志读取兼容——Session.append 仍无法盖章，门控行为不变。
0.1.5-alpha.1（2026-09-09 已适配）：会话格式 V3 把持久子调用事件 `tool/code-dispatch` 改名为 `tool/ptc-dispatch`（载荷不变；两个标签折叠结果一致）。Session.append 仍无 `ignorable` 写入通道，写入继续跳过、开关保持进程内——行为不变。（该条引入的 `doublecheck-gate` 设置命名空间已在 0.1.7-alpha.1 随宿主删除命名空间注册表一并移除。）
0.1.5-rc.1（2026-09-10 已适配）：依赖钉号移至已发布的 0.1.5-rc.1 线；无接口变更影响本插件行为。
0.1.5-rc.2（2026-09-11 已适配）：依赖钉号移至已发布的 0.1.5-rc.2 线；无接口变更影响本插件行为。
0.1.7-alpha.1（2026-09-22 已适配）：宿主删除了共享的 catch-all `plugin` 消息来源 kind（提示改携本包自有的 `dsh-doublecheck` kind，`remindOnce` 折叠仍能读取持久日志可能持有的两种升级前形态），并用 `SettingsForms` 取代了设置命名空间注册表（`doublecheck-gate` 命名空间消失；门禁清单改为守卫行唯一的 `.volatile()` 字段，仍在加载时读取一次）。`@deepseek-ai/cordis` 与 `@deepseek-ai/schemastery` 的 dev/test 钉号移至 `^4.0.3` / `^3.18.3`，即 `Volatile` 与 `.volatile()` 首次出现的版本；peer 区间仍为 `^4.0.2` / `^3.18.2`，且活动字段能力在加载时探测，因此更早的宿主线仍能挂载本行（只是没有设置卡片）。除设置存储位置外无行为变更。
- **可选接口。** 挂载设置服务时会出现守卫行自己的设置卡片；该卡片就是本行自己的 Config（命名空间 = 其 profile 条目 id），`gate` 块在加载时读取一次，因此其取值在下一次加载时作用于 `/gate` 面板与红灯提示。活动字段能力在加载时探测：若宿主的 schemastery 早于 `.volatile()`，本行照旧挂载——没有卡片，`gate` 块仍取自 profile patch。`/gate status` 的计划模式行读取可选的 `ctx.planMode`（没有则显示 `unknown`）；对抗式评审需要 `ctx.subagents`；验证需要 `workflowEngine`。
- **本地降级。** 当 dsh-auto-review 缺失或本会话没有裁决记录时，`gate.review.engine: auto` 会降级到本地评审者——报告会写明原因，而不是捏造裁决。
- **dsh-eval 证据基于文件。** dsh-auto-review 评测引擎（`dsh-eval`）把其 prompt 回归 / 压测 / 公平性结果写入工作区报告文件，而非会话日志。`gate.tests.evalReports.enabled` 折叠该文件（默认关闭；缺失时跳过），折叠出的计数随持久 `doublecheck/gate` 记录保存，使已定的运行仍可重放。

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

## 与其他 DSH 插件的互操作

已对照 **DSH `0.2.0-rc.2`**（本 README 面向的运行时）与 2026-10-05 实测的高星插件集验证。

本插件**不干扰**其他插件，包括广泛安装的高星插件：

- **无工具名冲突。** 所有工具都带命名空间，不占用任何已被内置工具或其他插件持有的裸名。
- **无服务键冲突。** 不提供任何服务键，因此不存在服务键冲突。
- **无 slot 冲突。** 不注册客户端 slot key，因此不参与 `shadows-shipped-ui` 座位争抢。
- **无 HTTP 路由冲突。** 不注册任何 `webServer` 前缀。
- **无 patch 层冲突。** 组合包 patch 只 `insert` 自己那一行，从不覆写内置行的 `config`。
- **无全局改写。** 不改原型、不改写 `process.env`、不替换全局 fetch dispatcher。

**共享事件监听器在构造上就不互相干扰。** 它用 `ctx.on()` 监听顺序敏感事件 `agent/turn-stopping`, `tools/post-execute`, `tools/pre-execute` —— Cordis 的**广播**语义：每个监听器都会运行，任何一个都无法饿死其他监听器。**此处每个监听器都通过 `next()` 委托**，因此链条绝不会被短路；改写作用在 `next()` 产出的值上，而不是用它顶替返回：
  - `tools/post-execute` — also used by `cc-safety-net` (1576★).
  - `tools/pre-execute` — also used by `cc-safety-net` (1576★).

静态证据：`dsh-plugin-doctor` 的 K10–K13 在本仓全部为 `pass`。

## PerryLink DSH 插件家族

本项目是 [PerryLink](https://github.com/PerryLink) 维护的 DeepSeek Harness 插件家族成员：**87 个活跃维护**，名册共 **95** 个，其中 **5 个已冻结**、**3 个已退役**。完整名单默认折叠，避免每个 README 的首屏被长表淹没；点击展开可查看每一行，原因见「状态」列。

<details>
<summary>展开全部 95 个插件</summary>

| 插件 | 一句话 | 状态 |
|---|---|---|
| **[dsh-aqua-input-check](https://github.com/PerryLink/dsh-aqua-input-check)** | 水产养殖投入品记录核对（按投入品用量、休药期与起捕间隔核对记录自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-archive-check](https://github.com/PerryLink/dsh-archive-check)** | 档案归档完整性与保管期限核对（依据《档案法》及配套规定，仅提示差异，不作出定性结论） |  |
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** | Second-model auto-review on the approval chain, fail-closed by default |  |
| **[dsh-autotier](https://github.com/PerryLink/dsh-autotier)** | Automatic strong/cheap model-tier routing with deterministic risk guards and a `/tier` command |  |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | Durable background child agents with a Web UI sidebar, messaging and interrupt | 🚫 已退役 — 见仓库 README |
| **[dsh-bid-ca-precheck](https://github.com/PerryLink/dsh-bid-ca-precheck)** | 投标文件符合性预检（按招标文件逐条核对响应情况，仅提示差异，不作出定性结论） |  |
| **[dsh-bid-qual-check](https://github.com/PerryLink/dsh-bid-qual-check)** | 投标人资格条件核对（按资格条件与证明材料核对逐条响应，仅提示差异，不作出定性结论） |  |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | Cost governance for DeepSeek Harness: budgets, carbon, and latency in one panel. | 🧊 已冻结 — 见仓库 README |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** | Read-only MCP server exposing the certification registry: grades, snapshots and five-dimension evidence |  |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** | Claude Code /rewind-equivalent: snapshots, session forks, one-shot restore |  |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | Migrate Claude Code sessions, memory, skills and CLAUDE.md into DSH | 🧊 已冻结 — 见仓库 README |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** | Cross-platform native desktop control for DeepSeek Harness — Windows first. |  |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** | Terminal-style input history for the web composer: arrows, Ctrl+R search |  |
| **[dsh-contract-stance](https://github.com/PerryLink/dsh-contract-stance)** | 合同条款立场台账核对（按立场、风险等级与退让底线核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-customs-doc-check](https://github.com/PerryLink/dsh-customs-doc-check)** | 报关单证一致性核对（按公开的报关单填制规范核对单证间字段一致性，仅提示差异，不作出定性结论） |  |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** | Dataset quality checks and citation cross-checks (the optional numeric bridge consumed here) |  |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | Prompt-injection, jailbreak, and secret-leak defense for DeepSeek Harness. | 🧊 已冻结 — 见仓库 README |
| **[dsh-demurrage-ledger](https://github.com/PerryLink/dsh-demurrage-ledger)** | 滞箱费台账核对（按免箱期与费率核对超期天数与金额的自洽性，仅提示差异，不作出定性结论） |  |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** | Engineering-discipline guard: requirements grill, test gates, adversary review |  |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | Unified static-image generation routing for DeepSeek Harness. | 🧊 已冻结 — 见仓库 README |
| **[dsh-drill-script-check](https://github.com/PerryLink/dsh-drill-script-check)** | 应急演练脚本核对（按阶段、响应分级、指挥与资源要素核对脚本齐备，仅提示差异，不作出定性结论） |  |
| **[dsh-eia-guide-check](https://github.com/PerryLink/dsh-eia-guide-check)** | 环评导则适用性核对（按要素、导则名称与执行标准核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-emergency-plan](https://github.com/PerryLink/dsh-emergency-plan)** | 应急预案要素齐备性与条款级页码定位（依据 GB/T 29639-2020 等公开文件，仅提示差异，不作出定性结论） |  |
| **[dsh-essay-rubric-check](https://github.com/PerryLink/dsh-essay-rubric-check)** | 作文量表评分核对（按评分项、原文定位与分值算术核对评分自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-evidence-check](https://github.com/PerryLink/dsh-evidence-check)** | 证据清单齐备性核对（按待证事实与证据要素核对清单自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-export-ctl-check](https://github.com/PerryLink/dsh-export-ctl-check)** | 出口管制物项核对（按管制清单、最终用途与许可证核对台账齐备，仅提示差异，不作出定性结论） |  |
| **[dsh-fast](https://github.com/PerryLink/dsh-fast)** | Read-only performance diagnostics for DeepSeek Harness. |  |
| **[dsh-fmea-table-check](https://github.com/PerryLink/dsh-fmea-table-check)** | FMEA 分析表要素齐备性与风险顺序数一致性核对（按公开的 FMEA 方法标准核对表内自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-forecast-penalty](https://github.com/PerryLink/dsh-forecast-penalty)** | 预测准确率考核核对（按准确率、门槛与考核单价核对考核费用的算术自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-fund-research](https://github.com/PerryLink/dsh-fund-research)** | Deterministic research reports for Chinese public mutual funds |  |
| **[dsh-github](https://github.com/PerryLink/dsh-github)** | GitHub PR/issues integration for DSH, every write gated by approval |  |
| **[dsh-gongwen-flow-check](https://github.com/PerryLink/dsh-gongwen-flow-check)** | 公文流转与办理时限核对（按公开的公文处理规范核对环节完整性与时限，仅提示差异，不作出定性结论） |  |
| **[dsh-gongwen-word-check](https://github.com/PerryLink/dsh-gongwen-word-check)** | 公文格式要素核对（按公开的党政机关公文格式标准核对版头与主体要素，仅提示差异，不作出定性结论） |  |
| **[dsh-guard-plan-qc](https://github.com/PerryLink/dsh-guard-plan-qc)** | 劳动保护与安全防护用品配置表核对（按公开的配备标准核对品名规格与配置数量，仅提示差异，不作出定性结论） |  |
| **[dsh-hazchem-check](https://github.com/PerryLink/dsh-hazchem-check)** | 危险化学品临界量与重大危险源辨识核对（按储存量与临界量核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-hazplan-check](https://github.com/PerryLink/dsh-hazplan-check)** | HAZOP 分析表要素齐备性与偏差推导一致性核对（依据公开的危险与可操作性分析标准，仅提示差异，不作出定性结论） |  |
| **[dsh-hidden-risk-map](https://github.com/PerryLink/dsh-hidden-risk-map)** | 安全隐患台账→《工贸企业重大事故隐患判定标准》（应急管理部令第10号）条款映射提示（仅提示差异，不作出定性结论） |  |
| **[dsh-hs-classify](https://github.com/PerryLink/dsh-hs-classify)** | 商品归类层级一致性核对（按章、品目、子目与商品编号的层级关系核对自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-icd-rule-check](https://github.com/PerryLink/dsh-icd-rule-check)** | ICD 合并编码与星剑号配对提示（依据 GB/T 14396-2016 与公开的 ICD 使用说明，仅提示差异，不作出定性结论） |  |
| **[dsh-industry-research](https://github.com/PerryLink/dsh-industry-research)** | Industry research orchestration that seals its deliverables through this plugin's `ctx.researchReport.assemble` |  |
| **[dsh-lawcite-adapter](https://github.com/PerryLink/dsh-lawcite-adapter)** | 法条引用与文书要素核对（按名称、条号、原文与效力状态核对引用可核验性，仅提示差异，不作出定性结论） |  |
| **[dsh-laya](https://github.com/PerryLink/dsh-laya)** | Laya typed decisions (`noul`/`choice`/`score`) as a first-class Cordis service and model-visible tools |  |
| **[dsh-lc-doc-check](https://github.com/PerryLink/dsh-lc-doc-check)** | 信用证单据条款核对（按单据种类、份数、期限与不符点核对交单自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-learning-gap-check](https://github.com/PerryLink/dsh-learning-gap-check)** | 能力差距与培养计划核对（按能力等级差、培养措施与完成期限核对台账闭环，仅提示差异，不作出定性结论） |  |
| **[dsh-library](https://github.com/PerryLink/dsh-library)** | Local document knowledge base for DeepSeek Harness. |  |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** | Local-model (Ollama) integration for DeepSeek Harness. |  |
| **[dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions)** | LSP diagnostics, formatting, completion, code actions and rename over language servers |  |
| **[dsh-mask](https://github.com/PerryLink/dsh-mask)** | PII masking middleware: anonymize at the model boundary, restore at the display layer |  |
| **[dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel)** | Read-only MCP runtime panel: /mcp command + Settings tab with status, tools and errors |  |
| **[dsh-medrec-qc](https://github.com/PerryLink/dsh-medrec-qc)** | 病案首页形式质控与逻辑矛盾提示（依据国卫办医发〔2016〕24号等公开文件，仅提示差异，不作出定性结论） |  |
| **[dsh-memento](https://github.com/PerryLink/dsh-memento)** | Approval-gated cross-session memory: ctx.memory seam + SQLite + memory tool |  |
| **[dsh-nsfc-form-check](https://github.com/PerryLink/dsh-nsfc-form-check)** | 国家自然科学基金申请书形式审查与匿名化提示（依据《国家自然科学基金条例》与申请人导入的当年指南，仅提示差异，不作出定性结论） |  |
| **[dsh-nurse-record-check](https://github.com/PerryLink/dsh-nurse-record-check)** | 护理记录时限、签名与评估表完整性校验（依据《病历书写基本规范》等公开文件，仅提示差异，不作出定性结论） |  |
| **[dsh-observe](https://github.com/PerryLink/dsh-observe)** | OpenTelemetry and Langfuse observability exporter for DeepSeek Harness. |  |
| **[dsh-origin-rvc-check](https://github.com/PerryLink/dsh-origin-rvc-check)** | 原产地区域价值成分核对（按 RVC 定义式与门槛核对原产地判定自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-ota-review-check](https://github.com/PerryLink/dsh-ota-review-check)** | 在线点评回复台账核对（按回复时限、问题分类与整改状态核对台账闭环，仅提示差异，不作出定性结论） |  |
| **[dsh-output-styles](https://github.com/PerryLink/dsh-output-styles)** | Claude Code outputStyles-equivalent runtime style switching |  |
| **[dsh-paper-doc-adapter](https://github.com/PerryLink/dsh-paper-doc-adapter)** | 试卷解析结构核对（按题型、答案、分值与 yotta 标识核对试卷结构自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules)** | Claude Code-style declarative allow/deny/ask permission rules with audit |  |
| **[dsh-permit-report-check](https://github.com/PerryLink/dsh-permit-report-check)** | 行政许可办理核对（按申请材料、法定时限与决定记录核对台账闭环，仅提示差异，不作出定性结论） |  |
| **[dsh-pipeline-check](https://github.com/PerryLink/dsh-pipeline-check)** | 项目全流程文件链条核对（按环节先后与金额口径核对链条自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-pleading-draft](https://github.com/PerryLink/dsh-pleading-draft)** | 起诉状要素齐备性核对（按诉请、事实、证据、法条四要素核对文书齐备，仅提示差异，不作出定性结论） |  |
| **[dsh-plugin-doctor](https://github.com/PerryLink/dsh-plugin-doctor)** | Zero-dependency static + sandbox smoke detector for DSH plugins |  |
| **[dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide)** | Plugin-development knowledge base as an on-demand agent skill |  |
| **[dsh-plugin-kit](https://github.com/PerryLink/dsh-plugin-kit)** | Shared zero-runtime-dependency toolkit for the PerryLink DSH plugins |  |
| **[dsh-plugin-upgrade](https://github.com/PerryLink/dsh-plugin-upgrade)** | One-package, one-corridor-index plugin upgrade skill: routes a repository to the matching closed corridor card |  |
| **[dsh-policy-brief-draft](https://github.com/PerryLink/dsh-policy-brief-draft)** | 政策专报要素核对（按观点、依据、出处与建议核对专报齐备，仅提示差异，不作出定性结论） |  |
| **[dsh-power-loss-split](https://github.com/PerryLink/dsh-power-loss-split)** | 线损电量拆分与考核表核对（依据公开的线损计算口径，仅提示差异，不作出定性结论） |  |
| **[dsh-power-ticket-check](https://github.com/PerryLink/dsh-power-ticket-check)** | 电力工作票要素齐备性与签发许可顺序核对（依据现行电力安全工作规程，仅提示差异，不作出定性结论） |  |
| **[dsh-ppap-check](https://github.com/PerryLink/dsh-ppap-check)** | PPAP 提交要素齐备性核对（按公开的 PPAP 手册与提交等级核对要素齐备与版本填写，仅提示差异，不作出定性结论） |  |
| **[dsh-protest-deadline](https://github.com/PerryLink/dsh-protest-deadline)** | 质疑与投诉期限核对（按公开的政府采购质疑投诉规定核对期限与台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-railway-window](https://github.com/PerryLink/dsh-railway-window)** | 铁路施工天窗台账核对（按时间窗、时长算术与命令号核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | Multi-channel approval/question bridge: WeChat/Telegram/Feishu, session console | 🧊 已冻结 — 见仓库 README |
| **[dsh-repair-order-qc](https://github.com/PerryLink/dsh-repair-order-qc)** | 维修工单结算核对（按项目金额、配件工时合计与结算总额核对算术自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** | Verifiable research-report engine: content-addressed evidence ledger and sealed versions |  |
| **[dsh-review-reply-check](https://github.com/PerryLink/dsh-review-reply-check)** | 审稿意见逐条回应覆盖核对（按意见与回应一一对应核对覆盖完整性，仅提示差异，不作出定性结论） |  |
| **[dsh-rulefile-check](https://github.com/PerryLink/dsh-rulefile-check)** | 规则库文件自检核对（按条款引用纪律与效力上限核对规则库自身合规，仅提示差异，不作出定性结论） |  |
| **[dsh-safety-brief-check](https://github.com/PerryLink/dsh-safety-brief-check)** | 安全技术交底记录要素齐备性与签字闭环核对（依据公开的安全生产法规与检查标准，仅提示差异，不作出定性结论） |  |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** | Multi-dimensional quality scoring for DeepSeek Harness plugins. |  |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | Pin sessions in the Web sidebar with durable ordering | 🚫 已退役 — 见仓库 README |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** | Cross-device session sync for DeepSeek Harness — a dedicated git mirror of your session store. |  |
| **[dsh-site-log-check](https://github.com/PerryLink/dsh-site-log-check)** | 监理日志跨日连续性与旁站覆盖提示（依据 GB/T 50319-2013 等公开文件，仅提示差异，不作出定性结论） |  |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** | Security-audit skill pack: secret scan, dependency and supply-chain review |  |
| **[dsh-soe-decision-check](https://github.com/PerryLink/dsh-soe-decision-check)** | 三重一大决策台账核对（按前置研究、会议审议与决议记录核对程序留痕，仅提示差异，不作出定性结论） |  |
| **[dsh-soilwater-check](https://github.com/PerryLink/dsh-soilwater-check)** | 土壤与地下水监测台账核对（按点位、监测项目、限值与超标判定核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-sop-sync-check](https://github.com/PerryLink/dsh-sop-sync-check)** | 作业规程与 FMEA／控制计划一致性核对（按编号与版本核对三份文件是否同步，仅提示差异，不作出定性结论） |  |
| **[dsh-spc-gbt-adapter](https://github.com/PerryLink/dsh-spc-gbt-adapter)** | 控制图常数与过程能力指数核对（按 GB/T 4091 的常规控制图常数表核对控制限与 Cp/Cpk 的自洽性，仅提示差异，不作出定性结论） |  |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** | Voice-first session loop for DeepSeek Harness: talk to it, hear it answer. |  |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | Cross-session team rooms: shared message bus, task board and timeline | 🚫 已退役 — 见仓库 README |
| **[dsh-tender-extract](https://github.com/PerryLink/dsh-tender-extract)** | 招标文件条款摘录核对（按出处与原文逐字核对摘录完整性，仅提示差异，不作出定性结论） |  |
| **[dsh-tender-matrix](https://github.com/PerryLink/dsh-tender-matrix)** | 评标因素评分矩阵核对（按分值上限与合计核对矩阵自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** | Isolated install-and-smoke test drives for DeepSeek Harness plugins. |  |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** | TickTick/Dida365 task bridge: session-header panel + 11 tools |  |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** | Vendor parameter translation and deterministic JSON repair for DeepSeek Harness. |  |
| **[dsh-warranty-calc](https://github.com/PerryLink/dsh-warranty-calc)** | 质保期与索赔金额核对（按质保期月数与里程、索赔金额算式核对自洽，仅提示差异，不作出定性结论） |  |

</details>

</details>

### 从 DSH Desktop 市场安装

所有 PerryLink 插件均可在 DSH Desktop 内置市场中浏览：**市场 → 来源 → 添加来源 → 粘贴** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ 选中**。安装仍需通过市场的 npm 身份校验与你的确认。

## 许可证

[Apache License 2.0](LICENSE) © 2026 dsh-doublecheck contributors
