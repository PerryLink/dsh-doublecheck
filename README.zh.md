# dsh-doublecheck

> **发布前先双重检查：追问需求、验证实现、证明交付。**

[![license](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)
[![version](https://img.shields.io/badge/dsh-0.1.0--rc.6-8A2BE2)](https://www.npmjs.com/package/@deepseek-ai/dsh)
[![topic](https://img.shields.io/badge/topic-dsh--plugin-22c55e)](https://github.com/topics/dsh-plugin)

面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的**工程纪律 bundle**。智能体总是急着写代码，而需求最怕被想当然。`dsh-doublecheck` 装上一套纪律循环，逼模型**在动手改第一行代码前把需求拷问清楚，并且用证据证明交付而不是嘴上宣称**——全部基于 DSH 自带扩展点（技能注册表、工具策略管线、审批接缝、会话日志）原生重实现，不借用任何上游提示词文件。

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
| **red** | 失败的测试证明缺口存在。 | 🔜 v0.2 |
| **green** | 修复使其通过；日志证明先后顺序。 | 🔜 v0.2 |
| **review** | 对抗式评审员审查交付（`adversaryModel`）。 | 🔜 v0.3 |
| **verify** | workflow 编排 + 汇总 doublecheck 报告。 | 🔜 v0.4 |

## v0.1 功能

- 🔥 **`grill-requirements` 技能** —— 按通用 Agent Skills 格式打包的技能，围绕六个维度（**目标、边界、验收标准、失败模式、优先级、非目标**）连环追问，使用 DSH 原生 `ask_user_question` 界面；共识达成前拒绝写代码，并记录契约。
- 📜 **`doublecheck_spec` 工具** —— 把拷问出的 spec 写入会话日志，并在工作区落一份 markdown，让契约不随对话消失。
- 🛡️ **纪律 guard** —— 挂在工具策略管线上的软门。模糊任务 + 没有 spec + 直奔 `edit`/`write` → 按 `intensity` 分别**提醒**、**请求人工批准**或**拦截**。
- 🔁 **持久化状态** —— 所有模型可见内容（spec、提醒、拒绝反馈）都落会话日志；guard 的判定完全由日志推导，恢复/派生会话同样生效。
- 📚 **`doublecheck_skills` 工具** —— 通过官方技能注册表接缝列出与加载本包技能。

## 安装

```sh
dsh plugin --profile <name> add dsh-doublecheck
dsh --profile <name> --dump-config   # 应看到 "# == dsh-doublecheck" 层
```

两个插件行随 profile 自动激活。也支持 tarball 安装：

```sh
pnpm pack
dsh plugin --profile <name> add ./dsh-doublecheck-0.1.0.tgz
```

## 配置

在 profile 的 `cordis.patch.yml` 中**按 id** 覆盖任意行。patch 会整行替换 config——所有键都要重写：

```yaml
- id: doublecheck-grill
  config:
    specFile: 'specs/doublecheck-spec.md'   # 默认: 'doublecheck-spec.md'

- id: doublecheck-guard
  config:
    intensity: warn
    modules:
      grill: true
      tdd: false        # v0.2 预留——v0.1 中必须为 false
      adversary: false  # v0.3 预留——v0.1 中必须为 false
    adversaryModel: null
    guardTools: ['edit', 'write']
    vagueTaskMaxChars: 200
    remindOnce: true
```

### `intensity`

| 取值 | 对“模糊且无 spec 的 `edit`/`write`”的处理 |
|---|---|
| `remind`（默认） | 调用照常执行；提醒随结果上下文注入下一条模型请求。 |
| `warn` | 调用被挂起，经审批接缝请求一次性人工批准（无审批通道时拒绝）。 |
| `block` | 调用被拒绝，反馈引导模型先完成需求拷问。 |

### 可调参数

| 键 | 默认 | 含义 |
|---|---|---|
| `modules.grill` | `true` | 关闭则 guard 整体停用；grill 技能/工具的开关是各自行的 `disabled`。 |
| `guardTools` | `['edit', 'write']` | guard 监视的变更类工具名。 |
| `vagueTaskMaxChars` | `200` | 超过此长度的任务一律不算模糊；简短任务提到文件名、路径或 URL 即为具体。 |
| `remindOnce` | `true` | 每个会话最多注入一次提醒。 |
| `adversaryModel` | `null` | v0.3 评审员预留；`null` = 主模型自评。v0.1 中设为非空会在加载期报错。 |

配置错误响亮失败：开启预留模块或设置 `adversaryModel` 会在加载时抛错，而不是悄悄什么都不做。

## 工作原理（所用扩展点）

| 贡献 | DSH 机制 |
|---|---|
| 包内技能 | `ctx.skills.registerProvider()` —— 技能能力接缝，`source: bundled` |
| 目录/加载工具 | `ctx.tools.register()` —— `doublecheck_skills` |
| spec 落盘 + 工作区文件 | `doublecheck_spec` 工具 + 可选 `ctx.fs` 写入 |
| 需求门 | `tools/pre-execute` waterfall —— `allow` / `ask`（审批接缝）/ `deny` |
| 提醒注入 | `tools/post-execute` waterfall —— `additionalContexts` → 记录为 `user/message` |
| 持久化状态 | 会话日志折叠 `tool/call` + `tool/result`；模型可见 ⟺ 已记录 |
| 包内事件 | `doublecheck/spec`、`doublecheck/reminder`（declaration merging 类型化，`@mode emit`） |

不改 agent-loop。所有注册都是可逆的 `ctx.effect` / `ctx.on` / 服务 `register()`。

## 模型会看到什么

- `grill-requirements` 技能进入会话技能目录，可通过内置 `skill` 工具（或 `doublecheck_skills`）加载。
- `ask_user_question` 仍是 DSH 原生提问方式；技能只负责编排（无 provider 的 headless 环境下自动降级为纯文本提问）。
- 提醒以 `{kind:'plugin'}` 上下文到达，转录 UI 会将其展示为注入元数据。

## 路线图

- **v0.2** —— 红/绿证据门：会话日志硬校验“先有失败测试、后有修复”。
- **v0.3** —— adversary 模块：批判者子代理审查交付；`adversaryModel` 选择路由。
- **v0.4** —— workflow 编排与汇总 doublecheck 报告。

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

## 许可证

[Apache-2.0](LICENSE)
