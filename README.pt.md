# dsh-doublecheck

> **Verifique duas vezes antes de publicar: interrogue os requisitos, teste a implementação, comprove a entrega.**

[![version](https://img.shields.io/badge/version-0.4.0-blue)](https://github.com/PerryLink/dsh-doublecheck/releases)
[![license](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)
[![topics](https://img.shields.io/badge/topics-dsh%20%7C%20dsh--plugin-22c55e)](https://github.com/topics/dsh-plugin)

Um **bundle de disciplina de engenharia** para o [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). Agentes adoram começar a codar; requisitos odeiam ser presumidos. O `dsh-doublecheck` instala um ciclo de disciplina que faz o agente **interrogar os requisitos antes da primeira edição e comprovar a entrega em vez de afirmá-la** — reimplementado de forma nativa nos pontos de extensão do próprio DSH (registro de skills, pipeline de políticas de ferramentas, seam de aprovação, seams de subagente e workflow, log de sessão), sem arquivos de prompt emprestados. Testado contra DSH `0.1.0-rc.6`.

A metodologia é inspirada em [obra/superpowers](https://github.com/obra/superpowers) e [TimothyVang/Grill-me](https://github.com/TimothyVang/Grill-me). Todos os prompts, termos, exemplos e arquivos deste pacote foram escritos do zero — nada é copiado de nenhum dos dois projetos.

## Por quê

- Tarefas vagas produzem software errado. Um pedido curto («faz uma função pra mim») esconde seis decisões em aberto; hoje o agente chuta todas elas e você paga pelo chute.
- Times disciplinados fazem isso com humanos: revisão de requisitos → teste que falha → teste que passa → autorrevisão → comprovação de entrega. Agentes merecem o mesmo ciclo, imposto pelo harness, não pela boa vontade.

## O ciclo de disciplina

```
grill ──▶ design ──▶ red ──▶ green ──▶ review ──▶ verify
  │         │
  │      (v0.1)        (v0.2+)        (v0.3)         (v0.4)
  │
  └─ fornalha de requisitos: seis dimensões, portão de consenso,
     spec estruturado gravado na sessão e no workspace
```

| Etapa | Significado | Status |
|---|---|---|
| **grill** | Interrogar as seis dimensões de requisitos; recusar implementar até o consenso. | ✅ v0.1 |
| **design** | Spec registrado via `doublecheck_spec`. | ✅ v0.1 |
| **red** | Um teste que falha comprova a lacuna; edições de implementação precisam dele no registro. | ✅ v0.2 |
| **green** | Um teste que passa após as edições fecha o ciclo. | ✅ v0.2 |
| **review** | Um crítico adversário bifurcado audita a entrega contra o spec. | ✅ v0.3 |
| **verify** | `doublecheck_report` + um workflow de verificação por dimensão comprovam a entrega. | ✅ v0.4 |

## Recursos (v0.4)

- 🔥 **Skill `grill-requirements`** — um skill empacotado no formato Agent Skills que interroga a tarefa em seis dimensões (**objetivo, escopo, critérios de aceite, modos de falha, prioridades, não-objetivos**) usando a UI nativa `ask_user_question` do DSH, recusa escrever código até o consenso e registra o contrato.
- 📜 **Ferramenta `doublecheck_spec`** — grava o spec acordado no log da sessão e escreve uma cópia em markdown no workspace, para o contrato sobreviver à conversa.
- 🛡️ **Guard de disciplina** — um portão suave no pipeline de políticas de ferramentas. Tarefa vaga + sem spec + rumo a `edit`/`write` → **lembrar**, **pedir aprovação humana** ou **bloquear**, conforme `intensity`.
- 🟥🟩 **Portões de evidência red/green** (`modules.tdd`) — verificações duras sobre o log da sessão: uma edição de implementação exige um **teste que falha registrado** desde o último teste que passa (escrever arquivos de teste é sempre permitido — é assim que o passo red acontece), e um turno que termina com edições mas sem nenhum teste que passa recebe um lembrete green injetado.
- 👁️ **Revisão adversária** (`modules.adversary`) — assim que a entrega chega ao green, um subagente crítico bifurcado (seam nativo de subagentes do DSH, provider `fork` por padrão) audita a sessão contra o spec registrado com postura adversária e devolve achados estruturados. `remind` injeta a crítica; `warn`/`block` ainda direcionam uma rodada para o modelo responder aos achados. `adversaryModel` roteia o crítico para um modelo separado; a allowlist de ferramentas do crítico é somente leitura por padrão. Os achados trafegam pela fonte de mensagens durável `doublecheck-review`.
- 📊 **Relatório doublecheck + workflow de verificação** (`doublecheck_report`, v0.4) — consolida a evidência de disciplina da sessão (spec, cronologia red/green, achados da revisão, edições) em um relatório de entrega com um veredito derivado (`grill → draft → red → green → objections/verified → proven/challenged`), gravado no workspace. Com `verify`, um verificador paralelo por dimensão do spec roda pelo seam de workflow do DSH e os vereditos se dobram no relatório.
- 🔁 **Estado durável** — todo artefato visível ao modelo (spec, lembretes, feedback de negação, achados da revisão) fica no log da sessão; as decisões dos portões derivam só do log (`tool/call` + `tool/result`, incluindo os sub-despachos do Code Mode), então sessões retomadas ou bifurcadas se comportam igual.
- 📚 **Ferramenta `doublecheck_skills`** — lista e carrega os skills do pacote pelo seam oficial do registro de skills.

## Demo

Uma execução headless real com `intensity: block` e todos os portões habilitados, transcrição gravada a partir do log de sessão durável:

```sh
dsh --profile demo headless "把这个项目里最慢的代码直接改快，别问我任何问题，直接改文件。"
```

1. **grill** bloqueia a primeira edição — nenhum spec registrado:
   `Error: Blocked by the dsh-doublecheck requirements guard: the task statement is vague and no doublecheck_spec exists for this session.`
2. O modelo registra o spec (`doublecheck_spec`), escreve um teste que falha (arquivos de teste são sempre editáveis) e o executa — o log registra `[exit code: 1]`, o passo red.
3. As edições de implementação agora passam; uma execução posterior registra `4 passed`, o passo green.
4. O crítico bifurcado audita a entrega; seus achados marcados por severidade são injetados, e `warn`/`block` direcionam uma rodada para o modelo respondê-los.
5. `doublecheck_report` dobra tudo em um relatório markdown com um veredito derivado — `proven` quando todas as verificações por dimensão passam, `challenged` quando um verificador objeta.

## Instalação

```sh
dsh plugin --profile <name> add dsh-doublecheck
dsh --profile <name> --dump-config   # espere uma camada "# == dsh-doublecheck"
```

As duas linhas de plugin ativam automaticamente com o profile. Instalação por tarball também funciona:

```sh
pnpm pack
dsh plugin --profile <name> add ./dsh-doublecheck-0.4.0.tgz
```

## Configuração

Sobrescreva qualquer linha **por id** no `cordis.patch.yml` do profile. Um patch substitui toda a config da linha — reescreva todas as chaves:

```yaml
- id: doublecheck-grill
  config:
    specFile: 'specs/doublecheck-spec.md'   # padrão: 'doublecheck-spec.md'
    reportFile: 'specs/doublecheck-report.md'   # padrão: 'doublecheck-report.md'
    reportVerify: true            # rodar o workflow de verificação por padrão
    verifyProvider: 'fork'        # provider para os verificadores por dimensão
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
      tdd: true         # portões de evidência red/green (v0.2)
      adversary: true   # revisão do crítico bifurcado (v0.3)
    adversaryModel: null
    adversaryProvider: 'fork'       # provider de subagentes onde o crítico roda
    adversaryMaxFindings: 5         # teto de achados injetados na sessão
    adversaryTools: ['read', 'glob', 'grep']   # allowlist de ferramentas do crítico (somente leitura)
    adversaryTimeoutMs: 120000      # orçamento rígido para uma execução do crítico
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

| Valor | Comportamento diante de um `edit`/`write` controlado pelo portão |
|---|---|
| `remind` (padrão) | A chamada prossegue; um lembrete viaja no contexto do resultado para a próxima requisição do modelo. |
| `warn` | A chamada fica retida aguardando aprovação humana única pelo seam de aprovação (nega quando não há canal). |
| `block` | A chamada é negada com feedback que orienta o modelo a corrigir a disciplina primeiro. |

### Ajustes

| Chave | Padrão | Significado |
|---|---|---|
| `modules.grill` | `true` | `false` desativa o portão grill. O interruptor dos skills/ferramentas grill é o flag `disabled` da linha deles. |
| `modules.tdd` | `false` | `true` ativa os portões de evidência red/green (v0.2). |
| `modules.adversary` | `false` | `true` ativa a revisão do crítico bifurcado no green (v0.3); usa o seam `ctx.subagents` — um seam ausente se resolve como um aviso «indisponível». |
| `guardTools` | `['edit', 'write']` | Nomes de ferramentas de mutação que o guard vigia. |
| `vagueTaskMaxChars` | `200` | Tarefas mais longas nunca são tratadas como vagas. Tarefas breves que citam arquivo, caminho, URL, palavra-chave com sublinhado ou palavra-chave hifenizada são concretas. |
| `remindOnce` | `true` | Injetar o lembrete de cada portão no máximo uma vez por sessão. |
| `testToolNames` | `['bash', 'pwsh']` | Nomes de ferramentas de shell que podem executar testes. |
| `testCommandPatterns` | *(pnpm/npm/yarn/bun test, pytest, go/cargo/make test, node --test)* | Expressões regulares com as quais um comando deve coincidir para contar como execução de teste. |
| `testFilePatterns` | *(diretórios de teste, `*.test.*` / `*.spec.*`)* | Expressões regulares que identificam arquivos de teste — sempre editáveis, isentos do portão red. |
| `adversaryModel` | `null` | Rota do modelo crítico; `null` = o modelo principal se autorrevisa. |
| `adversaryProvider` | `'fork'` | Nome do provider de subagentes onde o crítico roda. |
| `adversaryMaxFindings` | `5` | Teto de achados (1–20) injetados na sessão. |
| `adversaryTools` | `['read', 'glob', 'grep']` | Allowlist de ferramentas do crítico; mantenha somente leitura. |
| `adversaryTimeoutMs` | `120000` | Orçamento de tempo rígido para uma execução do crítico. |

Configuração errada falha em voz alta: uma regex inválida, uma lista de nomes vazia ou duplicada, ou um teto de achados fora do intervalo lança erro no carregamento, em vez de não fazer nada em silêncio. Um crítico que não consegue rodar (seam ausente, falha do provider, timeout) se resolve como um aviso honesto «indisponível» na sessão.

### Controles do relatório (linha grill)

| Chave | Padrão | Significado |
|---|---|---|
| `reportFile` | `'doublecheck-report.md'` | Arquivo do workspace que recebe o markdown do relatório. |
| `reportVerify` | `true` | Padrão para o flag `verify` da ferramenta. |
| `verifyProvider` | `'fork'` | Provider de subagentes onde os verificadores por dimensão rodam. |
| `reportTestToolNames` / `reportTestCommandPatterns` | *(same defaults as the guard row)* | Classificação de execuções de teste com escopo de relatório. |
| `reportMutationTools` / `reportTestFilePatterns` | *(same defaults as the guard row)* | Classificação de edições de implementação com escopo de relatório. |

Os controles de classificação do relatório são independentes dos do guard: a aplicação do portão e a dobra do relatório podem ser ajustados separadamente sem que um mude silenciosamente o outro. A verificação degrada honestamente: um seam `workflowEngine` ausente ou uma execução rejeitada deixa `verification: null` e o markdown diz isso.

## Como funciona (pontos de extensão)

| Contribuição | Mecanismo DSH |
|---|---|
| Skills empacotados | `ctx.skills.registerProvider()` — seam de capacidade de skills, `source: bundled` |
| Ferramenta de catálogo/carga | `ctx.tools.register()` — `doublecheck_skills` |
| Spec + arquivo no workspace | ferramenta `doublecheck_spec` + escrita opcional via `ctx.fs` |
| Portão de requisitos | waterfall `tools/pre-execute` — `allow` / `ask` (seam de aprovação) / `deny` |
| Portão red | waterfall `tools/pre-execute` — verificação dura da evidência de teste falho antes das edições de implementação |
| Injeção de lembrete | waterfall `tools/post-execute` — `additionalContexts` → registrado como `user/message` |
| Portão green | `agent/turn-stopping` serial — injeta um lembrete de conclusão quando as edições carecem de um teste que passa |
| Revisão adversária | `ctx.subagents.start()` — forked critic with structured findings schema, injected at green; `warn`/`block` steer one round |
| Relatório de entrega | `doublecheck_report` tool — session-log fold + workspace markdown |
| Workflow de verificação | `ctx.workflowEngine.start()` — one parallel checker per spec dimension, structured checks |
| Estado durável | session log fold over `tool/call` + `tool/result` + `tool/code-dispatch` + injected structured sources; model-visible ⟺ logged |
| Eventos internos | `doublecheck/spec`, `doublecheck/reminder`, `doublecheck/review`, `doublecheck/report` (typed via declaration merging, `@mode emit`) |

Sem mudanças no agent-loop. Todo registro é um `ctx.effect` / `ctx.on` / `register()` de serviço reversível.

## O que o modelo vê

- O skill `grill-requirements` entra no catálogo de skills da sessão e carrega pela ferramenta integrada `skill` (ou `doublecheck_skills`).
- `ask_user_question` continua sendo a forma nativa do DSH de perguntar ao usuário; o skill só coreografa (e em headless sem provider degrada para perguntas em prosa).
- Os lembretes chegam como contexto `{kind:'plugin'}`, então as UIs de transcrição os exibem como metadados de injeção.
- A crítica do adversário chega da mesma forma depois que o crítico se estabelece, com achados marcados por severidade; sob `warn`/`block` o ciclo é direcionado uma rodada para que o modelo os responda.
- `doublecheck_report` devolve o relatório consolidado como resultado de ferramenta (spec, cronologia de testes, revisão, verificação, veredito), então «comprovar a entrega» está a uma chamada de distância.

## Roadmap

O ciclo de disciplina de seis etapas está completo: **grill → design → red → green → review → verify** — todas embarcam neste pacote (v0.1 → v0.4). Trabalho futuro: cobertura de snapshot para as transcrições de revisão/relatório e formatação de relatório mais rica.

## Desenvolvimento

```sh
pnpm install --ignore-workspace
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```

## Agradecimentos

Metodologia inspirada em [obra/superpowers](https://github.com/obra/superpowers) (disciplina de engenharia estilo TDD) e [TimothyVang/Grill-me](https://github.com/TimothyVang/Grill-me) (interrogar requisitos antes de implementar). Este pacote é uma implementação original: nenhum texto, prompt ou arquivo de nenhum dos dois projetos foi copiado.

## Licença

[Apache-2.0](LICENSE)
