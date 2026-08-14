/**
 * User-facing injected prose for the discipline guard, localized.
 *
 * The notice SOURCE summaries (`requirements check`, `red/green check`,
 * `green gate`) stay English: they are stable session-log ids the durable
 * once-semantics fold matches, and translating them would silently break
 * `remindOnce` after a language switch. Only the model-facing text localizes.
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
}

/** The localized prose tables by language. */
export const PROSE: Readonly<Record<ProseLanguage, GuardProse>> = { en: EN, zh: ZH }
