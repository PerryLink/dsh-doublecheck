<!--
Thanks for the PR! Please complete the checklist before requesting review.
感谢提交 PR！请勾选完成下列清单再请求评审。
-->

## 变更说明 / Summary

<!-- 一句话说明改了什么、为什么 -->

## 关联 issue / Related issue

<!-- 例如 Closes #42；无则写「无 / None」 -->

## 提交前清单 / Checklist

- [ ] 本地门禁全绿：`pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build && pnpm run pack:check`（CI 同款命令）
- [ ] 变更带测试：新增/修改行为有对应测试覆盖，覆盖率门槛（≥90% statements/lines、≥80% branches、≥85% functions）未回退
- [ ] 已更新 `CHANGELOG.md`（在 `## Unreleased` 下按条目记录，或说明为何不记录）
- [ ] 多语言文档已同步：涉及 README 的改动已同步 `README.md`（英文源）+ `README.zh.md` + `README.es.md` + `README.pt.md` + `README.hi.md`
- [ ] 源码变更后已重新构建并提交 `lib/`（`pnpm run build`，CI 会校验 `git diff --exit-code lib`）
- [ ] 本 PR 及其描述不含 token、密钥、密码或任何敏感信息
