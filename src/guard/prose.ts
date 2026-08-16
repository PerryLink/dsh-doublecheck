/**
 * User-facing injected prose for the discipline guard, localized.
 *
 * The notice SOURCE summaries (`requirements check`, `red/green check`,
 * `green gate`) stay English: they are stable session-log ids the durable
 * once-semantics fold matches, and translating them would silently break
 * `remindOnce` after a language switch. Only the model-facing text localizes.
 *
 * Scope of localization: every model-visible string the package injects or
 * answers with (gate prose, the critic task, `/doublecheck` replies, the
 * switch notice) is localized. The workspace documents (`doublecheck-spec.md`
 * / `doublecheck-report.md`) keep their English section headings: they are
 * stable artifacts whose structure other tooling may match.
 * @module dsh-doublecheck/guard/prose
 */

/** Supported prose languages for guard injections. */
export type ProseLanguage = 'en' | 'zh'

/** Every user-facing string one language provides. */
export interface GuardProse {
  grillReminder: string
  grillDeny: string
  grillAsk: string
  tddReminder: string
  tddDeny: string
  tddAsk: string
  greenReminder: string
  greenReminderStrict: string
  reportExpected: string
  reviewSteer: string
  reviewSteerStrict: string
  reviewClean: string
  reviewUnavailableSeam: string
  reviewUnavailableFailed: (reason: string) => string
  reviewUnavailableStopped: (reason: string) => string
  reviewUnavailableNoFindings: string
  reviewFindingsHeader: (count: number) => string
  reviewFindingsFooter: string
  reviewHeldBack: (held: number) => string
  /** The critic's task prompt (model-facing behavior of the review run). */
  criticTask: string
  /** The gate-red notice injected at the turn boundary (role statement first). */
  gateRedNotice: (redCount: number) => string
  /** The localized `/gate status` panel header. */
  gateStatusHeader: string
  /** The localized `/gate status` usage hint. */
  gateStatusHint: string
  /** The localized `/gate config` header. */
  gateConfigHeader: string
  /** The localized `/gate` usage error. */
  gateCommandUnknown: (input: string) => string
  /** The localized `/gate` no-agent error. */
  gateCommandNoAgent: string
  switchOnDurable: string
  switchOnLocal: string
  switchOffDurable: string
  switchOffLocal: string
  commandNoAgent: string
  commandUnknown: (input: string) => string
  commandAlreadyOn: string
  commandAlreadyOff: string
  commandOnDurable: string
  commandOnLocal: string
  commandOffDurable: string
  commandOffLocal: string
  commandStatus: (facts: CommandStatusFacts) => string
}

/** The folded facts the localized `/doublecheck status` reply renders. */
export interface CommandStatusFacts {
  /** The effective session switch. */
  enabled: boolean
  /** The configured default for sessions without a state record. */
  defaultEnabled: boolean
  /** Configured module switches. */
  modules: { grill: boolean; tdd: boolean; adversary: boolean }
  /** Configured enforcement strength. */
  intensity: string
  /** Whether reminder repetition is capped per session. */
  remindOnce: boolean
  /** Whether a committed spec exists in the log. */
  hasSpec: boolean
  /** The latest test-run color (`none` / `red` / `green`). */
  color: string
  /** Whether an adversary review record exists in the log. */
  reviewed: boolean
  /** Total implementation edits folded so far. */
  editCount: number
  /** The latest durable gate run, or null before any. */
  gate: { verdict: string; redCount: number } | null
}

