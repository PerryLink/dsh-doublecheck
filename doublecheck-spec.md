# Doublecheck spec

## Goal
给 isVagueTask 的模糊检测新增一条规则：任务文本里含下划线关键词（如 foo_bar、retry_limit）即视为具体（返回 false，不触发需求 grill）。

## Scope
只改 src/domain/vagueness.ts（新增下划线关键词提示正则并接入 isVagueTask，更新模块注释）和 tests/vagueness.spec.ts（新增测试用例）；绿后同步 lib/ 构建产物与 README 规则描述。不触碰其它提示规则、vagueTaskMaxChars 旋钮、guard 门逻辑或 grill 流程。

## Acceptance criteria
按用户指示的红-绿纪律：先在 tests/vagueness.spec.ts 写新用例并确认其失败（红）；实现后新用例通过且 pnpm test 全量跑绿。新用例：'fix the retry_limit bug'、'把 foo_bar 改掉'、'rename user_name to display_name' 均返回 false；'fix the _ thing'、'improve the thing_' 返回 true。

## Failure modes
孤立下划线（_ 两侧无词字符，如 'fix the _ thing'）与词尾下划线（thing_）不得让任务变具体，仍返回 true；空串/纯空白仍返回 false；长度阈值与既有扩展名/路径/引号规则行为不变。若既有测试因此改动而回归，以既有测试为仲裁并修正实现。

## Priorities
用户明确指示「别问问题，直接按纪律走：先写失败测试，再实现，最后跑绿」——跳过需求追问，该指示本身即为未决维度的验收标准。规则定义为：至少一个下划线且两侧各有至少一个词字符（\w+_\w+）。文档与构建产物同步为次要事项，若冲突以代码与测试为准。

## Non-goals
不新增配置旋钮，不改变 quote/extension/path 规则，不修改 guard 门与 grill 技能逻辑，不向用户提问。
