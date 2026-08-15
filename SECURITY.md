# Security Policy / 安全策略

## Reporting a vulnerability / 私密报告漏洞

如果你发现了安全漏洞，请通过 **GitHub 私有漏洞报告** 提交，不要公开 issue：

If you found a security vulnerability, please report it through **GitHub private vulnerability reporting** instead of a public issue:

1. 打开本仓库的 **Security** 标签页 → **Report a vulnerability**（Open the **Security** tab → **Report a vulnerability**）。
2. 用英文或中文描述漏洞：影响版本、触发条件、潜在影响、可行的复现步骤。
   Describe the vulnerability in English or Chinese: affected versions, trigger conditions, potential impact, and reproducible steps if possible.

> ⚠️ **提交前必须脱敏**：报告正文与附件中不得包含真实 token、API 密钥、密码、Cookie、Authorization 请求头、私钥或账号信息；复现材料一律使用占位符（如 `REDACTED`）。
> **Scrub before submitting**: never include real tokens, API keys, passwords, cookies, Authorization headers, private keys, or account details in the report or attachments — use placeholders (e.g. `REDACTED`) in reproduction material.

## Response expectations / 响应预期

- **确认（Acknowledged）**：通常 **5 个工作日内** 对报告做出首次响应与初步确认（Usually within **5 business days**）。
- **修复（Fix）**：确认后的修复节奏按严重度处理：严重问题（远程可利用、凭据泄漏、绕过门禁）优先；常规问题随最近一次发布修复或在报告中说明计划。Severity-dependent: critical issues (remote exploitation, credential leakage, gate bypass) are prioritized; others are fixed in the nearest release or the report states the plan.
- 如果 7 个工作日没有收到任何响应，请在 issue 区开一个**不含漏洞细节**的提醒，仅引用报告时间。If there is no response within 7 business days, open a non-technical reminder in the issue tracker referencing only the report date.

## Scope / 范围

本策略覆盖 npm 包 `dsh-doublecheck` 及本仓库发布的全部资产（`lib/`、`skills/`、`cordis.patch.yml`、`strict.patch.yml`）。This policy covers the `dsh-doublecheck` npm package and all assets published from this repository.

## Disclosure policy / 披露策略

- **协调披露（Coordinated disclosure）**：默认在修复版本发布后披露；如有必要，先发布安全公告（GitHub Security Advisory），再发布修复。
- **致谢（Credit）**：经报告者同意，修复发布时在 CHANGELOG 与安全公告中致谢报告者（注明姓名/ID，或按报告者意愿匿名）。
- 未获报告者同意，我们不会公开报告内容或原始材料。Without the reporter's consent, the report content and original material will not be made public.
