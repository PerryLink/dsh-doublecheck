# dsh-doublecheck

> **शिप करने से पहले दोबारा जाँचें: आवश्यकताओं की पड़ताल करें, कार्यान्वयन का परीक्षण करें, डिलीवरी साबित करें।**

[![version](https://img.shields.io/badge/version-0.4.0-blue)](https://github.com/PerryLink/dsh-doublecheck/releases)
[![license](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)
[![topics](https://img.shields.io/badge/topics-dsh%20%7C%20dsh--plugin-22c55e)](https://github.com/topics/dsh-plugin)

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) के लिए एक **इंजीनियरिंग-अनुशासन बंडल**। एजेंट तुरंत कोड लिखना चाहते हैं; आवश्यकताएँ मान लिए जाना पसंद नहीं करतीं। `dsh-doublecheck` एक अनुशासन-चक्र स्थापित करता है जो एजेंट को **पहले संपादन से पहले आवश्यकताओं की पड़ताल करने** और **डिलीवरी का दावा करने के बजाय उसे साबित करने** के लिए बाध्य करता है — पूरी तरह DSH के अपने एक्सटेंशन पॉइंट्स (स्किल रजिस्ट्री, टूल पॉलिसी पाइपलाइन, अप्रूवल सीम, उप-एजेंट और वर्कफ़्लो सीम, सेशन लॉग) पर मूल रूप से पुनः लागू, किसी उधार की प्रॉम्प्ट फ़ाइल पर नहीं। DSH `0.1.0-rc.6` के विरुद्ध परीक्षण किया गया।

कार्यप्रणाली [obra/superpowers](https://github.com/obra/superpowers) और [TimothyVang/Grill-me](https://github.com/TimothyVang/Grill-me) से प्रेरित है। इस पैकेज का हर प्रॉम्प्ट, शब्द, उदाहरण और फ़ाइल शुरू से लिखा गया है — दोनों में से किसी भी परियोजना से कुछ भी कॉपी नहीं किया गया।

## क्यों

- अस्पष्ट कार्य गलत सॉफ़्टवेयर बनाते हैं। एक छोटा सा अनुरोध («मेरे लिए एक फ़ीचर बनाओ») छह अनसुलझे निर्णय छिपाता है; आज एजेंट सभी का अनुमान लगाता है और आप उस अनुमान की कीमत चुकाते हैं।
- अनुशासित टीमें यही इंसानों के साथ करती हैं: आवश्यकता-समीक्षा → असफल परीक्षण → सफल परीक्षण → आत्म-समीक्षा → डिलीवरी-प्रमाण। एजेंट भी उसी चक्र के हक़दार हैं — हार्नेस द्वारा लागू, भरोसे से नहीं।

## अनुशासन-चक्र

```
grill ──▶ design ──▶ red ──▶ green ──▶ review ──▶ verify
  │         │
  │      (v0.1)        (v0.2+)        (v0.3)         (v0.4)
  │
  └─ आवश्यकता-भट्टी: छह आयाम, सहमति-द्वार,
     संरचित spec सेशन और वर्कस्पेस में दर्ज
```

| चरण | अर्थ | स्थिति |
|---|---|---|
| **grill** | छह आवश्यकता-आयामों की पड़ताल; सहमति तक कार्यान्वयन से इनकार। | ✅ v0.1 |
| **design** | `doublecheck_spec` से spec दर्ज। | ✅ v0.1 |
| **red** | असफल परीक्षण अंतर साबित करता है; कार्यान्वयन संपादनों को यह लॉग में दर्ज चाहिए। | ✅ v0.2 |
| **green** | संपादनों के बाद पास होने वाला परीक्षण चक्र पूरा करता है। | ✅ v0.2 |
| **review** | एक फ़ॉर्क किया गया विरोधी-आलोचक spec के विरुद्ध डिलीवरी का ऑडिट करता है। | ✅ v0.3 |
| **verify** | `doublecheck_report` + प्रति-आयाम सत्यापन वर्कफ़्लो डिलीवरी साबित करते हैं। | ✅ v0.4 |

## विशेषताएँ (v0.4)

- 🔥 **`grill-requirements` स्किल** — Agent Skills प्रारूप में पैक की गई स्किल, जो DSH की मूल `ask_user_question` UI से कार्य की छह आयामों (**लक्ष्य, दायरा, स्वीकृति-मानदंड, विफलता-स्थितियाँ, प्राथमिकताएँ, निषेध**) पर पड़ताल करती है, सहमति तक कोड लिखने से इनकार करती है और अनुबंध दर्ज करती है।
- 📜 **`doublecheck_spec` टूल** — सहमत spec को सेशन लॉग में दर्ज करता है और वर्कस्पेस में markdown प्रति लिखता है, ताकि अनुबंध बातचीत के बाद भी बचा रहे।
- 🛡️ **अनुशासन गार्ड** — टूल पॉलिसी पाइपलाइन पर एक नरम द्वार। अस्पष्ट कार्य + spec नहीं + `edit`/`write` की ओर बढ़ना → `intensity` के अनुसार **याद दिलाना**, **मानव अनुमोदन माँगना** या **रोकना**।
- 🟥🟩 **Red/green प्रमाण-द्वार** (`modules.tdd`) — सेशन लॉग पर कड़ी जाँचें: कार्यान्वयन संपादन के लिए पिछले पास होने वाले परीक्षण के बाद से एक **असफल परीक्षण लॉग में दर्ज** होना चाहिए (परीक्षण फ़ाइलें लिखना हमेशा अनुमत है — red चरण ऐसे ही घटता है), और जो टर्न संपादनों के साथ पर बिना किसी पास होने वाले परीक्षण के समाप्त होता है, उसमें green अनुस्मारक इंजेक्ट होता है।
- 👁️ **विरोधी-समीक्षा** (`modules.adversary`) — जब डिलीवरी green पर पहुँच जाती है, तब एक फ़ॉर्क किया गया आलोचक उप-एजेंट (DSH का मूल उप-एजेंट सीम, डिफ़ॉल्ट `fork` provider) प्रतिकूल रुख़ के साथ दर्ज spec के विरुद्ध सेशन का ऑडिट करता है और संरचित निष्कर्ष लौटाता है। `remind` आलोचना इंजेक्ट करता है; `warn`/`block` इसके अलावा एक राउंड चलाकर मॉडल से निष्कर्षों का उत्तर दिलवाते हैं। `adversaryModel` आलोचक को अलग मॉडल पर भेजता है; आलोचक की टूल allowlist डिफ़ॉल्ट रूप से read-only है। निष्कर्ष टिकाऊ `doublecheck-review` संदेश-स्रोत पर सवार होते हैं।
- 📊 **Doublecheck रिपोर्ट + सत्यापन वर्कफ़्लो** (`doublecheck_report`, v0.4) — सेशन के अनुशासन-प्रमाण (spec, red/green समयरेखा, समीक्षा-निष्कर्ष, संपादन) को एक डिलीवरी रिपोर्ट में समेकित करता है, जिसमें व्युत्पन्न निर्णय होता है (`grill → draft → red → green → objections/verified → proven/challenged`), वर्कस्पेस में लिखी जाती है। `verify` के साथ, प्रति spec-आयाम एक समानांतर जाँचकर्ता DSH के वर्कफ़्लो सीम से चलता है और उनके निर्णय रिपोर्ट में समाहित होते हैं।
- 🔁 **टिकाऊ स्थिति** — मॉडल को दिखने वाली हर चीज़ (spec, अनुस्मारक, अस्वीकृति-फ़ीडबैक, समीक्षा-निष्कर्ष) सेशन लॉग में दर्ज होती है; द्वारों के निर्णय केवल लॉग से निकलते हैं (`tool/call` + `tool/result`, Code Mode उप-प्रेषण सहित), इसलिए पुनः आरंभ या फ़ॉर्क की गई सेशन भी वैसा ही व्यवहार करती हैं।
- 📚 **`doublecheck_skills` टूल** — आधिकारिक स्किल-रजिस्ट्री सीम से पैकेज की स्किल्स सूचीबद्ध व लोड करता है।

## डेमो

`intensity: block` और सभी द्वार सक्षम के साथ एक वास्तविक headless रन, टिकाऊ सेशन लॉग से दर्ज की गई ट्रांसक्रिप्ट:

```sh
dsh --profile demo headless "把这个项目里最慢的代码直接改快，别问我任何问题，直接改文件。"
```

1. **grill** पहले संपादन को रोकता है — कोई spec दर्ज नहीं:
   `Error: Blocked by the dsh-doublecheck requirements guard: the task statement is vague and no doublecheck_spec exists for this session.`
2. मॉडल spec (`doublecheck_spec`) दर्ज करता है, एक असफल परीक्षण लिखता है (परीक्षण फ़ाइलें हमेशा संपादन-योग्य होती हैं) और उसे चलाता है — लॉग `[exit code: 1]` दर्ज करता है, red चरण।
3. कार्यान्वयन संपादन अब पास होते हैं; बाद का रन `4 passed` दर्ज करता है, green चरण।
4. फ़ॉर्क किया गया आलोचक डिलीवरी का ऑडिट करता है; उसके गंभीरता-टैग वाले निष्कर्ष इंजेक्ट होते हैं, और `warn`/`block` एक राउंड चलाते हैं ताकि मॉडल उनका उत्तर दे।
5. `doublecheck_report` सब कुछ एक markdown रिपोर्ट में समाहित कर देता है, जिसमें व्युत्पन्न निर्णय होता है — `proven` जब हर प्रति-आयाम सत्यापन जाँच पास होती है, `challenged` जब कोई जाँचकर्ता आपत्ति करता है।

## स्थापना

```sh
dsh plugin --profile <name> add dsh-doublecheck
dsh --profile <name> --dump-config   # "# == dsh-doublecheck" परत दिखनी चाहिए
```

दोनों प्लगइन पंक्तियाँ profile के साथ अपने आप सक्रिय होती हैं। tarball से भी:

```sh
pnpm pack
dsh plugin --profile <name> add ./dsh-doublecheck-0.4.0.tgz
```

## कॉन्फ़िगरेशन

profile के `cordis.patch.yml` में किसी भी पंक्ति को **id से** ओवरराइड करें। patch पंक्ति की पूरी config बदल देता है — हर कुंजी दोबारा लिखें:

```yaml
- id: doublecheck-grill
  config:
    specFile: 'specs/doublecheck-spec.md'   # डिफ़ॉल्ट: 'doublecheck-spec.md'
    reportFile: 'specs/doublecheck-report.md'   # डिफ़ॉल्ट: 'doublecheck-report.md'
    reportVerify: true            # डिफ़ॉल्ट रूप से सत्यापन वर्कफ़्लो चलाएँ
    verifyProvider: 'fork'        # प्रति-आयाम जाँचकर्ताओं के लिए provider
    reportTestToolNames: ['bash', 'pwsh']
    reportTestCommandPatterns:
      - '(?:^|[;&|]\s*)(?:(?:pnpm|npm|npx|yarn|bun)(?:\s+run)?\s+(?:test|vitest|jest|mocha)(?:\s|$))'
      - '(?:^|[;&|]\s*)(?:(?:pytest|go\s+test|cargo\s+test|make\s+test|ctest)(?:\s|$))'
      - '(?:^|[;&|]\s*)(?:node\s+--test(?:\s|$))'
    reportMutationTools: ['edit', 'write']
    reportTestFilePatterns:
      - '(^|[\\/])(tests?|__tests__|specs?)([\\/]|$)'
      - '\\.(test|spec)\\.[A-Za-z0-9]+$'

- id: doublecheck-guard
  config:
    intensity: warn
    modules:
      grill: true
      tdd: true         # red/green प्रमाण-द्वार (v0.2)
      adversary: true   # फ़ॉर्क किए आलोचक की समीक्षा (v0.3)
    adversaryModel: null
    adversaryProvider: 'fork'       # वह उप-एजेंट provider जिस पर आलोचक चलता है
    adversaryMaxFindings: 5         # सेशन में इंजेक्ट होने वाली निष्कर्ष-सीमा
    adversaryTools: ['read', 'glob', 'grep']   # आलोचक की टूल allowlist (read-only)
    adversaryTimeoutMs: 120000      # एक आलोचक रन के लिए कठोर बजट
    guardTools: ['edit', 'write']
    vagueTaskMaxChars: 200
    remindOnce: true
    testToolNames: ['bash', 'pwsh']
    testCommandPatterns:
      - '(?:^|[;&|]\s*)(?:(?:pnpm|npm|npx|yarn|bun)(?:\s+run)?\s+(?:test|vitest|jest|mocha)(?:\s|$))'
      - '(?:^|[;&|]\s*)(?:(?:pytest|go\s+test|cargo\s+test|make\s+test|ctest)(?:\s|$))'
      - '(?:^|[;&|]\s*)(?:node\s+--test(?:\s|$))'
    testFilePatterns:
      - '(^|[\\/])(tests?|__tests__|specs?)([\\/]|$)'
      - '\\.(test|spec)\\.[A-Za-z0-9]+$'
```

### `intensity`

| मान | द्वार-नियंत्रित `edit`/`write` पर व्यवहार |
|---|---|
| `remind` (डिफ़ॉल्ट) | कॉल जारी रहती है; अनुस्मारक परिणाम-संदर्भ के साथ अगले मॉडल अनुरोध में जाता है। |
| `warn` | कॉल अप्रूवल सीम से एकबारगी मानव अनुमोदन हेतु रोकी जाती है (कोई चैनल न होने पर अस्वीकार)। |
| `block` | कॉल अस्वीकार होती है; फ़ीडबैक मॉडल को पहले अनुशासन सुधारने की ओर भेजता है। |

### ट्यूनिंग

| कुंजी | डिफ़ॉल्ट | अर्थ |
|---|---|---|
| `modules.grill` | `true` | `false` पर grill द्वार बंद। grill स्किल/टूल का स्विच उनकी पंक्ति का `disabled` फ़्लैग है। |
| `modules.tdd` | `false` | `true` पर red/green प्रमाण-द्वार चालू (v0.2)। |
| `modules.adversary` | `false` | `true` पर green (v0.3) पर फ़ॉर्क किए आलोचक की समीक्षा चालू होती है; `ctx.subagents` सीम का उपयोग करती है — सीम अनुपस्थित होने पर «अनुपलब्ध» सूचना दर्ज होती है। |
| `guardTools` | `['edit', 'write']` | वे परिवर्तन-टूल नाम जिन पर गार्ड नज़र रखता है। |
| `vagueTaskMaxChars` | `200` | इससे लंबे कार्य कभी अस्पष्ट नहीं माने जाते। फ़ाइल, पथ, URL, अंडरस्कोर कीवर्ड या हाइफ़न युक्त कीवर्ड बताने वाले छोटे कार्य ठोस होते हैं। |
| `remindOnce` | `true` | प्रत्येक द्वार का अनुस्मारक प्रति सेशन अधिकतम एक बार इंजेक्ट करें। |
| `testToolNames` | `['bash', 'pwsh']` | वे शेल टूल नाम जो परीक्षण चला सकते हैं। |
| `testCommandPatterns` | *(pnpm/npm/yarn/bun test, pytest, go/cargo/make test, node --test)* | वे regex जिनसे मेल खाने पर कमांड परीक्षण-रन माना जाता है। |
| `testFilePatterns` | *(परीक्षण डायरेक्टरियाँ, `*.test.*` / `*.spec.*`)* | वे regex जो परीक्षण फ़ाइलें पहचानते हैं — हमेशा संपादन-योग्य, red द्वार से मुक्त। |
| `adversaryModel` | `null` | आलोचक मॉडल मार्ग; `null` = मुख्य मॉडल स्वयं समीक्षा करता है। |
| `adversaryProvider` | `'fork'` | वह उप-एजेंट provider नाम जिस पर आलोचक चलता है। |
| `adversaryMaxFindings` | `5` | सेशन में इंजेक्ट होने वाले निष्कर्षों की सीमा (1–20)। |
| `adversaryTools` | `['read', 'glob', 'grep']` | आलोचक की टूल allowlist; इसे read-only रखें। |
| `adversaryTimeoutMs` | `120000` | एक आलोचक रन के लिए कठोर समय-बजट। |

गलत कॉन्फ़िगरेशन ज़ोर से विफल होती है: अमान्य regex, खाली या दोहराई गई नाम-सूची, या सीमा से बाहर निष्कर्ष-सीमा लोड के समय एरर फेंकती है, चुपचाप कुछ न करने के बजाय। जो आलोचक नहीं चल सकता (सीम अनुपस्थित, provider विफलता, timeout) वह सेशन में एक ईमानदार «अनुपलब्ध» सूचना के रूप में दर्ज होता है।

### रिपोर्ट नियंत्रण (grill पंक्ति)

| कुंजी | डिफ़ॉल्ट | अर्थ |
|---|---|---|
| `reportFile` | `'doublecheck-report.md'` | वह वर्कस्पेस फ़ाइल जो रिपोर्ट markdown प्राप्त करती है। |
| `reportVerify` | `true` | टूल के `verify` फ़्लैग का डिफ़ॉल्ट। |
| `verifyProvider` | `'fork'` | वह उप-एजेंट provider जिस पर प्रति-आयाम जाँचकर्ता चलते हैं। |
| `reportTestToolNames` / `reportTestCommandPatterns` | *(same defaults as the guard row)* | रिपोर्ट-स्कोप परीक्षण-रन वर्गीकरण। |
| `reportMutationTools` / `reportTestFilePatterns` | *(same defaults as the guard row)* | रिपोर्ट-स्कोप कार्यान्वयन-संपादन वर्गीकरण। |

रिपोर्ट के वर्गीकरण नियंत्रण गार्ड से स्वतंत्र हैं: द्वार-प्रवर्तन और रिपोर्ट-फ़ोल्ड को अलग-अलग ट्यून किया जा सकता है, बिना एक के चुपचाप दूसरे को बदले। सत्यापन ईमानदारी से घटता है: `workflowEngine` सीम अनुपस्थित या रन अस्वीकृत होने पर `verification: null` रह जाता है और markdown यह बताता है।

## कार्य-प्रणाली (एक्सटेंशन पॉइंट)

| योगदान | DSH तंत्र |
|---|---|
| पैक की गई स्किल्स | `ctx.skills.registerProvider()` — स्किल क्षमता सीम, `source: bundled` |
| सूची/लोड टूल | `ctx.tools.register()` — `doublecheck_skills` |
| spec + वर्कस्पेस फ़ाइल | `doublecheck_spec` टूल + वैकल्पिक `ctx.fs` लेखन |
| आवश्यकता-द्वार | `tools/pre-execute` वॉटरफ़ॉल — `allow` / `ask` (अप्रूवल सीम) / `deny` |
| red द्वार | `tools/pre-execute` वॉटरफ़ॉल — कार्यान्वयन संपादनों से पहले असफल-परीक्षण प्रमाण की कड़ी जाँच |
| अनुस्मारक इंजेक्शन | `tools/post-execute` वॉटरफ़ॉल — `additionalContexts` → `user/message` के रूप में दर्ज |
| green द्वार | `agent/turn-stopping` serial — जब संपादनों में पास होने वाला परीक्षण न हो तो समापन अनुस्मारक इंजेक्ट करता है |
| विरोधी-समीक्षा | `ctx.subagents.start()` — forked critic with structured findings schema, injected at green; `warn`/`block` steer one round |
| डिलीवरी रिपोर्ट | `doublecheck_report` tool — session-log fold + workspace markdown |
| सत्यापन वर्कफ़्लो | `ctx.workflowEngine.start()` — one parallel checker per spec dimension, structured checks |
| टिकाऊ स्थिति | session log fold over `tool/call` + `tool/result` + `tool/code-dispatch` + injected structured sources; model-visible ⟺ logged |
| आंतरिक इवेंट | `doublecheck/spec`, `doublecheck/reminder`, `doublecheck/review`, `doublecheck/report` (typed via declaration merging, `@mode emit`) |

agent-loop में कोई बदलाव नहीं। हर पंजीकरण प्रतिवर्ती `ctx.effect` / `ctx.on` / सेवा `register()` है।

## मॉडल क्या देखता है

- `grill-requirements` स्किल सेशन स्किल-कैटलॉग में शामिल होती है और अंतर्निहित `skill` टूल (या `doublecheck_skills`) से लोड होती है।
- `ask_user_question` उपयोगकर्ता से पूछने का DSH का मूल तरीका बना रहता है; स्किल केवल उसका निर्देशन करती है (और provider-रहित headless में गद्य-प्रश्नों पर उतर आती है)।
- अनुस्मारक `{kind:'plugin'}` संदर्भ के रूप में आते हैं, इसलिए ट्रांसक्रिप्ट UI उन्हें इंजेक्शन मेटाडेटा के रूप में दिखाते हैं।
- आलोचक के स्थिर होने के बाद विरोधी-आलोचना उसी तरह आती है, गंभीरता-टैग वाले निष्कर्षों के साथ; `warn`/`block` के तहत चक्र एक राउंड चलाया जाता है ताकि मॉडल उनका उत्तर दे।
- `doublecheck_report` समेकित रिपोर्ट को टूल परिणाम के रूप में लौटाता है (spec, परीक्षण समयरेखा, समीक्षा, सत्यापन, निर्णय), इसलिए «डिलीवरी साबित करना» एक कॉल की दूरी पर है।

## रोडमैप

छह-चरणीय अनुशासन-चक्र पूर्ण है: **grill → design → red → green → review → verify** — सभी इस पैकेज में शिप होते हैं (v0.1 → v0.4)। भावी कार्य: review/रिपोर्ट ट्रांसक्रिप्ट के लिए snapshot कवरेज और समृद्ध रिपोर्ट फ़ॉर्मेटिंग।

## विकास

```sh
pnpm install --ignore-workspace
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```

## आभार

कार्यप्रणाली [obra/superpowers](https://github.com/obra/superpowers) (TDD-शैली इंजीनियरिंग अनुशासन) और [TimothyVang/Grill-me](https://github.com/TimothyVang/Grill-me) (कार्यान्वयन से पहले आवश्यकताओं की पड़ताल) से प्रेरित है। यह पैकेज एक मूल कार्यान्वयन है: दोनों में से किसी भी परियोजना का कोई पाठ, प्रॉम्प्ट या फ़ाइल कॉपी नहीं किया गया।

## लाइसेंस

[Apache-2.0](LICENSE)
