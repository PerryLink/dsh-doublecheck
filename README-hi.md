<div align="center">

# dsh-doublecheck
- **1024 स्टोर चैनल**: एक बार `npm i -g dsh1024`, फिर `dsh1024 plugin --profile web add dsh-doublecheck` ([deepseek1024.com](https://deepseek1024.com) इंस्टॉल रैंकिंग में गिना जाता है)।

**DeepSeek Harness के लिए डिलीवरी गुणवत्ता-द्वार: आवश्यकताओं की पड़ताल करें, कार्यान्वयन का परीक्षण करें, डिलीवरी साबित करें — फिर deliverable / rework required निर्णय से हैंडऑफ़ को नियंत्रित करें।**

*पहली एडिट से पहले आवश्यकताओं की पड़ताल होती है; डिलीवरी साबित की जाती है, दावा नहीं किया जाता।*

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![DSH plugin](https://img.shields.io/badge/dsh--plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![dsh-doctor](https://raw.githubusercontent.com/PerryLink/dsh-plugin-doctor/main/badges/PerryLink__dsh-doublecheck.svg)](https://github.com/PerryLink/dsh-plugin-doctor#verified-徽章)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-doublecheck/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-doublecheck/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-doublecheck?label=version)](https://github.com/PerryLink/dsh-doublecheck/releases)
[![npm version](https://img.shields.io/npm/v/dsh-doublecheck)](https://www.npmjs.com/package/dsh-doublecheck)
[![npm downloads](https://img.shields.io/npm/dm/dsh-doublecheck)](https://www.npmjs.com/package/dsh-doublecheck)

[English](README.md) · [简体中文](README-zh.md) · [Español](README-es.md) · [Português](README-pt.md) · [हिन्दी](README-hi.md)

</div>

---

## अनुकूलता

| सतह | स्थिति |
|---|---|
| Harness | DeepSeek Harness `dsh-v0.1.5-rc.1`। 2026-09-10 को `dsh-v0.1.5-rc.1` master checkout के विरुद्ध सत्यापित (पूर्ण द्वार श्रृंखला + प्रोफ़ाइल इंस्टॉल स्मोक); प्रकाशित `0.1.2-rc.1` पिन लाइन अभी भी समर्थित है। |
| Node | `^22.19.0 \|\| >=24.0.0` |
| प्लेटफ़ॉर्म | सभी (शुद्ध host; कोई नेटिव कोड नहीं, स्वयं का कोई सीधा नेटवर्क अनुरोध नहीं) |
| मॉडल | कोई भी (guard स्वयं कभी मॉडल नहीं बुलाता; critic और reviewer चरण harness subagent के रूप में चलते हैं) |

## आपको क्या मिलता है

`dsh-doublecheck` दो plugin पंक्तियाँ स्थापित करता है जो एक ही टिकाऊ सत्र लॉग से पढ़ती और लागू करती हैं:

1. **`doublecheck-grill`** — आवश्यकताओं की भट्टी: बंडल की गई `grill-requirements` skill, साथ ही मॉडल-मुखी `doublecheck_skills`, `doublecheck_spec` और `doublecheck_report` उपकरण, तथा प्रति-आयाम सत्यापन वर्कफ़्लो।
2. **`doublecheck-guard`** — अनुशासन guard: grill द्वार, लाल/हरा साक्ष्य द्वार, प्रतिकूल समीक्षा, `/doublecheck` और `/gate` कमांड, `doublecheck-gate` सेटिंग्स नेमस्पेस, तथा चार-चरण डिलीवरी द्वार।

दोनों मिलकर **अनुशासन लूप** लागू करते हैं — *grill → design → red → green → review → verify*:

```text
grill ──▶ design ──▶ red ──▶ green ──▶ review ──▶ verify
   │
   └─ छह आवश्यकता आयाम, सहमति द्वार,
      संरचित spec सत्र + कार्यक्षेत्र में प्रतिबद्ध
```

| चरण | अर्थ |
|---|---|
| **grill** | छह आवश्यकता आयामों की पड़ताल करें; सहमति तक कार्यान्वयन से इनकार करें। |
| **design** | तय किया गया spec `doublecheck_spec` के माध्यम से प्रतिबद्ध किया जाता है। |
| **red** | कार्यान्वयन एडिट से पहले एक असफल परीक्षण रन अंतर साबित करता है। |
| **green** | एडिट के बाद एक सफल परीक्षण रन लूप बंद करता है। |
| **review** | एक फ़ोर्क किया गया प्रतिकूल आलोचक spec के विरुद्ध डिलीवरी का ऑडिट करता है। |
| **verify** | `doublecheck_report` + प्रति-आयाम सत्यापन वर्कफ़्लो डिलीवरी साबित करते हैं। |

## त्वरित शुरुआत

```sh
# 1. install the bundle into your profile
dsh plugin --profile web add "github:PerryLink/dsh-doublecheck#main"

# or from npm (published releases)
dsh plugin --profile web add dsh-doublecheck

# 2. restart and verify the row
dsh --profile web --dump-config | grep -E -A3 'id: doublecheck-(grill|guard)'
```

दोनों पंक्तियाँ (`doublecheck-grill` और `doublecheck-guard`) प्रोफ़ाइल के साथ स्वतः सक्रिय हो जाती हैं।

## इंस्टॉल और अनइंस्टॉल

- **git चैनल** (नवीनतम `main`): `dsh plugin --profile web add "github:PerryLink/dsh-doublecheck#main"` — `prepare` स्क्रिप्ट केवल उत्पादन निर्भरताओं के साथ बिल्ड करती है।
- **npm चैनल** (प्रकाशित रिलीज़): `dsh plugin --profile web add dsh-doublecheck`।
- **tarball चैनल**: इस repo में `pnpm pack`, फिर `dsh plugin --profile web add ./dsh-doublecheck-<version>.tgz`।
- **अनइंस्टॉल**: `dsh plugin --profile web remove dsh-doublecheck` (या प्रोफ़ाइल पैच से पंक्तियाँ हटाएँ)।

बिना कॉन्फ़िगरेशन वाले सख्त मोड के लिए (हर द्वार `block` तीव्रता पर चालू, द्वार कवरेज आवश्यक), bundle पैच के ऊपर शामिल ओवरले लागू करें: `dsh --profile web --patch ./node_modules/dsh-doublecheck/strict.patch.yml`।

## कॉन्फ़िगरेशन

सभी ट्यून करने योग्य चीज़ें Schemastery `Config` फ़ील्ड हैं (cordis.yml से बदलने योग्य)। id-लक्षित ओवरराइड पूरी पंक्ति बदल देता है — आपको जो भी कुंजी चाहिए उसे दोबारा घोषित करें। `cordis.patch.yml` हर कुंजी को इनलाइन दस्तावेज़ित करता है; Schema डिफ़ॉल्ट ही ट्यूनिंग डिफ़ॉल्ट का एकमात्र स्रोत हैं।

| कुंजी | डिफ़ॉल्ट | अर्थ |
|---|---|---|
| `specFile` | `'doublecheck-spec.md'` | प्रतिबद्ध spec markdown के लिए कार्यक्षेत्र फ़ाइल (grill पंक्ति)। |
| `reportFile` | `'doublecheck-report.md'` | डिलीवरी रिपोर्ट के लिए कार्यक्षेत्र फ़ाइल (grill पंक्ति)। |
| `reportVerify` | `true` | डिफ़ॉल्ट रूप से सत्यापन वर्कफ़्लो चलाएँ (grill पंक्ति)। |
| `verifyProvider` | `'fork'` | प्रति-आयाम जाँचकर्ताओं के लिए subagent प्रदाता (grill पंक्ति)। |
| `verifyMode` | `'all'` | `all` = प्रति आयाम एक समानांतर जाँचकर्ता; `single` = एक संयुक्त जाँचकर्ता (grill पंक्ति)। |
| `intensity` | `'remind'` | grill, लाल/हरा और समीक्षा द्वारों की प्रवर्तन शक्ति (`remind` / `warn` / `block`)। |
| `enableByDefault` | `true` | बिना `/doublecheck on\|off` रिकॉर्ड वाले सत्रों के लिए मास्टर स्विच। |
| `language` | `'en'` | इंजेक्ट किए गए अनुस्मारक/अस्वीकार/समीक्षा/द्वार गद्य की भाषा (`en` / `zh`)। |
| `guardTools` | `['edit', 'write']` | दोनों द्वारों द्वारा निगरानी किए जाने वाले म्यूटेशन उपकरण नाम। |
| `vagueTaskMaxChars` | `200` | इससे लंबे कार्य कभी अस्पष्ट नहीं माने जाते। |
| `remindOnce` | `true` | प्रत्येक अनुस्मारक प्रति सत्र अधिकतम एक बार इंजेक्ट करें (रीस्टार्ट के बाद भी टिकाऊ)। |
| `testToolNames` | `['bash', 'pwsh']` | शेल उपकरण नाम जो परीक्षण चला सकते हैं। |
| `testCommandPatterns` | *(pnpm/npm/yarn/bun test, pytest, go/cargo/make test, node --test, deno test, uv run pytest)* | किसी कमांड को परीक्षण रन गिने जाने के लिए मेल खाने वाले regex। |
| `testFilePatterns` | *(परीक्षण dirs, `*.test.*` / `*.spec.*`)* | परीक्षण फ़ाइलों की पहचान करने वाले regex — हमेशा संपादन योग्य, लाल द्वार से मुक्त। |
| `modules.grill` | `true` | बंद करने पर grill द्वार अक्षम हो जाता है। |
| `modules.tdd` | `true` | चालू करने पर लाल/हरा साक्ष्य द्वार सक्षम होते हैं। |
| `modules.adversary` | `false` | चालू करने पर हरे पर फ़ोर्क किए गए आलोचक समीक्षा सक्षम होती है। |
| `adversaryModel` | `null` | आलोचक मॉडल मार्ग; `null` = मुख्य मॉडल स्वयं समीक्षा करता है। |
| `adversaryProvider` | `'fork'` | वह subagent प्रदाता जिस पर आलोचक चलता है। |
| `adversaryMaxFindings` | `5` | सत्र में इंजेक्ट किए गए निष्कर्षों की सीमा (1–20)। |
| `adversaryTools` | `['read', 'glob', 'grep']` | आलोचक उपकरण अनुमति-सूची; इसे केवल-पढ़ने योग्य रखें। |
| `adversaryTimeoutMs` | `120000` | एक आलोचक रन के लिए कठोर समय बजट। |
| `gate.enabled` | `true` | द्वार पैनल और टर्न-सीमा लाल सूचना के लिए मास्टर स्विच। |
| `gate.planSuggestion` | `true` | लाल रिपोर्टों में प्लान-मोड पुनः-जाँच सुझाव जोड़ें। |
| `gate.reportFile` | `'gate-report.md'` | द्वार रिपोर्ट के लिए कार्यक्षेत्र फ़ाइल। |
| `gate.requirements.checklist` | *(छह spec-आयाम प्रश्न)* | प्लग करने योग्य मुख्य-प्रश्न सूची: `{ id, question, specDimension, required }`। |
| `gate.requirements.minConfirmed` | `6` | न्यूनतम अनिवार्य प्रश्न जिन्हें पास करना होगा (1..अनिवार्य संख्या)। |
| `gate.requirements.interrogateTool` | `'ask_user_question'` | वह उपकरण नाम जिसकी कॉलें पूछताछ साक्ष्य गिनी जाती हैं। |
| `gate.tests.requirePassingRun` | `true` | नवीनतम परीक्षण रन का पास न होना (या अनुपस्थित) लाल बत्ती है। |
| `gate.tests.allowFailingRuns` | `0` | नवीनतम हरे के बाद लाल से पहले अनुमत असफल रन। |
| `gate.tests.requireCoverage` | `false` | चालू करने पर परीक्षण आउटपुट में कवरेज साक्ष्य आवश्यक। |
| `gate.tests.minCoveragePct` | `80` | न्यूनतम कवरेज प्रतिशत (0–100)। |
| `gate.tests.evalReports.enabled` | `false` | चालू करने पर dsh-eval रिपोर्ट (dsh-auto-review का मूल्यांकन इंजन) परीक्षण साक्ष्य में मोड़ी जाती है। |
| `gate.tests.evalReports.dir` | `'.eval-reports'` | इंजन की रिपोर्ट रखने वाली कार्यक्षेत्र-सापेक्ष निर्देशिका। |
| `gate.tests.evalReports.file` | `'report.json'` | निर्देशिका के भीतर रिपोर्ट फ़ाइल का नाम। |
| `gate.tests.evalReports.required` | `false` | true होने पर अनुपस्थित रिपोर्ट लाल बत्ती होती है (अन्यथा छोड़ दी जाती है)। |
| `gate.consistency.*` | `provider: 'fork'`, `model: null`, `tools: ['read','glob','grep']`, `timeoutMs: 120000`, `maxFindings: 5` | स्थानीय संगति समीक्षक के नॉब (`model: null` = मुख्य मॉडल)। |
| `gate.review.engine` | `'auto'` | `auto` = उपस्थित होने पर dsh-auto-review के निर्णय रिकॉर्ड, अन्यथा स्थानीय समीक्षक; `local` = हमेशा स्थानीय। |
| `gate.review.provider` | `'fork'` | स्थानीय समीक्षा समीक्षक का प्रदाता (इसके `model`/`tools`/`timeoutMs`/`maxFindings` `gate.consistency.*` से मेल खाते हैं)। |

गलत कॉन्फ़िगरेशन लोड पर ज़ोर से विफल होता है: अमान्य regex, खाली या दोहराई गई नाम सूचियाँ, सीमा से बाहर थ्रेशोल्ड और दोहराए गए सूची id चुपचाप कुछ न करने के बजाय त्रुटि फेंकते हैं। `strict.patch.yml` सभी-द्वार-अवरोध ओवरले है जो guard पंक्ति को `intensity: block`, सभी मॉड्यूल चालू और कवरेज आवश्यकता सक्षम करके दोबारा घोषित करता है।

## उपकरण और सतहें

| सतह | प्रकार | नोट्स |
|---|---|---|
| `doublecheck_skills` | उपकरण | skill रजिस्ट्री इंटरफ़ेस के माध्यम से पैकेज की चार बंडल skills को सूचीबद्ध और लोड करता है। |
| `doublecheck_spec` | उपकरण | छह-आयाम spec को सत्र लॉग और कार्यक्षेत्र markdown कॉपी में प्रतिबद्ध करता है। |
| `doublecheck_report` | उपकरण | अनुशासन साक्ष्य को डिलीवरी रिपोर्ट में मोड़ता है (वैकल्पिक प्रति-आयाम सत्यापन वर्कफ़्लो)। |
| `/doublecheck status\|report\|on\|off` | कमांड | स्विच, मॉड्यूल, तीव्रता, चरण तथ्य, मुड़ी हुई रिपोर्ट, और टिकाऊ on/off ओवरराइड। |
| `/gate status\|run\|config` | कमांड | लाइव सूची प्रगति, तय deliverable/rework रिपोर्ट, और प्रभावी कॉन्फ़िग। |
| `grill-requirements`, `red-green-tdd`, `delivery-review`, `delivery-proof` | skill | सभी छह लूप चरणों को कवर करने वाली बंडल अनुशासन skills। |
| `doublecheck-gate` | सेटिंग्स नेमस्पेस | प्लग करने योग्य सूची: उपयोगकर्ता अनुभाग composition के `gate.*` मानों को ओवरराइड करता है और लोड पर एक बार पढ़ा जाता है (`applies: restart`), `ctx.settings.describe()` से दृश्य। |
| `strict.patch.yml` | ओवरले | `block` तीव्रता पर हर द्वार चालू और कवरेज आवश्यकता, एक पैच परत में। |
| `dsh-doublecheck/invariant` | सहयोगी पंक्ति | host `invariants` रजिस्ट्री के माध्यम से पैकेज-स्वामित्व वाले लेखन-पथ विरोधाभासों की रिपोर्ट करता है। |

## द्वार चरण

डिलीवरी द्वार सत्र के टिकाऊ साक्ष्य को एक कॉन्फ़िगर करने योग्य चार-चरण सूची में एकत्र करता है और एक **deliverable / rework required** निर्णय तय करता है। हर चरण केवल सत्र लॉग को मोड़ता है (रीप्ले ही स्थिति है), इसलिए एक रन रिज़्यूम या फ़ोर्क के बाद समान रूप से पुनः व्युत्पन्न होता है।

| चरण | जाँचें | साक्ष्य स्रोत | मॉडल लागत |
|---|---|---|---|
| आवश्यकता पूछताछ | मुख्य-प्रश्न सूची एक-एक करके पुष्ट (डिफ़ॉल्ट रूप से छह spec-आयाम प्रश्न) | प्रतिबद्ध `doublecheck_spec` + `ask_user_question` कॉलें | कोई नहीं |
| परीक्षण साक्ष्य | नवीनतम रन रंग, हरे के बाद असफल रन, वैकल्पिक कवरेज थ्रेशोल्ड, वैकल्पिक dsh-eval रिपोर्ट | सत्र लॉग में शेल परीक्षण रन (`[exit code: N]`, कवरेज प्रतिशत); `gate.tests.evalReports.enabled` होने पर dsh-eval रिपोर्ट फ़ाइल | कोई नहीं |
| कार्यान्वयन संगति | diff ↔ आवश्यकता मैपिंग: हर एडिट को किसी spec आयाम की सेवा करनी चाहिए | स्थानीय फ़ोर्क समीक्षक (संरचित निष्कर्ष, केवल-पढ़ने वाले उपकरण) | एक subagent |
| समीक्षा निष्कर्ष | डिलीवरी निर्णय; `engine: auto` उपस्थित होने पर dsh-auto-review के टिकाऊ निर्णय रिकॉर्ड का उपभोग करता है, अन्यथा स्थानीय समीक्षक | `autoReview/verdict` / `autoReview/rejection` इवेंट, या स्थानीय फ़ोर्क समीक्षक | एक subagent (स्थानीय) |

लाल बत्तियाँ असफल जाँचें हैं (अनुपस्थित spec, असफल नवीनतम रन, न्यूनतम से कम कवरेज, अनमैप एडिट, blocker/major निष्कर्ष) — हर एक पुनः-कार्य सुझाव रखता है। चेतावनियाँ और छोड़े जाने कभी निर्णय नहीं बदलते। द्वार [dsh-auto-review](https://github.com/PerryLink/dsh-auto-review) को कमज़ोर निर्भरता के रूप में एकीकृत करता है: `review.engine: auto` उपस्थित होने पर उसके निर्णय रिकॉर्ड मोड़ता है और अन्यथा स्थानीय समीक्षक पर घट जाता है; `gate.tests.evalReports.enabled` उसके मूल्यांकन इंजन की dsh-eval रिपोर्ट (prompt-regression / stress / fairness सूट) परीक्षण साक्ष्य में मोड़ता है और रिपोर्ट न होने पर ईमानदारी से छोड़ देता है। द्वार कभी अनुमोदन अनुरोध संश्लेषित नहीं करता।

## उदाहरण रिपोर्ट

`/gate run` यह markdown लौटाता है — इसे PR विवरण में चिपकाएँ:

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

## CI आउटपुट

`/gate run` एक `gate-report.json` भी लिखता है (दोषरहित JSON जैसी ही स्थापित स्थिति, `gate-report.md` के पास)। `doublecheck-gate` CLI उस फ़ाइल को GitHub Actions के लिए मशीन-पठनीय आउटपुट में बदलता है:

```sh
# JSON (PR टिप्पणी / स्थिति पेलोड)
doublecheck-gate --format json --input gate-report.json
# SARIF 2.1.0 (code-scanning अपलोड / स्थिति जाँच)
doublecheck-gate --format sarif < gate-report.json
```

CLI केवल पहले से स्थापित `GateState` को क्रमबद्ध करता है — यह कभी चार-चरणीय द्वार या साक्ष्य तहों को दोबारा नहीं चलाता। इसका निकास कोड निर्णय को मैप करता है: `0` = डिलीवर करने योग्य, `1` = पुनः कार्य, `2` = उपयोग/पार्स त्रुटि।

## अनुमतियाँ और डेटा

- **पढ़ता है**: सत्र लॉग (`tool/call` / `tool/result` / `tool/ptc-dispatch`, इंजेक्ट किए गए `user/message` स्रोत, और बाहरी `autoReview/*` निर्णय रिकॉर्ड) केवल प्रक्रिया के भीतर; वैकल्पिक प्लान-मोड सेवा स्थिति। V3 नाम-परिवर्तन से पहले का host PTC उप-प्रेषण पूर्ववर्ती लेबल `tool/code-dispatch` से दर्ज करता है; दोनों लेबल समान रूप से फ़ोल्ड होते हैं।
- **लिखता है**: सत्र कार्यक्षेत्र में `doublecheck-spec.md`, `doublecheck-report.md` और `gate-report.md` (पथ कॉन्फ़िगर करने योग्य) `ctx.fs` इंटरफ़ेस के माध्यम से; टिकाऊ `doublecheck/state` और `doublecheck/gate` सत्र इवेंट।
- **मॉडल कॉलें**: द्वार के संगति और स्थानीय-समीक्षा चरण (प्रत्येक `/gate run` पर एक-एक subagent), वैकल्पिक प्रतिकूल समीक्षा, और `doublecheck_report` सत्यापन वर्कफ़्लो subagent रन शुरू करते हैं; इसके अलावा कुछ भी मॉडल या नेटवर्क नहीं बुलाता।
- **कभी नहीं छूता**: क्रेडेंशियल, पर्यावरण चर, या सत्र कार्यक्षेत्र के बाहर कोई फ़ाइल। workshop मेनिफ़ेस्ट केवल `filesystem:read` और `filesystem:write` घोषित करता है। द्वार रिपोर्टें केवल गणना, id और निर्णय रखती हैं; समीक्षक पाठों में पहचाने गए रहस्य भंडारण या प्रदर्शन से पहले संपादित (redacted) कर दिए जाते हैं।

## सुरक्षा सीमाएँ

- **मॉडल-दृश्य ⟺ लॉग किया गया।** हर इंजेक्ट किया गया अनुस्मारक, समीक्षा और द्वार सूचना मानक चैनलों से होकर सत्र लॉग में पहुँचती है; टिकाऊ spec/state/gate तथ्य उपकरण परिणामों या `SessionEventMap` सदस्यों से चलते हैं।
- **बंद-विफल / ज़ोर से विफल।** guard और द्वार कॉन्फ़िग `apply` में मान्य होता है (assertions फेंकते हैं); जो समीक्षक या प्रतिकूल इंटरफ़ेस नहीं चल सकता वह नकली निर्णय के बजाय ईमानदार "unavailable"/छोड़ने की सूचना के रूप में तय होता है।
- **ऑडिट-सुरक्षित रिपोर्टें।** द्वार और डिलीवरी रिपोर्टें केवल गणना, id और निर्णय दर्ज करती हैं — कोई फ़ाइल सामग्री या सत्र पाठ नहीं — और मॉडल-निर्मित निष्कर्ष पाठ भंडारण या प्रदर्शन से पहले एक रहस्य-संपादक से गुज़रते हैं।
- **स्वयं का कोई नेटवर्क नहीं।** प्लगइन कोई सीधा नेटवर्क अनुरोध नहीं करता; आलोचक और समीक्षक subagent harness subagent इंटरफ़ेस से चलते हैं।
- **dsh-auto-review पर कमज़ोर निर्भरता।** यह कभी import या कठोरता से आवश्यक नहीं होता; द्वार उसके टिकाऊ निर्णय रिकॉर्ड मोड़ता है और स्थानीय समीक्षक पर घट जाता है, और कभी अनुमोदन अनुरोध संश्लेषित नहीं करता।

## ज्ञात सीमाएँ

- **टिकाऊ लेखन।** `/doublecheck on\|off` → `doublecheck/state` और `/gate run` → `doublecheck/gate` को host की `ignorable` append सतह (rc.6 के बाद से `0.1.1-rc.2` तक) चाहिए। उस सतह के बिना hosts (rc.6/rc.8 और `0.1.2-alpha.1`, जिसने envelope हटा दिया — `0.1.2-rc.1` केवल संग्रहीत-लॉग पठन संगतता के लिए फ़ील्ड बहाल करता है और अभी भी स्टैम्प नहीं कर सकता) पर लेखन छोड़ दिया जाता है और स्विच प्रक्रिया-स्थानीय रहता है।
0.1.2-rc.1 (2026-09-02 को अनुकूलित): सत्र लिफ़ाफ़ा अपना ignorable फ़ील्ड केवल संग्रहीत-लॉग पठन संगतता के लिए रखता है - Session.append अभी भी इसे स्टैम्प नहीं कर सकता, इसलिए गेट व्यवहार अपरिवर्तित है।
0.1.5-alpha.1 (2026-09-09 को अनुकूलित): सत्र प्रारूप V3 टिकाऊ उप-प्रेषण इवेंट `tool/code-dispatch` का नाम `tool/ptc-dispatch` करता है (पेलोड अपरिवर्तित; दोनों लेबल समान रूप से फ़ोल्ड होते हैं)। Session.append में अभी भी `ignorable` चैनल नहीं है, इसलिए टिकाऊ लेखन छोड़े जाते हैं और स्विच प्रक्रिया-स्थानीय रहता है - व्यवहार अपरिवर्तित। `doublecheck-gate` सेटिंग्स नेमस्पेस एक कमज़ोर इंटरफ़ेस है, जो लोड पर हल होता है (ज्ञात सीमाएँ देखें)।
0.1.5-rc.1 (2026-09-10 को अनुकूलित): निर्भरता पिन प्रकाशित 0.1.5-rc.1 लाइन पर चले जाते हैं; कोई इंटरफ़ेस परिवर्तन इस प्लगइन के व्यवहार को प्रभावित नहीं करता।
- **वैकल्पिक इंटरफ़ेस।** `doublecheck-gate` सेटिंग्स नेमस्पेस केवल तब पंजीकृत होता है जब सेटिंग्स सेवा माउंट हो; तब यह `ctx.settings.describe()` में दिखता है और इसका उपयोगकर्ता अनुभाग अगले लोड पर composition के `gate.*` मानों को ओवरराइड करता है (पैकेज में कोई client कार्ड नहीं है, इसलिए Web GUI का plugin पृष्ठ इसे सूचीबद्ध नहीं करता); `/gate status` की प्लान-मोड पंक्ति वैकल्पिक `ctx.planMode` पढ़ती है (इसके बिना `unknown` दिखाती है); प्रतिकूल समीक्षा को `ctx.subagents` चाहिए; सत्यापन को `workflowEngine` चाहिए।
- **स्थानीय अवनति।** जब dsh-auto-review अनुपस्थित हो या इस सत्र में उसके कोई निर्णय रिकॉर्ड न हों, तो `gate.review.engine: auto` स्थानीय समीक्षक पर घट जाता है — रिपोर्ट निर्णय गढ़ने के बजाय कारण बताती है।
- **dsh-eval साक्ष्य फ़ाइल-आधारित है।** dsh-auto-review का मूल्यांकन इंजन (`dsh-eval`) अपने prompt-regression / stress / fairness परिणाम कार्यक्षेत्र रिपोर्ट फ़ाइल में लिखता है, सत्र लॉग में नहीं। `gate.tests.evalReports.enabled` उस फ़ाइल को मोड़ता है (डिफ़ॉल्ट रूप से बंद; अनुपस्थित होने पर छोड़ देता है) और मोड़ी गई गणनाएँ टिकाऊ `doublecheck/gate` रिकॉर्ड पर चलती हैं, ताकि तयशुदा रन फिर भी रीप्ले हो सके।

## विकास

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

## विषय

`dsh`, `dsh-plugin`, `deepseek-harness`, `engineering-discipline`, `requirements`, `guard`, `skill`, `quality-gate`, `delivery-gate`

## योगदानकर्ता

- [@PerryLink](https://github.com/PerryLink) — निर्माता और अनुरक्षक: grill → design → red → green → review → verify अनुशासन लूप, चार-चरण डिलीवरी द्वार, पाँच-भाषा दस्तावेज़, और CI/रिलीज़ पाइपलाइन।

## PerryLink DSH Plugin Family

यह प्रोजेक्ट [PerryLink](https://github.com/PerryLink) द्वारा अनुरक्षित [37 DeepSeek Harness प्लगइनों](https://github.com/PerryLink) में से एक है। अगर यह आपकी मदद करता है, तो बाकी भी करेंगे:

| Plugin | One-liner |
|---|---|
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** | अनुमोदन श्रृंखला पर द्वितीय-मॉडल स्वतः-समीक्षा, डिफ़ॉल्ट रूप से विफल-बंद | |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | वेब UI साइडबार, संदेश और अवरोधन के साथ टिकाऊ पृष्ठभूमि चाइल्ड एजेंट | |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | DeepSeek Harness के लिए लागत प्रशासन: बजट, कार्बन और विलंबता एक पैनल में। | |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** | Claude Code /rewind-समतुल्य: स्नैपशॉट, सत्र फ़ॉर्क, एक-बार पुनर्स्थापना | |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | Claude Code सत्र, मेमोरी, कौशल और CLAUDE.md को DSH में स्थानांतरित करें | |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** | DeepSeek Harness के लिए क्रॉस-प्लेटफ़ॉर्म नेटिव डेस्कटॉप नियंत्रण — Windows पहले। | |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** | वेब कंपोज़र के लिए टर्मिनल-शैली इनपुट इतिहास: तीर, Ctrl+R खोज | |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** | डेटासेट गुणवत्ता जाँच व उद्धरण सत्यापन (यहाँ उपभोग किया गया वैकल्पिक संख्या-सेतु) | |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | DeepSeek Harness के लिए प्रॉम्प्ट-इंजेक्शन, जेलब्रेक और सीक्रेट-लीक रक्षा। | |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | DeepSeek Harness के लिए एकीकृत स्थैतिक-छवि निर्माण रूटिंग। | |
| **[dsh-fast](https://github.com/PerryLink/dsh-fast)** | DeepSeek Harness के लिए रीड-ओनली प्रदर्शन डायग्नोस्टिक्स। | |
| **[dsh-fund-research](https://github.com/PerryLink/dsh-fund-research)** | चीनी सार्वजनिक म्यूचुअल फंड के लिए नियतात्मक अनुसंधान रिपोर्ट | |
| **[dsh-github](https://github.com/PerryLink/dsh-github)** | DSH के लिए GitHub PR/issues एकीकरण, हर लेखन अनुमोदन-द्वारित | |
| **[dsh-industry-research](https://github.com/PerryLink/dsh-industry-research)** | उद्योग-अनुसंधान ऑर्केस्ट्रेशन जो इस प्लगिन के `ctx.researchReport.assemble` से डिलीवरेबल सील करता है | |
| **[dsh-library](https://github.com/PerryLink/dsh-library)** | DeepSeek Harness के लिए स्थानीय दस्तावेज़ ज्ञानकोश। | |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** | DeepSeek Harness के लिए स्थानीय-मॉडल (Ollama) एकीकरण। | |
| **[dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions)** | भाषा सर्वरों पर LSP निदान, फ़ॉर्मेटिंग, पूर्णता, कोड क्रियाएँ और नाम बदलना | |
| **[dsh-mask](https://github.com/PerryLink/dsh-mask)** | PII मास्किंग मिडलवेयर: मॉडल सीमा पर अनाम करें, डिस्प्ले लेयर पर पुनर्स्थापित करें | |
| **[dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel)** | केवल-पढ़ने वाला MCP रनटाइम पैनल: /mcp कमांड + स्थिति, टूल और त्रुटियों वाला Settings टैब | |
| **[dsh-memento](https://github.com/PerryLink/dsh-memento)** | अनुमोदन-द्वारित क्रॉस-सत्र मेमोरी: ctx.memory सीम + SQLite + मेमोरी टूल | |
| **[dsh-observe](https://github.com/PerryLink/dsh-observe)** | DeepSeek Harness के लिए OpenTelemetry और Langfuse अवलोकनीयता निर्यातक। | |
| **[dsh-output-styles](https://github.com/PerryLink/dsh-output-styles)** | Claude Code outputStyles-समतुल्य रनटाइम शैली बदलाव | |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | मल्टी-चैनल अनुमोदन/प्रश्न ब्रिज: WeChat/Telegram/Feishu, सत्र कंसोल |
| **[dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules)** | ऑडिट के साथ Claude Code-शैली घोषणात्मक allow/deny/ask अनुमति नियम | |
| **[dsh-personal-directive](https://github.com/PerryLink/dsh-personal-directive)** | शीर्ष-बार टॉगल के साथ व्यक्तिगत निर्देश इंजेक्टर (फ्रेमवर्क संस्करण) |
| **[dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide)** | माँग पर एजेंट कौशल के रूप में प्लगइन-विकास ज्ञान आधार | |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** | सामग्री-पता साक्ष्य और सीलबंद संस्करणों वाला सत्यापन-योग्य अनुसंधान-रिपोर्ट इंजन | |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** | DeepSeek Harness प्लगिनों की बहु-आयामी गुणवत्ता स्कोरिंग। | |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | टिकाऊ क्रम के साथ वेब साइडबार में सत्र पिन करें | |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** | DeepSeek Harness के लिए क्रॉस-डिवाइस सत्र सिंक — आपके सत्र स्टोर का एक समर्पित git मिरर। | |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** | सुरक्षा-ऑडिट कौशल पैक: गुप्त स्कैन, निर्भरता और आपूर्ति-श्रृंखला समीक्षा | |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** | DeepSeek Harness के लिए आवाज़-प्रथम सत्र लूप: बोलें और उत्तर सुनें। | |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** | DeepSeek Harness प्लगिनों के लिए पृथक इंस्टॉल-एंड-स्मोक टेस्ट ड्राइव। | |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** | TickTick/Dida365 कार्य ब्रिज: सत्र-हेडर पैनल + 11 टूल |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** | DeepSeek Harness के लिए वेंडर पैरामीटर अनुवाद और नियतात्मक JSON मरम्मत। | |
| **[dsh-wechat](https://github.com/PerryLink/dsh-wechat)** | WeChat ↔ DSH ब्रिज (Tencent iLink bot): टेक्स्ट/इमेज/फ़ाइल/आवाज़, चैट में अनुमोदन |

### DSH Desktop मार्केट से इंस्टॉल करें

सभी PerryLink प्लगइन DSH Desktop के बिल्ट-इन मार्केट में देखे जा सकते हैं: **Market → Sources → add source → पेस्ट करें** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ चुनें**। इंस्टॉलेशन मार्केट के npm-identity सत्यापन और आपकी पुष्टि से ही होता है।

## लाइसेंस

[Apache License 2.0](LICENSE) © 2026 dsh-doublecheck contributors