const EN: GuardProse = {
  grillReminder:
    'Double-check before you ship: this task is brief and no doublecheck spec '
    + 'has been recorded for it yet. Pause the edit and settle the six '
    + 'requirement dimensions first — goal, scope, acceptance criteria, failure '
    + 'modes, priorities, non-goals. Follow the grill-requirements skill: ask '
    + 'the user with the ask_user_question tool until consensus, record the '
    + 'result with doublecheck_spec, and only then resume editing.',
  grillDeny:
    'Blocked by the dsh-doublecheck requirements guard: the task statement is '
    + 'vague and no doublecheck_spec exists for this session. Run the '
    + 'requirements grill first (grill-requirements skill → ask_user_question → '
    + 'doublecheck_spec), then retry this call.',
  grillAsk:
    'The task statement is vague and no doublecheck spec exists for this '
    + 'session. Allow this edit before the requirements grill has run?',
  tddReminder:
    'Red/green discipline: no failing test is on record since the last passing '
    + 'test run. Before editing implementation code, write a test that fails '
    + 'for the missing behavior and run it to see it fail — then make the '
    + 'change. Test files themselves are always editable.',
  tddDeny:
    'Blocked by the dsh-doublecheck red/green evidence gate: no failing test '
    + 'is on record since the last passing test run. Write the failing test '
    + 'first (test files are allowed), run it to see it fail, then edit the '
    + 'implementation.',
  tddAsk:
    'No failing test is on record since the last passing test run. Allow this '
    + 'implementation edit before the red step?',
  greenReminder:
    'Green gate: the implementation changed, but no passing test run is on '
    + 'record after those changes. Run the test suite and confirm it passes '
    + 'before declaring the work done.',
  greenReminderStrict:
    'Green gate: the implementation changed, but no passing test run is on '
    + 'record after those changes. Do not claim completion — run the test '
    + 'suite and make it pass first.',
  reportExpected:
    'Delivery gate: the loop reached green, but no doublecheck_report is on '
    + 'record for this delivery yet. Before claiming completion, call '
    + 'doublecheck_report to consolidate the spec, the test evidence, and the '
    + 'review into the delivery record (pass verify: true for the '
    + 'per-dimension checks).',
  reviewSteer:
    'The adversary review above found objections against this delivery. '
    + 'Address them before finishing: fix what is real, and state plainly what '
    + 'is false.',
  reviewSteerStrict:
    'The adversary review above found objections against this delivery. Do not '
    + 'claim completion while they stand: fix every blocker and major finding, '
    + 'or prove it false, before you finish.',
  reviewClean:
    'Adversary review: the critic found no objections the session evidence can '
    + 'support. The delivery satisfies its spec as far as the review can tell.',
  reviewUnavailableSeam:
    'Adversary review did not run: the subagents seam is not mounted.',
  reviewUnavailableFailed: reason => `Adversary review did not run: ${reason}`,
  reviewUnavailableStopped: reason =>
    `Adversary review did not complete (${reason}); treat the delivery as unreviewed.`,
  reviewUnavailableNoFindings:
    'Adversary review returned no structured findings.',
  reviewFindingsHeader: count =>
    `Adversary review found ${count} objection(s) the delivery must answer:`,
  reviewFindingsFooter:
    'Answer each: fix what is real, and state plainly what is false.',
  reviewHeldBack: held =>
    `… ${held} further objection(s) held back by adversaryMaxFindings`,
  criticTask:
    'You are the delivery reviewer for this software-engineering session. The '
    + 'conversation you inherited contains a requirements spec recorded with the '
    + 'doublecheck_spec tool (six dimensions: goal, scope, acceptance criteria, '
    + 'failure modes, priorities, non-goals), followed by the implementation '
    + 'work and its test evidence. Assume the delivery FAILS its own spec. Hunt '
    + 'for the strongest objections you can actually support from this session: '
    + 'dimensions the work did not meet, acceptance criteria with no evidence, '
    + 'scope or non-goal violations, failure modes left unhandled. Answer '
    + 'through the required structured output, one entry per objection, citing '
    + 'what in the session supports it. If — and only if — the evidence '
    + 'genuinely satisfies every dimension, return an empty findings list. Do '
    + 'not invent objections; the empty answer is correct when nothing is wrong.',
  gateRedNotice: redCount =>
    `You are the delivery gate panel for this session. The latest gate run is RED with ${redCount} red item(s). Re-open the work in plan mode to re-check, or run /gate run for the full checklist.`,
  gateStatusHeader: 'Delivery gate panel — checklist progress for this session:',
  gateStatusHint: 'Deterministic phases fold live; the reviewer phases show the latest /gate run. Run /gate run to settle everything; /gate config shows the checklist.',
  gateConfigHeader: 'Delivery gate configuration for this session:',
  gateCommandUnknown: input =>
    `Unknown /gate argument "${input}". Usage: /gate status|run|config`,
  gateCommandNoAgent: '/gate needs an agent session to inspect.',
  switchOnDurable:
    'Double-check discipline was switched ON for this session (changed by the user): the requirements grill, the red/green gates, and the delivery review are active again.',
  switchOnLocal:
    'Double-check discipline was switched ON for this process only (changed by the user; this harness build predates the ignorable append surface, so the switch is not durable): the requirements grill, the red/green gates, and the delivery review are active again.',
  switchOffDurable:
    'Double-check discipline was switched OFF for this session (changed by the user): the discipline gates defer to the human approval chain until switched back on.',
  switchOffLocal:
    'Double-check discipline was switched OFF for this process only (changed by the user; this harness build predates the ignorable append surface, so the switch is not durable): the discipline gates defer to the human approval chain until switched back on.',
  commandNoAgent: '/doublecheck needs an agent session to inspect.',
  commandUnknown: input =>
    `Unknown /doublecheck argument "${input}". Usage: /doublecheck status|report|on|off`,
  commandAlreadyOn: 'Double-check discipline is already ON for this session.',
  commandAlreadyOff: 'Double-check discipline is already OFF for this session.',
  commandOnDurable: 'Double-check discipline ON for this session.',
  commandOnLocal: 'Double-check discipline ON for this process only (not durable on this harness).',
  commandOffDurable: 'Double-check discipline OFF for this session.',
  commandOffLocal: 'Double-check discipline OFF for this process only (not durable on this harness).',
  commandStatus: facts => [
    `Double-check discipline is ${facts.enabled ? 'ON' : 'OFF'} for this session. (/doublecheck on|off)`,
    `Modules: grill=${facts.modules.grill ? 'on' : 'off'}, tdd=${facts.modules.tdd ? 'on' : 'off'}, adversary=${facts.modules.adversary ? 'on' : 'off'} (cordis.yml).`,
    `Intensity: ${facts.intensity}. Default switch: ${facts.defaultEnabled ? 'on' : 'off'}. remindOnce: ${facts.remindOnce ? 'on' : 'off'}.`,
    `Stage: spec=${facts.hasSpec ? 'committed' : 'missing'}, tests=${facts.color}, review=${facts.reviewed ? 'on record' : 'not run'}, edits=${facts.editCount}.`,
    `Gate: ${facts.gate === null ? 'not run' : `${facts.gate.verdict} (${facts.gate.redCount} red item(s))`} (/gate status|run|config).`,
    `Usage: /doublecheck status|report|on|off`,
  ].join('\n'),
}

