<div align="center">

# dsh-doublecheck
- **1024 स्टोर चैनल**: एक बार `npm i -g dsh1024`, फिर `dsh1024 plugin --profile web add dsh-doublecheck` ([deepseek1024.com](https://deepseek1024.com) इंस्टॉल रैंकिंग में गिना जाता है)।

**DeepSeek Harness के लिए डिलीवरी गुणवत्ता-द्वार: आवश्यकताओं की पड़ताल करें, कार्यान्वयन का परीक्षण करें, डिलीवरी साबित करें — फिर deliverable / rework required निर्णय से हैंडऑफ़ को नियंत्रित करें।**

*पहली एडिट से पहले आवश्यकताओं की पड़ताल होती है; डिलीवरी साबित की जाती है, दावा नहीं किया जाता।*

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Gitee](https://img.shields.io/badge/Gitee-mirror-c71d23?logo=gitee)](https://gitee.com/perrylink/dsh-doublecheck)
[![DSH plugin](https://img.shields.io/badge/dsh--plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![dsh-doctor](https://raw.githubusercontent.com/PerryLink/dsh-plugin-doctor/main/badges/PerryLink__dsh-doublecheck.svg)](https://github.com/PerryLink/dsh-plugin-doctor#verified-徽章)
[![DSH Market](https://raw.githubusercontent.com/2BingLing/dsh-market/master/assets/readme/badge-listed-en.svg)](https://dsh.market/)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-doublecheck/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-doublecheck/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-doublecheck?label=version)](https://github.com/PerryLink/dsh-doublecheck/releases)
[![npm version](https://img.shields.io/npm/v/dsh-doublecheck)](https://www.npmjs.com/package/dsh-doublecheck)
[![npm downloads](https://img.shields.io/npm/dm/dsh-doublecheck)](https://www.npmjs.com/package/dsh-doublecheck)
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-doublecheck?metric=downloads&lang=hi)](https://dshfind.com/hi/plugins/PerryLink/dsh-doublecheck?ref=badge)

[English](README.md) · [简体中文](README-zh.md) · [Español](README-es.md) · [Português](README-pt.md) · [हिन्दी](README-hi.md)

</div>

---

## अनुकूलता

| सतह | स्थिति |
|---|---|
| Harness | DeepSeek Harness `dsh-v0.1.7-alpha.2`। 2026-09-22 को सत्यापित (दोहरा typecheck + पूरी टेस्ट सूट हरी); peer रेंज `0.1.2-rc.1`, `0.1.5-alpha.1`, `0.1.5-rc.2`, `0.1.6-alpha.2`, `0.1.7-alpha.1` और `0.1.7-alpha.2` को स्वीकार करती है, इसलिए कोई समर्थित लाइन नहीं छूटती। |
| Node | `^22.19.0 \|\| >=24.0.0` |
| प्लेटफ़ॉर्म | सभी (शुद्ध host; कोई नेटिव कोड नहीं, स्वयं का कोई सीधा नेटवर्क अनुरोध नहीं) |
| मॉडल | कोई भी (guard स्वयं कभी मॉडल नहीं बुलाता; critic और reviewer चरण harness subagent के रूप में चलते हैं) |

## आपको क्या मिलता है

`dsh-doublecheck` दो plugin पंक्तियाँ स्थापित करता है जो एक ही टिकाऊ सत्र लॉग से पढ़ती और लागू करती हैं:

1. **`doublecheck-grill`** — आवश्यकताओं की भट्टी: बंडल की गई `grill-requirements` skill, साथ ही मॉडल-मुखी `doublecheck_skills`, `doublecheck_spec` और `doublecheck_report` उपकरण, तथा प्रति-आयाम सत्यापन वर्कफ़्लो।
2. **`doublecheck-guard`** — अनुशासन guard: grill द्वार, लाल/हरा साक्ष्य द्वार, प्रतिकूल समीक्षा, `/doublecheck` और `/gate` कमांड, लाइव `gate` सेटिंग्स कार्ड, तथा चार-चरण डिलीवरी द्वार।

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

ऊपर की हर `gate.*` कुंजी एक ही **लाइव फ़ील्ड** का हिस्सा है: guard पूरे `gate` ब्लॉक को `.volatile()` चिह्नित करता है, इसलिए यही इस पंक्ति का संपादन-योग्य सेटिंग्स कार्ड है (फ़ॉर्म नेमस्पेस = पंक्ति की profile प्रविष्टि id)। शेष कुंजियाँ profile patch से आने वाला सामान्य composition कॉन्फ़िगरेशन हैं। यह ब्लॉक लोड पर एक बार पढ़ा जाता है, इसलिए संपादन अगले लोड पर लागू होता है — `gate.enabled` तय करता है कि टर्न-सीमा का लाल नोटिस लगेगा या नहीं। यदि host का schemastery `.volatile()` से पुराना है, तो पंक्ति फिर भी माउंट होती है: कार्ड नहीं होता और ब्लॉक profile patch से आता है।

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
| `gate` | लाइव कॉन्फ़िग फ़ील्ड | प्लग करने योग्य सूची guard पंक्ति की एकमात्र `.volatile()` फ़ील्ड है: इसे पंक्ति के सेटिंग्स कार्ड से संपादित किया जाता है (नेमस्पेस = पंक्ति की profile प्रविष्टि id) और लोड पर एक बार पढ़ा जाता है। |
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

- **पढ़ता है**: सत्र लॉग (`tool/call` / `tool/result` / `tool/ptc-dispatch`, इंजेक्ट किए गए `user/message` स्रोत, और बाहरी `autoReview/*` निर्णय रिकॉर्ड) केवल प्रक्रिया के भीतर; वैकल्पिक प्लान-मोड सेवा स्थिति। V3 नाम-परिवर्तन से पहले का host PTC उप-प्रेषण पूर्ववर्ती लेबल `tool/code-dispatch` से दर्ज करता है; दोनों लेबल समान रूप से फ़ोल्ड होते हैं। इंजेक्ट किए गए नोटिस इस पैकेज का अपना संदेश-स्रोत kind `dsh-doublecheck` लेकर चलते हैं; उस kind से पहले दर्ज लॉग `plugin:dsh-doublecheck` के रूप में (host का V3→V4 माइग्रेशन जारी catch-all रैपर पर जो पुनर्लेखन करता है) या जारी `plugin` रैपर के रूप में आते हैं, और तीनों रूप समान रूप से फ़ोल्ड होते हैं।
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
0.1.5-alpha.1 (2026-09-09 को अनुकूलित): सत्र प्रारूप V3 टिकाऊ उप-प्रेषण इवेंट `tool/code-dispatch` का नाम `tool/ptc-dispatch` करता है (पेलोड अपरिवर्तित; दोनों लेबल समान रूप से फ़ोल्ड होते हैं)। Session.append में अभी भी `ignorable` चैनल नहीं है, इसलिए टिकाऊ लेखन छोड़े जाते हैं और स्विच प्रक्रिया-स्थानीय रहता है - व्यवहार अपरिवर्तित। (उस प्रविष्टि में जोड़ा गया `doublecheck-gate` सेटिंग्स नेमस्पेस 0.1.7-alpha.1 में हटा दिया गया, जब host ने नेमस्पेस रजिस्ट्री मिटा दी।)
0.1.5-rc.1 (2026-09-10 को अनुकूलित): निर्भरता पिन प्रकाशित 0.1.5-rc.1 लाइन पर चले जाते हैं; कोई इंटरफ़ेस परिवर्तन इस प्लगइन के व्यवहार को प्रभावित नहीं करता।
0.1.5-rc.2 (2026-09-11 को अनुकूलित): निर्भरता पिन प्रकाशित 0.1.5-rc.2 लाइन पर चले जाते हैं; कोई इंटरफ़ेस परिवर्तन इस प्लगइन के व्यवहार को प्रभावित नहीं करता।
0.1.7-alpha.1 (2026-09-22 को अनुकूलित): host ने साझा catch-all `plugin` संदेश-स्रोत kind हटा दिया (नोटिस अब अपना `dsh-doublecheck` kind लेकर चलते हैं, और `remindOnce` फ़ोल्ड टिकाऊ लॉग में संभव दोनों अपग्रेड-पूर्व रूपों को अब भी पढ़ता है), और सेटिंग्स नेमस्पेस रजिस्ट्री को `SettingsForms` से बदल दिया (`doublecheck-gate` नेमस्पेस समाप्त; गेट सूची अब guard पंक्ति की एकमात्र `.volatile()` फ़ील्ड है, जो अब भी लोड पर एक बार पढ़ी जाती है)। `@deepseek-ai/cordis` और `@deepseek-ai/schemastery` के dev/test पिन `^4.0.3` / `^3.18.3` पर चले जाते हैं; peer रेंज `^4.0.2` / `^3.18.2` ही रहती है और लाइव-फ़ील्ड क्षमता लोड पर पहचानी जाती है, इसलिए पुरानी host लाइनें भी इस पंक्ति को माउंट करती हैं (बिना सेटिंग्स कार्ड के)। सेटिंग्स के भंडारण-स्थान के अलावा कोई व्यवहार परिवर्तन नहीं।
- **वैकल्पिक इंटरफ़ेस।** सेटिंग्स सेवा माउंट होने पर guard पंक्ति का अपना सेटिंग्स कार्ड दिखता है; वह कार्ड इसी पंक्ति का Config है (नेमस्पेस = इसकी profile प्रविष्टि id), और `gate` ब्लॉक लोड पर एक बार पढ़ा जाता है, इसलिए उसके मान अगले लोड पर `/gate` पैनल और लाल नोटिस पर लागू होते हैं। लाइव-फ़ील्ड क्षमता लोड पर पहचानी जाती है: यदि host का schemastery `.volatile()` से पुराना है, तो पंक्ति फिर भी माउंट होती है — कार्ड नहीं, और `gate` ब्लॉक profile patch से लिया जाता है। `/gate status` की प्लान-मोड पंक्ति वैकल्पिक `ctx.planMode` पढ़ती है (इसके बिना `unknown` दिखाती है); प्रतिकूल समीक्षा को `ctx.subagents` चाहिए; सत्यापन को `workflowEngine` चाहिए।
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

This project is one of the **45 DeepSeek Harness plugins** maintained by [PerryLink](https://github.com/PerryLink). If this one helps you, the others likely will too:

| Plugin | One-liner |
|---|---|
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** | Second-model auto-review on the approval chain, fail-closed by default | |
| **[dsh-autotier](https://github.com/PerryLink/dsh-autotier)** | Automatic strong/cheap model-tier routing with deterministic risk guards and a `/tier` command | |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | Durable background child agents with a Web UI sidebar, messaging and interrupt | |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | Cost governance for DeepSeek Harness: budgets, carbon, and latency in one panel. | |
| **[dsh-catalog](https://github.com/PerryLink/dsh-catalog)** | DSH Desktop Market standard catalog source for the PerryLink family | |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** | Read-only MCP server exposing the certification registry: grades, snapshots and five-dimension evidence | |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** | Claude Code /rewind-equivalent: snapshots, session forks, one-shot restore | |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | Migrate Claude Code sessions, memory, skills and CLAUDE.md into DSH | |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** | Cross-platform native desktop control for DeepSeek Harness — Windows first. | |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** | Terminal-style input history for the web composer: arrows, Ctrl+R search | |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** | Dataset quality checks and citation cross-checks (the optional numeric bridge consumed here) | |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | Prompt-injection, jailbreak, and secret-leak defense for DeepSeek Harness. | |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** | Engineering-discipline guard: requirements grill, test gates, adversary review | |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | Unified static-image generation routing for DeepSeek Harness. | |
| **[dsh-fast](https://github.com/PerryLink/dsh-fast)** | Read-only performance diagnostics for DeepSeek Harness. | |
| **[dsh-fund-research](https://github.com/PerryLink/dsh-fund-research)** | Deterministic research reports for Chinese public mutual funds | |
| **[dsh-github](https://github.com/PerryLink/dsh-github)** | GitHub PR/issues integration for DSH, every write gated by approval | |
| **[dsh-industry-research](https://github.com/PerryLink/dsh-industry-research)** | Industry research orchestration that seals its deliverables through this plugin's `ctx.researchReport.assemble` | |
| **[dsh-laya](https://github.com/PerryLink/dsh-laya)** | Laya typed decisions (`noul`/`choice`/`score`) as a first-class Cordis service and model-visible tools | |
| **[dsh-library](https://github.com/PerryLink/dsh-library)** | Local document knowledge base for DeepSeek Harness. | |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** | Local-model (Ollama) integration for DeepSeek Harness. | |
| **[dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions)** | LSP diagnostics, formatting, completion, code actions and rename over language servers | |
| **[dsh-mask](https://github.com/PerryLink/dsh-mask)** | PII masking middleware: anonymize at the model boundary, restore at the display layer | |
| **[dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel)** | Read-only MCP runtime panel: /mcp command + Settings tab with status, tools and errors | |
| **[dsh-memento](https://github.com/PerryLink/dsh-memento)** | Approval-gated cross-session memory: ctx.memory seam + SQLite + memory tool | |
| **[dsh-observe](https://github.com/PerryLink/dsh-observe)** | OpenTelemetry and Langfuse observability exporter for DeepSeek Harness. | |
| **[dsh-output-styles](https://github.com/PerryLink/dsh-output-styles)** | Claude Code outputStyles-equivalent runtime style switching | |
| **[dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules)** | Claude Code-style declarative allow/deny/ask permission rules with audit | |
| **[dsh-plugin-certification](https://github.com/PerryLink/dsh-plugin-certification)** | Community certification registry with repro-checkable grades and badges | |
| **[dsh-plugin-doctor](https://github.com/PerryLink/dsh-plugin-doctor)** | Zero-dependency static + sandbox smoke detector for DSH plugins | |
| **[dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide)** | Plugin-development knowledge base as an on-demand agent skill | |
| **[dsh-plugin-kit](https://github.com/PerryLink/dsh-plugin-kit)** | Shared zero-runtime-dependency toolkit for the PerryLink DSH plugins | |
| **[dsh-plugin-upgrade](https://github.com/PerryLink/dsh-plugin-upgrade)** | One-package, one-corridor-index plugin upgrade skill: routes a repository to the matching closed corridor card | |
| **[dsh-plugin-upgrade-015](https://github.com/PerryLink/dsh-plugin-upgrade-015)** | Merged `0.1.3-alpha.1` → `0.1.5-rc.1` upgrade corridor card plus a zero-dependency seam scanner | |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | Multi-channel approval/question bridge: WeChat/Telegram/Feishu, session console | |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** | Verifiable research-report engine: content-addressed evidence ledger and sealed versions | |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** | Multi-dimensional quality scoring for DeepSeek Harness plugins. | |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | Pin sessions in the Web sidebar with durable ordering | |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** | Cross-device session sync for DeepSeek Harness — a dedicated git mirror of your session store. | |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** | Security-audit skill pack: secret scan, dependency and supply-chain review | |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** | Voice-first session loop for DeepSeek Harness: talk to it, hear it answer. | |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | Cross-session team rooms: shared message bus, task board and timeline | |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** | Isolated install-and-smoke test drives for DeepSeek Harness plugins. | |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** | TickTick/Dida365 task bridge: session-header panel + 11 tools | |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** | Vendor parameter translation and deterministic JSON repair for DeepSeek Harness. | |


### DSH Desktop मार्केट से इंस्टॉल करें

सभी PerryLink प्लगइन DSH Desktop के बिल्ट-इन मार्केट में देखे जा सकते हैं: **Market → Sources → add source → पेस्ट करें** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ चुनें**। इंस्टॉलेशन मार्केट के npm-identity सत्यापन और आपकी पुष्टि से ही होता है।

## लाइसेंस

[Apache License 2.0](LICENSE) © 2026 dsh-doublecheck contributors
