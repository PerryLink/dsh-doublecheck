# dsh-doublecheck

> **发布前先双重检查：追问需求、验证实现、证明交付。**

[![version](https://img.shields.io/badge/version-0.6.0-blue)](https://github.com/PerryLink/dsh-doublecheck/releases)
[![npm](https://img.shields.io/npm/v/dsh-doublecheck)](https://www.npmjs.com/package/dsh-doublecheck)
[![downloads](https://img.shields.io/npm/dw/dsh-doublecheck)](https://www.npmjs.com/package/dsh-doublecheck)
[![license](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)
[![topics](https://img.shields.io/badge/topics-dsh%20%7C%20dsh--plugin-22c55e)](https://github.com/topics/dsh-plugin)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-doublecheck/ci.yml?branch=main)](https://github.com/PerryLink/dsh-doublecheck/actions/workflows/ci.yml)

面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的**工程纪律 bundle**。智能体总是急着写代码，而需求最怕被想当然。`dsh-doublecheck` 装上一套纪律循环，逼模型**在动手改第一行代码前把需求拷问清楚，并且用证据证明交付而不是嘴上宣称**——全部基于 DSH 自带扩展点（技能注册表、工具策略管线、审批接缝、subagent 与 workflow 接缝、会话日志）原生重实现，不借用任何上游提示词文件。已在 DSH `0.1.0-rc.6` 上实测。

方法论受 [obra/superpowers](https://github.com/obra/superpowers) 与 [TimothyVang/Grill-me](https://github.com/TimothyVang/Grill-me) 启发。本包内所有提示词、术语、示例与文件均为原创——未复制两项目的任何内容。

## 为什么需要它

- 模糊的任务产出错误的软件。一句简短需求（“帮我做一个功能”）背后藏着六个未定决策；模型目前只能全部靠猜，并让你为这些猜测买单。
- 有纪律的团队是这么带人的：需求评审 → 失败测试 → 通过测试 → 自审 → 交付证明。智能体理应享有同一套循环，而且由 harness 强制执行，而不是靠自觉。

## 纪律循环

```
grill ──▶ design ──▶ red ──▶ green ──▶ review ──▶ verify
  │         │
  │      (v0.1)        (v0.2+)        (v0.3)         (v0.4)
  │
  └─ 需求熔炉：六个维度、共识门、结构化 spec 落盘到会话与工作区
```

| 阶段 | 含义 | 状态 |
|---|---|---|
| **grill** | 拷问六个需求维度；未达成共识前拒绝实现。 | ✅ v0.1 |
| **design** | 通过 `doublecheck_spec` 提交 spec。 | ✅ v0.1 |
| **red** | 日志中存在失败测试运行；实现改动必须有它在案。 | ✅ v0.2 |
| **green** | 改动之后有通过测试，闭环。 | ✅ v0.2 |
| **review** | 派生对抗 critic 子代理，把交付与 spec 逐条对质。 | ✅ v0.3 |
| **verify** | `doublecheck_report` + 逐维度核对 workflow，证明交付。 | ✅ v0.4 |

## 功能

- 🔥 **`grill-requirements` 技能** —— 按通用 Agent Skills 格式打包的技能，围绕六个维度（**目标、边界、验收标准、失败模式、优先级、非目标**）连环追问，使用 DSH 原生 `ask_user_question` 界面；共识达成前拒绝写代码，并记录契约。
- 🧰 **覆盖全循环的阶段技能** —— `red-green-tdd`（先写失败测试、跑红、实现、跑绿）、`delivery-review`（green 之后对照 spec 做对抗式自审）、`delivery-proof`（把证据汇总成交付报告后再宣称完成）与 `grill-requirements` 一起发货，六个阶段都有模型指引，而不再只有第一阶段。
- 📜 **`doublecheck_spec` 工具** —— 把拷问出的 spec 写入会话日志，并在工作区落一份 markdown，让契约不随对话消失。提交时拒绝空或纯空白的维度（v0.6）：grill 必须把六个维度全部敲定，spec 才算数。
- 🔄 **任务变更重新 grill** —— 已提交的 spec 只覆盖它自己的任务：spec 提交之后用户新发的直接请求会让 grill 门对该后续请求重新开启，而不是悄悄沿用旧契约。
- 🛡️ **纪律 guard** —— 挂在工具策略管线上的软门。模糊任务 + 没有 spec + 直奔 `edit`/`write` → 按 `intensity` 分别**提醒**、**请求人工批准**或**拦截**。
- 🟥🟩 **红/绿证据门**（`modules.tdd`）—— 会话日志硬校验：实现改动要求日志里**存在失败测试运行**（自上次通过以来；写测试文件永远放行——那正是 red 步骤）；回合结束时若有改动却没有通过测试运行，则注入 green 提醒。自定义 guard 工具开箱即用：门会读取 `file_path` 与 `path` 两种参数键，完全未命名任何文件的调用不视为实现改动。
- 👁️ **对抗评审**（`modules.adversary`）—— 交付到达 green 后，经 DSH 原生 subagent 接缝（默认 `fork` provider）派生一个 critic 子代理，以对抗视角核对会话与已提交 spec，产出结构化 findings，并按 blocker 优先排序返回。`remind` 只注入评审意见；`warn`/`block` 额外 steer 一轮让模型正面回应 findings。`adversaryModel` 可把评审路由到独立模型；critic 工具白名单默认只读。findings 随 `doublecheck-review` 消息源持久结构化落盘。评审会持久化重武装：最新评审记录之后的实现编辑会触发下一轮评审；取消回合会中止在途 critic。
- 📊 **Doublecheck 报告 + 核对 workflow**（`doublecheck_report`，v0.4）—— 把会话纪律证据（spec、红/绿时间线、评审 findings、编辑数）汇总成交付报告并推导 verdict（`grill → draft → red → green → objections/verified → proven/challenged/unverified`），落盘工作区。开启 `verify` 时，经 DSH workflow 接缝派发逐维度核对员（`verifyMode: all` 每维度并行一个；`single` 合并为一个核对员）并并入报告——`proven` 要求每个维度都有裁决。
- 🚦 **交付门** —— 回合结束时，已到 green 但没有 `doublecheck_report` 记录的交付会收到「报告待补」提醒；成功报告会把阶段折叠推进到 `verify`。
- 🔁 **持久化状态** —— 所有模型可见内容（spec、提醒、拒绝反馈、评审 findings、`/doublecheck on|off` 开关）都落会话日志；门禁判定完全由日志（`tool/call` + `tool/result`，含 Code Mode 子派发）推导，恢复/派生会话同样生效。`remindOnce` 同样持久化：已收到提醒的会话重启后不会重复收到。开关折叠基于增量快照，长会话每次工具调用只摊 O(新增事件) 成本。
- 🌐 **全本地化的模型界面** —— 本包注入或回答的每一个模型可见字符串（提醒、拒绝/询问反馈、评审 steering、切换通知、`/doublecheck` 回复、critic 的任务提示词）都遵循 `language: 'en' | 'zh'`；工作区 spec/report 文档保持其稳定的英文标题。
- ⌨️ **`/doublecheck` 会话命令** —— `status` 报告生效开关、已配置模块、执行强度与折叠阶段事实（spec、测试颜色、评审、编辑数）；`report` 当场折叠交付报告；`on|off` 写入持久 `doublecheck/state` 事件并注入切换通知。
- 📚 **`doublecheck_skills` 工具** —— 通过官方技能注册表接缝列出与加载本包技能。
- 🔒 **严格 overlay** —— `strict.patch.yml` 在一个 patch 层中把每道门都以 `block` 强度打开（随包发布）。
- 🧩 **独立 invariant 伴生行** —— `dsh-doublecheck/invariant` 子路径导出真实可用：无需加载 guard，即可通过宿主 `invariants` 注册表上报本包写入路径的矛盾（spec/report/review 结构）。

## 演示

`intensity: block`、全部门开启的一次真实 headless 运行，转录取自持久会话日志：

```sh
dsh --profile demo headless "把这个项目里最慢的代码直接改快，别问我任何问题，直接改文件。"
```

1. **grill** 拦住第一次编辑——没有 spec 在案：
   `Error: Blocked by the dsh-doublecheck requirements guard: the task statement is vague and no doublecheck_spec exists for this session.`
2. 模型用 `doublecheck_spec` 记录 spec，先写失败测试（测试文件永远可编辑）并运行——日志记录 `[exit code: 1]`，red 步骤完成。
3. 实现编辑随之放行；随后一次运行记录 `4 passed`，green 步骤完成。
4. 派生 critic 审计交付，带严重级标记的 findings 被注入；`warn`/`block` 下还会 steer 一轮让模型正面回应。
5. `doublecheck_report` 把一切折叠进 markdown 报告并推导 verdict——全部核对通过为 `proven`，有核对员反对则为 `challenged`。

## 安装

```sh
dsh plugin --profile <name> add dsh-doublecheck
dsh --profile <name> --dump-config   # 应看到 "# == dsh-doublecheck" 层
```

两个插件行随 profile 自动激活。也支持 tarball 安装：

```sh
pnpm pack
dsh plugin --profile <name> add ./dsh-doublecheck-0.6.0.tgz
```

git 安装不需要 npm：

```sh
dsh plugin --profile <name> add "github:PerryLink/dsh-doublecheck#v0.6.0"
```

想要零配置的严格模式（所有门开启、`block` 强度），在 bundle patch 之上叠加随包发布的 overlay：

```sh
dsh --profile <name> --patch ./node_modules/dsh-doublecheck/strict.patch.yml
```

## 卸载

```sh
dsh plugin --profile <name> remove dsh-doublecheck
```

想保留安装但关闭某一行：在 profile 的 `cordis.patch.yml` 里按 id 覆写该行并设 `disabled: true`（`doublecheck-grill` / `doublecheck-guard`）。

## 兼容性

- 已针对 `0.1.0-rc.6` peers（`@deepseek-ai/cordis ^4.0.1`）验证；最后验证日期 2026-08-14（Windows + Node 22）。
- 持久会话开关（`/doublecheck on|off` → `doublecheck/state`）需要宿主的 `ignorable` 写入面（rc.6 之后的 harness）：rc.6 宿主会忽略选项包、事件保持 required-on-read，升级宿主之前请优先使用进程内切换。

## 权限与数据

- **读取**：仅进程内读取会话日志（`tool/call` / `tool/result` / `tool/code-dispatch` 与注入的 `user/message` source）。
- **写入**：会话工作区内的 `doublecheck-spec.md` 与 `doublecheck-report.md`（路径可配），经 `ctx.fs` seam。
- **模型调用**：只有可选的对抗式审查（`modules.adversary`，默认关）与 `doublecheck_report` 的校验工作流（默认开）会启动子代理；除此之外不调用模型、不联网。
- **绝不触碰**：凭据、环境变量、以及会话工作区之外的任何文件。

## 故障排查

| 症状 | 原因与处理 |
|---|---|
| `--dump-config` 里没有 `# == dsh-doublecheck` 层 | bundle patch 缺失或某行被 `disabled`——检查 profile 的 patch 顺序与行 id。 |
| 门卫从不触发 | 执行 `/doublecheck status`：会话开关可能关闭，或 guard 行的 `modules.*` 全为 false。 |
| "Adversary review did not run: the subagents seam is not mounted" | 该 profile 组合没有子代理提供方——挂载一个（spine 组合自带），或关闭 `modules.adversary`。 |
| `doublecheck_report` 显示 `verification: null` | `workflowEngine` seam 缺失或运行被拒绝/中止——报告如实说明而非猜测。 |
| 报告给出 `unverified` | 校验跑了但并非每个 spec 维度都有裁决——用 `verify: true` 重跑；`proven` 要求六个维度齐备。 |

## 配置

在 profile 的 `cordis.patch.yml` 中**按 id** 覆盖任意行。patch 会整行替换 config——所有键都要重写：

```yaml
- id: doublecheck-grill
  config:
    specFile: 'specs/doublecheck-spec.md'   # 默认: 'doublecheck-spec.md'
    reportFile: 'specs/doublecheck-report.md'   # 默认: 'doublecheck-report.md'
    reportVerify: true            # 默认运行 verify workflow
    verifyProvider: 'fork'        # 逐维度核对员的 provider
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
      tdd: true         # 红/绿证据门（v0.2）
      adversary: true   # 派生 critic 评审（v0.3）
    adversaryModel: null            # 或如 'deepseek-v4-pro'，评审走独立模型
    adversaryProvider: 'fork'       # critic 使用的 subagent provider
    adversaryMaxFindings: 5         # 注入会话的 findings 上限
    adversaryTools: ['read', 'glob', 'grep']   # critic 工具白名单（只读）
    adversaryTimeoutMs: 120000      # 单次评审的硬性时间预算
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

随包发布的 `strict.patch.yml` 正是这行 guard 配置在 `intensity: block` 且所有模块开启——把它作为 patch 层叠加在 bundle patch 之后，即可获得严格模式而无需手动编辑 profile。

### `intensity`

| 取值 | 对被门禁拦截的 `edit`/`write` 的处理 |
|---|---|
| `remind`（默认） | 调用照常执行；提醒随结果上下文注入下一条模型请求。 |
| `warn` | 调用被挂起，经审批接缝请求一次性人工批准（无审批通道时拒绝）。 |
| `block` | 调用被拒绝，反馈引导模型先补齐纪律步骤。 |

### 可调参数

| 键 | 默认 | 含义 |
|---|---|---|
| `modules.grill` | `true` | 关闭则 grill 门整体停用；grill 技能/工具的开关是各自行的 `disabled`。 |
| `modules.tdd` | `true` | 开启红/绿证据门（v0.2）；v0.5 起默认开启。 |
| `modules.adversary` | `false` | 到达 green 后启用派生 critic 评审（v0.3）；使用 `ctx.subagents` 接缝——接缝缺失时以「unavailable」通知诚实降级。 |
| `enableByDefault` | `true` | 没有 `/doublecheck on|off` 记录的会话的总开关默认值。 |
| `language` | `'en'` | 注入的提醒/拒绝/评审文案语言（`en` / `zh`）。 |
| `guardTools` | `['edit', 'write']` | 两道门监视的变更类工具名。 |
| `vagueTaskMaxChars` | `200` | 超过此长度的任务一律不算模糊；简短任务提到文件名、路径、URL、下划线关键词或连字符关键词即为具体。 |
| `remindOnce` | `true` | 每道门每个会话最多注入一次提醒——持久化：从日志折叠，重启/恢复后不会重复。 |
| `testToolNames` | `['bash', 'pwsh']` | 可运行测试的 shell 工具名。 |
| `testCommandPatterns` | *（pnpm/npm/yarn/bun test、pytest、go/cargo/make test、node --test、deno test、uv run pytest）* | 命令需匹配的正则才算测试运行。 |
| `testFilePatterns` | *（测试目录、`*.test.*`/`*.spec.*`）* | 识别测试文件的正则——永远可编辑，豁免 red 门。 |
| `adversaryModel` | `null` | critic 模型路由；`null` = 主模型自评。 |
| `adversaryProvider` | `'fork'` | critic 使用的 subagent provider 名。 |
| `adversaryMaxFindings` | `5` | 注入会话的 findings 上限（1–20）。 |
| `adversaryTools` | `['read', 'glob', 'grep']` | critic 工具白名单；保持只读。 |
| `adversaryTimeoutMs` | `120000` | 单次评审的硬性时间预算。 |

配置错误响亮失败：非法正则、空/重复名称列表、findings 上限越界都会在加载时抛错，而不是悄悄什么都不做。评审跑不起来（接缝缺失、provider 失败、超时）时，以诚实的「unavailable」通知落入会话。

### 报告参数（grill 行）

| 键 | 默认 | 含义 |
|---|---|---|
| `reportFile` | `'doublecheck-report.md'` | 接收报告 markdown 的工作区文件。 |
| `reportVerify` | `true` | 工具 `verify` 参数的默认值。 |
| `verifyProvider` | `'fork'` | 逐维度核对员使用的 subagent provider。 |
| `verifyMode` | `'all'` | `all` = 每维度并行一个核对员；`single` = 合并为一个核对员（单个子代理，更省）。 |
| `reportTestToolNames` / `reportTestCommandPatterns` | *（与 guard 行同默认）* | 报告侧测试运行分类。 |
| `reportMutationTools` / `reportTestFilePatterns` | *（与 guard 行同默认）* | 报告侧实现编辑分类。 |

报告的分类参数与 guard 相互独立：门禁执行与报告折叠可分别调优，互不干扰。核对会诚实降级：`workflowEngine` 接缝缺失或被拒绝时，`verification` 为 `null` 且 markdown 中注明未运行。

## 工作原理（所用扩展点）

| 贡献 | DSH 机制 |
|---|---|
| 包内技能 | `ctx.skills.registerProvider()` —— 技能能力接缝，`source: bundled` |
| 目录/加载工具 | `ctx.tools.register()` —— `doublecheck_skills` |
| spec 落盘 + 工作区文件 | `doublecheck_spec` 工具 + 可选 `ctx.fs` 写入 |
| 需求门 | `tools/pre-execute` waterfall —— `allow` / `ask`（审批接缝）/ `deny` |
| red 门 | `tools/pre-execute` waterfall —— 实现改动前硬校验失败测试证据 |
| 提醒注入 | `tools/post-execute` waterfall —— `additionalContexts` → 记录为 `user/message` |
| green 门 | `agent/turn-stopping` serial —— 改动后无通过测试运行时注入完成提醒 |
| 对抗评审 | `ctx.subagents.start()` —— fork critic + 结构化 findings schema，green 后注入；`warn`/`block` 额外 steer 一轮 |
| 交付报告 | `doublecheck_report` 工具 —— 会话日志折叠 + 工作区 markdown |
| 核对 workflow | `ctx.workflowEngine.start()` —— 每个 spec 维度并行一个核对员，结构化 checks |
| 持久化状态 | 会话日志折叠 `tool/call` + `tool/result` + `tool/code-dispatch` + 注入的结构化消息源；模型可见 ⟺ 已记录 |
| 会话命令 | `ctx.commands.register()` —— `/doublecheck status|report|on|off`；`on|off` 写入持久 `doublecheck/state` 会话事件 |
| 包内事件 | `doublecheck/spec`、`doublecheck/reminder`、`doublecheck/review`、`doublecheck/report`（declaration merging 类型化，`@mode emit`） |

不改 agent-loop。所有注册都是可逆的 `ctx.effect` / `ctx.on` / 服务 `register()`。

## 模型会看到什么

- `grill-requirements` 技能进入会话技能目录，可通过内置 `skill` 工具（或 `doublecheck_skills`）加载。
- `ask_user_question` 仍是 DSH 原生提问方式；技能只负责编排（无 provider 的 headless 环境下自动降级为纯文本提问）。
- 提醒以 `{kind:'plugin'}` 上下文到达，转录 UI 会将其展示为注入元数据。
- 对抗评审意见在 critic 结算后以同样方式注入，带严重级标记的 findings；`warn`/`block` 下还会 steer 一轮，让模型正面回应这些 findings。
- `doublecheck_report` 把汇总报告作为工具结果返回（spec、测试时间线、评审、核对、verdict），"证明交付"一次调用即可完成。

## 会话命令

```
/doublecheck status|report|on|off
```

- `status` —— 生效开关（持久覆盖优先于配置默认）、已配置模块、执行强度与折叠阶段事实（spec 是否提交、red/green 颜色、评审是否在档、编辑数）。
- `report` —— 当场从会话日志折叠交付报告（不跑验证工作流；验证属于 `doublecheck_report` 工具）。
- `on` / `off` —— 写入持久 `doublecheck/state` 事件（跨重启/恢复/派生生效——重放即状态）并注入模型可见的切换通知。

所有命令回复都遵循 guard 行的 `language` 设置。

## 路线图

六阶段纪律环已全部完成：**grill → design → red → green → review → verify** 均随本包交付（v0.1 → v0.6）。真实转录回归夹具（`tests/fixtures/`）锁定持久事件形态。后续工作：更丰富的报告格式、Web UI 纪律状态徽章、以及从工作区 spec 文件播种跨会话状态。

## 开发

```sh
pnpm install --ignore-workspace
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```

## 致谢

方法论受 [obra/superpowers](https://github.com/obra/superpowers)（TDD 式工程纪律）与 [TimothyVang/Grill-me](https://github.com/TimothyVang/Grill-me)（实现前拷问需求）启发。本包为原创实现：未复制两项目的任何文本、提示词或文件。

## 贡献者

- [PerryLink](https://github.com/PerryLink) —— 作者与维护者：v0.1 → v0.6 纪律循环的全部代码、五语言文档、CI/发布管线，以及生态投递（[awesome-dsh-plugin#451](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/451)、[awesome-dsh-plugins#147](https://github.com/AdamPlatin123/awesome-dsh-plugins/pull/147)、[awesome-deepseek-harness#179](https://github.com/0xsline/awesome-deepseek-harness/pull/179)、[bruc3van/awesome-dsh-plugin#36](https://github.com/bruc3van/awesome-dsh-plugin/pull/36)、[dsh-hub-workshop#13](https://github.com/omdsh-dev/dsh-hub-workshop/issues/13)/[#19](https://github.com/omdsh-dev/dsh-hub-workshop/pull/19)）。

欢迎通过 issue、PR 与 Discussions 参与——入口见本文档开头。

## 许可证

[Apache-2.0](LICENSE)