const ZH: GuardProse = {
  grillReminder:
    '交付前三查：这个任务描述很简短，本会话还没有记录 doublecheck spec。先停下编辑，把六个需求维度确认清楚——目标、范围、验收标准、失败模式、优先级、非目标。按 grill-requirements 技能执行：用 ask_user_question 向用户提问直到达成共识，用 doublecheck_spec 记录结果，然后再继续编辑。',
  grillDeny:
    '被 dsh-doublecheck 需求守卫拦截：任务描述模糊，且本会话尚无 doublecheck_spec。请先完成需求盘问（grill-requirements 技能 → ask_user_question → doublecheck_spec），再重试本次调用。',
  grillAsk:
    '任务描述模糊，且本会话尚无 doublecheck spec。是否允许在需求盘问完成之前进行这次编辑？',
  tddReminder:
    '红绿纪律：自上次通过测试以来，还没有失败测试的记录。在修改实现代码之前，先为缺失的行为写一个会失败的测试并运行它、看到它失败——然后再动手改。测试文件本身始终可以编辑。',
  tddDeny:
    '被 dsh-doublecheck 红绿证据门拦截：自上次通过测试以来没有失败测试的记录。请先写失败的测试（测试文件允许编辑），运行并看到它失败，然后再改实现。',
  tddAsk:
    '自上次通过测试以来没有失败测试的记录。是否允许在完成红步之前进行这次实现编辑？',
  greenReminder:
    '绿门：实现已改动，但之后没有通过测试的记录。在宣布完成之前，运行测试套件并确认通过。',
  greenReminderStrict:
    '绿门：实现已改动，但之后没有通过测试的记录。不要声称完成——先把测试套件跑起来并让它通过。',
  reportExpected:
    '交付门：纪律循环已到达 green，但本交付还没有 doublecheck_report 记录。在声称完成之前，调用 doublecheck_report 把 spec、测试证据和审查结果汇总进交付记录（需要逐维度检查时传 verify: true）。',
  reviewSteer:
    '上面的对抗式审查对本交付提出了反对意见。完成前先处理它们：属实的修掉，不属实的明确说明。',
  reviewSteerStrict:
    '上面的对抗式审查对本交付提出了反对意见。在它们被解决之前不要声称完成：修复每一个 blocker 和 major 发现，或证明其不成立，然后再收尾。',
  reviewClean:
    '对抗式审查：审查者没有找到会话证据能支持的反对意见。就本次审查所能判断的范围，交付满足其 spec。',
  reviewUnavailableSeam:
    '对抗式审查未运行：subagents seam 未挂载。',
  reviewUnavailableFailed: reason => `对抗式审查未运行：${reason}`,
  reviewUnavailableStopped: reason =>
    `对抗式审查未完成（${reason}）；请把本次交付视为未经审查。`,
  reviewUnavailableNoFindings:
    '对抗式审查没有返回结构化发现。',
  reviewFindingsHeader: count =>
    `对抗式审查发现 ${count} 条反对意见，交付必须回应：`,
  reviewFindingsFooter:
    '逐条回应：属实的修掉，不属实的明确说明。',
  reviewHeldBack: held =>
    `… 另有 ${held} 条反对意见因 adversaryMaxFindings 上限被保留`,
  criticTask:
    '你是本次软件工程会话的交付审查者。你继承的会话里包含一份通过 '
    + 'doublecheck_spec 工具记录的需求 spec（六个维度：目标、范围、验收标准、'
    + '失败模式、优先级、非目标），其后是实现工作和测试证据。假设交付不满足自己的 '
    + 'spec。寻找你能从本会话证据中真正支撑的最强反对意见：未达到的维度、没有证据的'
    + '验收标准、范围或非目标被违反、未处理的失败模式。通过要求的结构化输出作答，'
    + '每条反对意见占一项，并引用会话中支撑它的内容。当且仅当证据确实满足每一个维度时，'
    + '才返回空的 findings 列表。不要编造反对意见；没有问题时空答案才是正确的。',
  gateRedNotice: redCount =>
    `你是本会话的交付门禁面板。最近一次门禁结论为红灯，共 ${redCount} 项红灯。建议转 plan mode 复查，或运行 /gate run 查看完整检查单。`,
  gateStatusHeader: '交付门禁面板 — 本会话的检查单进度：',
  gateStatusHint: '确定性阶段实时折叠；评审类阶段显示最近一次 /gate run 的结果。运行 /gate run 结算全部检查；/gate config 查看检查单配置。',
  gateConfigHeader: '本会话的交付门禁配置：',
  gateCommandUnknown: input =>
    `未知的 /gate 参数 "${input}"。用法：/gate status|run|config`,
  gateCommandNoAgent: '/gate 需要代理会话才能查看。',
  switchOnDurable:
    'Double-check 纪律已对本会话开启（由用户切换）：需求盘问、红绿门和交付审查恢复生效。',
  switchOnLocal:
    'Double-check 纪律已对本进程开启（由用户切换；此 harness 版本早于 ignorable 追加接口，切换不持久）：需求盘问、红绿门和交付审查恢复生效。',
  switchOffDurable:
    'Double-check 纪律已对本会话关闭（由用户切换）：在重新开启之前，纪律门让位于人工审批链。',
  switchOffLocal:
    'Double-check 纪律已对本进程关闭（由用户切换；此 harness 版本早于 ignorable 追加接口，切换不持久）：在重新开启之前，纪律门让位于人工审批链。',
  commandNoAgent: '/doublecheck 需要代理会话才能查看。',
  commandUnknown: input =>
    `未知的 /doublecheck 参数 "${input}"。用法：/doublecheck status|report|on|off`,
  commandAlreadyOn: '本会话的 Double-check 纪律已经是开启状态。',
  commandAlreadyOff: '本会话的 Double-check 纪律已经是关闭状态。',
  commandOnDurable: 'Double-check 纪律已对本会话开启。',
  commandOnLocal: 'Double-check 纪律已对本进程开启（此 harness 上不持久）。',
  commandOffDurable: 'Double-check 纪律已对本会话关闭。',
  commandOffLocal: 'Double-check 纪律已对本进程关闭（此 harness 上不持久）。',
  commandStatus: facts => [
    `本会话的 Double-check 纪律：${facts.enabled ? '已开启' : '已关闭'}。(/doublecheck on|off)`,
    `模块：grill=${facts.modules.grill ? '开' : '关'}, tdd=${facts.modules.tdd ? '开' : '关'}, adversary=${facts.modules.adversary ? '开' : '关'}（cordis.yml）。`,
    `强度：${facts.intensity}。默认开关：${facts.defaultEnabled ? '开' : '关'}。remindOnce：${facts.remindOnce ? '开' : '关'}。`,
    `阶段：spec=${facts.hasSpec ? '已提交' : '缺失'}, tests=${facts.color}, review=${facts.reviewed ? '有记录' : '未运行'}, edits=${facts.editCount}。`,
    `门禁：${facts.gate === null ? '未运行' : `${facts.gate.verdict}（${facts.gate.redCount} 项红灯）`}（/gate status|run|config）。`,
    '用法：/doublecheck status|report|on|off',
  ].join('\n'),
}

/** The localized prose tables by language. */
export const PROSE: Readonly<Record<ProseLanguage, GuardProse>> = { en: EN, zh: ZH }
