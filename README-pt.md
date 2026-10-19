<div align="center">

# dsh-doublecheck
- **Canal 1024 store**: `npm i -g dsh1024` uma vez, depois `dsh1024 plugin --profile web add dsh-doublecheck` (conta para o ranking de instalações do [deepseek1024.com](https://deepseek1024.com)).

**O portão de qualidade de entrega para o DeepSeek Harness: interrogue os requisitos, teste a implementação, comprove a entrega — e então controle a passagem com uma decisão de entregável / retrabalho necessário.**

*Os requisitos são interrogados antes da primeira edição; a entrega é comprovada, nunca afirmada.*

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
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-doublecheck?metric=downloads&lang=pt)](https://dshfind.com/pt/plugins/PerryLink/dsh-doublecheck?ref=badge)

[English](README.md) · [简体中文](README-zh.md) · [Español](README-es.md) · [Português](README-pt.md) · [हिन्दी](README-hi.md)

```sh
dsh plugin --profile <name> add dsh-doublecheck
```


</div>

---


**📖 Base de conhecimento do ecossistema** — dados medidos, não marketing: [guia de desenvolvimento · dados de seleção · critérios de manutenção](https://perrylink.github.io/dsh-plugin-guide/).

<!-- star-cta -->
## ⭐ 如果它帮到了你

Este plugin faz parte da [família de plugins DSH](https://github.com/PerryLink) (mais de 40, todos Apache-2.0). Se for útil, **deixe uma estrela**: não desbloqueia nada, mas ajuda a próxima pessoa a encontrá-lo.

*English:* part of a 95 plugin family for DeepSeek Harness. If it is useful, **a star helps the next person find it** — nothing is gated behind it.

## What is dsh-doublecheck?

O portão de qualidade de entrega para o DeepSeek Harness: interrogue os requisitos, teste a implementação, comprove a entrega — e então controle a passagem com uma decisão de entregável / retrabalho necessário.

Os requisitos são interrogados antes da primeira edição; a entrega é comprovada, nunca afirmada.

![Demonstração de terminal do dsh-doublecheck: dsh-doublecheck — /gate report (example block from the README)](https://raw.githubusercontent.com/PerryLink/dsh-doublecheck/main/docs/assets/dsh-doublecheck-hero.png)

![Animated terminal demo of dsh-doublecheck](https://raw.githubusercontent.com/PerryLink/dsh-doublecheck/main/docs/assets/dsh-doublecheck-demo.gif)

*A mesma execução, animada.*

## Compatibilidade

| Superfície | Status |
|---|---|
| Harness | DeepSeek Harness `dsh-v0.2.1-rc.2` (verified 2026-10-18): `engines.dsh >=0.2.1-0 <0.3.0`; the gate and projection paths are covered by the rc.2 test suite. |
| Node | `^22.19.0 \|\| >=24.0.0` |
| Plataformas | Todas (host puro; sem código nativo, sem requisições de rede diretas próprias) |
| Modelo | Qualquer (o guard nunca chama um modelo; as fases de crítico e revisor rodam como subagentes do harness) |

## O que você obtém

`dsh-doublecheck` instala duas linhas de plugin que leem e aplicam a partir do mesmo registro de sessão durável:

1. **`doublecheck-grill`** — o forno de requisitos: a skill empacotada `grill-requirements` mais as ferramentas voltadas ao modelo `doublecheck_skills`, `doublecheck_spec` e `doublecheck_report`, e o fluxo de verificação por dimensão.
2. **`doublecheck-guard`** — o guard de disciplina: o portão grill, os portões de evidência vermelho/verde, a revisão adversarial, os comandos `/doublecheck` e `/gate`, o cartão de configurações ao vivo `gate` e o portão de entrega de quatro fases.

Juntos impõem o **ciclo de disciplina** — *grill → design → red → green → review → verify*:

```text
grill ──▶ design ──▶ red ──▶ green ──▶ review ──▶ verify
   │
   └─ seis dimensões de requisitos, portão de consenso,
      spec estruturado confirmado na sessão + workspace
```

| Etapa | Significado |
|---|---|
| **grill** | Interroga as seis dimensões de requisitos; recusa implementar até o consenso. |
| **design** | O spec acordado é confirmado via `doublecheck_spec`. |
| **red** | Uma execução de teste que falha comprova a lacuna antes das edições de implementação. |
| **green** | Uma execução de teste aprovada após as edições fecha o ciclo. |
| **review** | Um crítico adversarial bifurcado audita a entrega contra o spec. |
| **verify** | `doublecheck_report` + um fluxo de verificação por dimensão comprovam a entrega. |

## Início rápido

```sh
dsh plugin --profile web add github:PerryLink/dsh-doublecheck
```

```sh
# 1. install the bundle into your profile
dsh plugin --profile web add github:PerryLink/dsh-doublecheck

# or from npm (published releases)
dsh plugin --profile web add dsh-doublecheck

# 2. restart and verify the row
dsh --profile web --dump-config | grep -E -A3 'id: doublecheck-(grill|guard)'
```

Ambas as linhas (`doublecheck-grill` e `doublecheck-guard`) são ativadas automaticamente com o perfil.

## Instalar e desinstalar

- **canal git** (última `main`): `dsh plugin --profile web add github:PerryLink/dsh-doublecheck` — o script `prepare` compila apenas com dependências de produção.
- **canal npm** (versões publicadas): `dsh plugin --profile web add dsh-doublecheck`.
- **canal tarball**: `pnpm pack` neste repo e então `dsh plugin --profile web add ./dsh-doublecheck-<version>.tgz`.
- **desinstalar**: `dsh plugin --profile web remove dsh-doublecheck` (ou remova as linhas do patch de perfil).

Para um modo estrito sem configuração (cada portão ativo com intensidade `block`, cobertura do portão exigida), aplique a camada de sobreposição incluída sobre o patch do bundle: `dsh --profile web --patch ./node_modules/dsh-doublecheck/strict.patch.yml`.

## Configuração

Todos os ajustes são campos `Config` do Schemastery (alteráveis a partir do cordis.yml). Uma sobrescrita direcionada por id substitui a linha inteira — redeclare cada chave de que você precisa. `cordis.patch.yml` documenta cada chave inline; os padrões do Schema são a única fonte dos padrões de ajuste.

| Chave | Padrão | Significado |
|---|---|---|
| `specFile` | `'doublecheck-spec.md'` | Arquivo do workspace para o markdown do spec confirmado (linha grill). |
| `reportFile` | `'doublecheck-report.md'` | Arquivo do workspace para o relatório de entrega (linha grill). |
| `reportVerify` | `true` | Executa o fluxo de verificação por padrão (linha grill). |
| `verifyProvider` | `'fork'` | Provedor de subagente para os verificadores por dimensão (linha grill). |
| `verifyMode` | `'all'` | `all` = um verificador paralelo por dimensão; `single` = um verificador combinado (linha grill). |
| `intensity` | `'remind'` | Força de aplicação dos portões grill, vermelho/verde e de revisão (`remind` / `warn` / `block`). |
| `enableByDefault` | `true` | Interruptor mestre para sessões sem registro `/doublecheck on\|off`. |
| `language` | `'en'` | Idioma da prosa injetada de lembrete/negação/revisão/portão (`en` / `zh`). |
| `guardTools` | `['edit', 'write']` | Nomes de ferramentas de mutação que ambos os portões vigiam. |
| `vagueTaskMaxChars` | `200` | Tarefas mais longas nunca são tratadas como vagas. |
| `remindOnce` | `true` | Injeta cada lembrete no máximo uma vez por sessão (durável entre reinícios). |
| `testToolNames` | `['bash', 'pwsh']` | Nomes de ferramentas shell que podem executar testes. |
| `testCommandPatterns` | *(pnpm/npm/yarn/bun test, pytest, go/cargo/make test, node --test, deno test, uv run pytest)* | Regex que um comando deve corresponder para contar como execução de teste. |
| `testFilePatterns` | *(dirs de teste, `*.test.*` / `*.spec.*`)* | Regex que identificam arquivos de teste — sempre editáveis, isentos do portão vermelho. |
| `modules.grill` | `true` | Desligado desativa o portão grill. |
| `modules.tdd` | `true` | Ligado habilita os portões de evidência vermelho/verde. |
| `modules.adversary` | `false` | Ligado habilita a revisão de crítico bifurcado no verde. |
| `adversaryModel` | `null` | Rota de modelo do crítico; `null` = o modelo principal se autorrevisa. |
| `adversaryProvider` | `'fork'` | Provedor de subagente sobre o qual o crítico roda. |
| `adversaryMaxFindings` | `5` | Limite de achados (1–20) injetados na sessão. |
| `adversaryTools` | `['read', 'glob', 'grep']` | Lista permitida de ferramentas do crítico; mantenha somente leitura. |
| `adversaryTimeoutMs` | `120000` | Orçamento de tempo rígido para uma execução do crítico. |
| `gate.enabled` | `true` | Interruptor mestre do painel do portão e do aviso vermelho de limite de turno. |
| `gate.planSuggestion` | `true` | Acrescenta a sugestão de reverificação em modo plano aos relatórios vermelhos. |
| `gate.reportFile` | `'gate-report.md'` | Arquivo do workspace para o relatório do portão. |
| `gate.requirements.checklist` | *(seis perguntas de dimensão de spec)* | Lista de perguntas-chave plugável: `{ id, question, specDimension, required }`. |
| `gate.requirements.minConfirmed` | `6` | Perguntas obrigatórias mínimas que devem passar (1..quantidade obrigatória). |
| `gate.requirements.interrogateTool` | `'ask_user_question'` | Nome da ferramenta cujas chamadas contam como evidência de interrogação. |
| `gate.tests.requirePassingRun` | `true` | Uma última execução de teste não aprovada (ou ausente) é uma luz vermelha. |
| `gate.tests.allowFailingRuns` | `0` | Execuções que falham após o último verde permitidas antes do vermelho. |
| `gate.tests.requireCoverage` | `false` | Ligado exige evidência de cobertura na saída do teste. |
| `gate.tests.minCoveragePct` | `80` | Percentual mínimo de cobertura (0–100). |
| `gate.tests.evalReports.enabled` | `false` | Ligado dobra o relatório dsh-eval (o motor de avaliação do dsh-auto-review) na evidência de teste. |
| `gate.tests.evalReports.dir` | `'.eval-reports'` | Diretório relativo ao espaço de trabalho que contém o relatório do motor. |
| `gate.tests.evalReports.file` | `'report.json'` | Nome do arquivo de relatório dentro do diretório. |
| `gate.tests.evalReports.required` | `false` | Um relatório ausente é uma luz vermelha exatamente quando true (um pulo caso contrário). |
| `gate.consistency.*` | `provider: 'fork'`, `model: null`, `tools: ['read','glob','grep']`, `timeoutMs: 120000`, `maxFindings: 5` | Ajustes do revisor local de consistência (`model: null` = modelo principal). |
| `gate.review.engine` | `'auto'` | `auto` = registros de veredicto do dsh-auto-review quando presentes, senão o revisor local; `local` = sempre local. |
| `gate.review.provider` | `'fork'` | Provedor do revisor local de revisão (seu `model`/`tools`/`timeoutMs`/`maxFindings` coincidem com `gate.consistency.*`). |

Cada chave `gate.*` acima faz parte de um único **campo ao vivo**: o guard marca todo o bloco `gate` como `.volatile()`, então ele é o cartão de configurações editável da linha (o namespace do formulário é o id de entrada de perfil da linha). As demais chaves são configuração de composição comum do patch de perfil. O bloco é lido uma vez ao carregar, então uma edição passa a valer no próximo carregamento — `gate.enabled` decide se o aviso vermelho do limite de turno é instalado. Se o schemastery do host for anterior a `.volatile()`, a linha monta mesmo assim: não há cartão e o bloco vem do patch de perfil.

A má configuração falha em voz alta ao carregar: regex inválidas, listas de nomes vazias ou duplicadas, limites fora de faixa e ids de lista duplicados lançam erro em vez de não fazer nada em silêncio. `strict.patch.yml` é a camada de todos os portões em bloqueio que redeclara a linha guard com `intensity: block`, todos os módulos ativos e o requisito de cobertura habilitado.

## Ferramentas e superfícies

| Superfície | Tipo | Notas |
|---|---|---|
| `doublecheck_skills` | ferramenta | Lista e carrega as quatro skills empacotadas por meio da interface do registro de skills. |
| `doublecheck_spec` | ferramenta | Confirma o spec de seis dimensões no registro de sessão e em uma cópia markdown do workspace. |
| `doublecheck_report` | ferramenta | Dobra a evidência de disciplina em um relatório de entrega (fluxo de verificação por dimensão opcional). |
| `/doublecheck status\|report\|on\|off` | comando | Interruptor, módulos, intensidade, fatos de etapa, relatório dobrado e a sobrescrita durável on/off. |
| `/gate status\|run\|config` | comando | Progresso da lista em tempo real, o relatório entregável/retrabalho assentado e a configuração efetiva. |
| `grill-requirements`, `red-green-tdd`, `delivery-review`, `delivery-proof` | skill | Skills de disciplina empacotadas que cobrem as seis etapas do ciclo. |
| `gate` | campo de configuração ao vivo | A lista plugável é o único campo `.volatile()` da linha do guard: é editada no cartão de configurações da linha (namespace = o id de entrada de perfil da linha) e lida uma vez ao carregar. |
| `strict.patch.yml` | camada de sobreposição | Cada portão ativo com intensidade `block` mais o requisito de cobertura, em uma camada de patch. |
| `dsh-doublecheck/invariant` | linha acompanhante | Reporta contradições de caminho de escrita próprias do pacote por meio do registro `invariants` do host. |
| `doublecheck` | projeção de sessão | Uma linha de status limitada que o cliente exibe: etapa, último veredicto do portão, contagem de vermelhos, edições e marcas spec/review. Ver [Como ler a linha de status](#como-ler-a-linha-de-status). |

### Como ler a linha de status

A projeção de sessão `doublecheck` é uma **string**, e é deliberadamente uma única linha: a ideia é que qualquer cliente possa exibi-la sem cortar nada. O `/status` de uma ponte de chat, uma barra de status ou qualquer consumidor próprio a exibe como está:

```text
gate:rework r2 | stage:green | test:green edits:12 spec:yes review:yes | goal:ship parser fix
```

| Segmento | Lê-se como |
|---|---|
| `gate:<veredicto> r<n>` | O último veredicto do portão de entrega — `none` antes de qualquer execução, `deliverable` ou `rework` — e sua contagem de vermelhos `r<n>`. |
| `stage:<etapa>` | A etapa de disciplina alcançada com evidência durável: `grill`, `design`, `red`, `green`, `review`, `verify`. |
| `test:<cor>` | A cor da última execução de testes: `none`, `red`, `green`. |
| `edits:<n>` | Edições de implementação dobradas do registro de sessão (escrever arquivos de teste não conta). |
| `spec:yes` / `spec:no` | Se existe um `doublecheck_spec` confirmado. |
| `review:yes` / `review:no` | Se existe um registro de revisão adversária. |
| `goal:<trecho>` | O objetivo do spec confirmado, recortado. Só aparece com `spec:yes`. |

A linha é limitada **por construção**, então nenhum renderizador a trunca:

- Orçamento rígido: **120 caracteres**. Um renderizador que preserva valores de até 120 caracteres — o renderizador genérico de projeções da ponte do WeChat é um deles — mostra a linha inteira. A forma de objeto anterior tinha 131 caracteres **vazia**, e é por isso que o veredicto e a contagem de vermelhos eram cortados.
- Os três primeiros segmentos são **sem perda**. Contagens acima de `9999` vermelhos ou `99999` edições são impressas como `9999+` / `99999+` em vez de crescer sem limite; uma contagem não finita ou negativa é impressa como `0`.
- `goal:` é o único segmento com perda. Ele é achatado em uma única linha (quebras de linha e caracteres de controle viram espaços, `|` vira `/`) e recortado pelo orçamento restante, no máximo 40 caracteres, terminando em `…` quando foi recortado. O objetivo completo está em `/doublecheck status` e no relatório de entrega.
- Isto é um relance, não o registro: `/gate status` e `/doublecheck status` mostram o estado completo.

O `stateVersion` da projeção é **3**. Incrementá-lo descarta uma linha de cache de projeção escrita por uma versão anterior e dobra a chave novamente a partir do registro de sessão, de modo que uma sessão atualizada recalcula a linha em vez de mostrar uma obsoleta. O estado dobrado em si não muda, e uma sessão anterior à atualização nunca falha ao carregar.

## Fases do portão

O portão de entrega agrega a evidência durável da sessão em uma lista configurável de quatro fases e assenta uma decisão **entregável / retrabalho necessário**. Cada fase dobra apenas o registro de sessão (a reprodução É o estado), então uma execução é rederivada de forma idêntica após retomar ou bifurcar.

| Fase | Verificações | Fonte de evidência | Custo de modelo |
|---|---|---|---|
| Interrogação de requisitos | Lista de perguntas-chave confirmadas item a item (seis perguntas de dimensão de spec por padrão) | `doublecheck_spec` confirmado + chamadas `ask_user_question` | nenhum |
| Evidência de teste | Cor da última execução, execuções que falham após o verde, limite de cobertura opcional, relatório dsh-eval opcional | Execuções de teste shell no registro de sessão (`[exit code: N]`, percentuais de cobertura); o arquivo de relatório dsh-eval quando `gate.tests.evalReports.enabled` | nenhum |
| Consistência de implementação | Mapeamento diff ↔ requisito: cada edição deve servir a uma dimensão de spec | Revisor bifurcado local (achados estruturados, ferramentas somente leitura) | um subagente |
| Conclusão de revisão | O veredicto de entrega; `engine: auto` consome os registros de veredicto duráveis do dsh-auto-review quando presentes, senão o revisor local | Eventos `autoReview/verdict` / `autoReview/rejection`, ou o revisor bifurcado local | um subagente (local) |

As luzes vermelhas são verificações que falharam (um spec ausente, uma última execução que falhou, cobertura abaixo do mínimo, uma edição sem mapeamento, achados blocker/major) — cada uma carrega uma sugestão de retrabalho. Avisos e pulos nunca invertem a decisão. O portão integra o [dsh-auto-review](https://github.com/PerryLink/dsh-auto-review) como dependência fraca: `review.engine: auto` dobra seus registros de veredicto quando presentes e degrada para o revisor local caso contrário; `gate.tests.evalReports.enabled` dobra o relatório dsh-eval de seu motor de avaliação (suítes de regressão de prompt / estresse / equidade) na evidência de teste e pula honestamente quando não há relatório. O portão nunca sintetiza solicitações de aprovação.

## Relatório de exemplo

`/gate run` retorna este markdown — cole-o na descrição de um PR:

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

## Saída do CI

`/gate run` também grava um `gate-report.json` (o mesmo estado assentado que o JSON sem perda, ao lado de `gate-report.md`). O CLI `doublecheck-gate` converte esse arquivo em saída legível por máquina para o GitHub Actions:

```sh
# JSON (comentário de PR / payload de status)
doublecheck-gate --format json --input gate-report.json
# SARIF 2.1.0 (upload de code-scanning / verificação de status)
doublecheck-gate --format sarif < gate-report.json
```

O CLI apenas serializa o `GateState` já assentado — nunca reexecuta a porta de quatro fases nem as dobras de evidência. Seu código de saída mapeia o veredicto: `0` = entregável, `1` = retrabalho, `2` = erro de uso/análise.

## Permissões e dados

- **Lê**: o registro de sessão (`tool/call` / `tool/result` / `tool/ptc-dispatch`, fontes `user/message` injetadas e os registros de veredicto alheios `autoReview/*`) somente em processo; o estado opcional do serviço de modo plano. Antes da renomeação da V3, o host registra os subenvios PTC com o rótulo predecessor `tool/code-dispatch`; os dois rótulos são dobrados de forma idêntica. Os avisos injetados carregam o kind de fonte de mensagem próprio do pacote, `dsh-doublecheck`; registros anteriores a esse kind chegam como `plugin:dsh-doublecheck` (a reescrita que a migração V3→V4 do host aplica a um invólucro catch-all publicado) ou como o invólucro `plugin` publicado, e as três formas são dobradas igualmente.
- **Escreve**: `doublecheck-spec.md`, `doublecheck-report.md` e `gate-report.md` no workspace da sessão (caminhos configuráveis) por meio da interface `ctx.fs`; os eventos de sessão duráveis `doublecheck/state` e `doublecheck/gate`.
- **Chamadas a modelo**: as fases de consistência e revisão local do portão (um subagente cada por `/gate run`), a revisão adversarial opcional e o fluxo de verificação de `doublecheck_report` iniciam execuções de subagente; nada mais chama um modelo ou a rede.
- **Nunca toca**: credenciais, variáveis de ambiente ou qualquer arquivo fora do workspace da sessão. O manifesto do workshop declara apenas `filesystem:read` e `filesystem:write`. Os relatórios do portão carregam apenas contagens, ids e veredictos; segredos reconhecidos nos textos do revisor são redigidos antes de armazenar ou exibir.

## Limites de segurança

- **Visível ao modelo ⟺ registrado.** Cada lembrete, revisão e aviso de portão injetado viaja pelos canais padrão e cai no registro de sessão; os fatos duráveis spec/state/gate viajam por resultados de ferramenta ou membros de `SessionEventMap`.
- **Falha fechado / falha em voz alta.** A configuração do guard e do portão é validada em `apply` (asserções lançam); uma interface de revisor ou adversário que não pode rodar se assenta como um aviso honesto "unavailable"/pulo em vez de um veredicto falso.
- **Relatórios auditáveis.** Os relatórios de portão e entrega registram apenas contagens, ids e veredictos — sem conteúdos de arquivo ou texto de sessão — e os textos de achados produzidos pelo modelo passam por um redator de segredos antes de armazenar ou exibir.
- **Sem rede própria.** O plugin não faz requisições de rede diretas; os subagentes de crítico e revisor viajam pela interface de subagentes do harness.
- **Dependência fraca do dsh-auto-review.** Nunca é importado nem exigido; o portão dobra seus registros de veredicto duráveis e degrada para o revisor local, e nunca sintetiza solicitações de aprovação.

## Limitações conhecidas

- **Escritas duráveis.** `/doublecheck on\|off` → `doublecheck/state` e `/gate run` → `doublecheck/gate` precisam da superfície de append `ignorable` do host (pós-rc.6 até `0.1.1-rc.2`). Em hosts sem essa superfície (rc.6/rc.8 e `0.1.2-alpha.1`, que removeu o envelope — `0.1.2-rc.1` restaura o campo apenas para compatibilidade de leitura de logs armazenados e ainda não consegue estampá-lo), as escritas são omitidas e o interruptor permanece em processo.
0.1.2-rc.1 (adaptado em 2026-09-02): o envelope de sessão mantém seu campo ignorable apenas para compatibilidade de leitura de logs armazenados - o Session.append ainda não consegue estampá-lo, então o comportamento da porta não muda.
0.1.5-alpha.1 (adaptado em 2026-09-09): o formato de sessão V3 renomeia o evento durável de subenvio `tool/code-dispatch` para `tool/ptc-dispatch` (carga útil inalterada; os dois rótulos são dobrados de forma idêntica). O Session.append continua sem canal `ignorable`, então as escritas duráveis são omitidas e o interruptor permanece em processo - comportamento inalterado. (O namespace de configurações `doublecheck-gate` que essa entrada introduziu foi removido em 0.1.7-alpha.1, quando o host apagou o registro de namespaces.)
0.1.5-rc.1 (adaptado em 2026-09-10): os pinos de dependências passam para a linha publicada 0.1.5-rc.1; nenhuma mudança de interface afeta o comportamento deste plugin.
0.1.5-rc.2 (adaptado em 2026-09-11): os pinos de dependências passam para a linha publicada 0.1.5-rc.2; nenhuma mudança de interface afeta o comportamento deste plugin.
0.1.7-alpha.1 (adaptado em 2026-10-04): o host removeu o kind de fonte de mensagem catch-all compartilhado `plugin` (os avisos agora carregam o kind próprio `dsh-doublecheck`, e a dobra de `remindOnce` continua lendo as duas formas anteriores à atualização que um registro durável pode conter) e substituiu o registro de namespaces de configurações por `SettingsForms` (o namespace `doublecheck-gate` desaparece; a lista do portão passa a ser o único campo `.volatile()` da linha do guard, ainda lido uma vez ao carregar). Os pisos de peers de `@deepseek-ai/cordis` e `@deepseek-ai/schemastery` passam para `^4.0.3` / `^3.18.3` nas dependências de desenvolvimento; os intervalos de peers continuam `^4.0.2` / `^3.18.2` e a capacidade de campos ao vivo é detectada ao carregar, então as linhas de host anteriores ainda montam a linha (sem cartão de configurações). Sem mudança de comportamento além do local de armazenamento das configurações.
- **Interfaces opcionais.** O cartão de configurações da linha do guard aparece quando o serviço de configurações está montado; o cartão é a Config desta própria linha (namespace = seu id de entrada de perfil), e o bloco `gate` é lido uma vez ao carregar, então seus valores valem para o painel `/gate` e o aviso vermelho no próximo carregamento. A capacidade de campos ao vivo é detectada ao carregar: se o schemastery do host for anterior a `.volatile()`, a linha monta mesmo assim — sem cartão, com o bloco `gate` vindo do patch de perfil. A linha de modo plano de `/gate status` lê o `ctx.planMode` opcional (mostra `unknown` sem ele); a revisão adversarial precisa de `ctx.subagents`; a verificação precisa de `workflowEngine`.
- **Degradação local.** `gate.review.engine: auto` degrada para o revisor local quando o dsh-auto-review está ausente ou não tem registros de veredicto nesta sessão — o relatório nomeia a razão em vez de inventar um veredicto.
- **A evidência dsh-eval é baseada em arquivos.** O motor de avaliação do dsh-auto-review (`dsh-eval`) grava seus resultados de regressão de prompt / estresse / equidade em um arquivo de relatório do espaço de trabalho, não no registro de sessão. `gate.tests.evalReports.enabled` dobra esse arquivo (desativado por padrão; pula quando ausente) e as contagens dobradas viajam no registro durável `doublecheck/gate` para que uma execução assentada ainda seja reproduzível.

## Desenvolvimento

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

## Tópicos

`dsh`, `dsh-plugin`, `deepseek-harness`, `engineering-discipline`, `requirements`, `guard`, `skill`, `quality-gate`, `delivery-gate`

## Contribuidores

- [@PerryLink](https://github.com/PerryLink) — criador e mantenedor: o ciclo de disciplina grill → design → red → green → review → verify, o portão de entrega de quatro fases, a documentação em cinco idiomas e o pipeline de CI/publicação.

## Interoperabilidade com outros plugins do DSH

Verificado contra **DSH `0.2.0-rc.2`** (o runtime para o qual este README é publicado) e o conjunto de plugins com mais estrelas pesquisado em 2026-10-05.

Este plugin **não interfere** em outros plugins, incluindo os de mais estrelas:

- **Sem colisão de nome de ferramenta.** Todas as ferramentas têm namespace; nenhuma ocupa um nome puro já pertencente a uma ferramenta embutida ou a outro plugin.
- **Sem colisão de chave de serviço.** Não fornece nenhuma chave de serviço, portanto não pode colidir em uma.
- **Sem colisão de slot.** Não registra nenhuma chave de slot de cliente, então não disputa um assento `shadows-shipped-ui`.
- **Sem colisão de rota HTTP.** Não registra nenhum prefixo `webServer`.
- **Sem colisão na camada de patch.** O patch do bundle apenas faz `insert` da própria linha; nunca sobrescreve o `config` de uma linha embutida.
- **Sem mutação global.** Não altera protótipos, não reescreve `process.env` nem substitui o dispatcher global de fetch.

**Listeners de eventos compartilhados não interferem por construção.** Observa os eventos sensíveis à ordem `agent/turn-stopping`, `tools/post-execute`, `tools/pre-execute` com `ctx.on()` — o registro de difusão do Cordis, onde cada listener executa e nenhum pode privar outro do turno. **Todos os listeners aqui delegam via `next()`**, então a cadeia nunca é curto-circuitada:
  - `tools/post-execute` — also used by `cc-safety-net` (1576★).
  - `tools/pre-execute` — also used by `cc-safety-net` (1576★).

Evidência estática: `dsh-plugin-doctor` K10–K13 retornam `pass` em todas as verificações deste repositório.

## Família de plugins DSH da PerryLink

Este projeto faz parte da família de plugins do DeepSeek Harness da [PerryLink](https://github.com/PerryLink). O registro fica recolhido abaixo para que cada README mantenha uma primeira tela curta; expanda para ver cada linha e seu status.

<details>
<summary>Expandir todos os plugins</summary>

| Plugin | Status |
|---|---|
| **[dsh-aqua-input-check](https://github.com/PerryLink/dsh-aqua-input-check)** |  |
| **[dsh-archive-check](https://github.com/PerryLink/dsh-archive-check)** |  |
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** |  |
| **[dsh-autotier](https://github.com/PerryLink/dsh-autotier)** |  |
| **[dsh-bid-ca-precheck](https://github.com/PerryLink/dsh-bid-ca-precheck)** |  |
| **[dsh-bid-qual-check](https://github.com/PerryLink/dsh-bid-qual-check)** |  |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** |  |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** |  |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** |  |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** |  |
| **[dsh-contract-stance](https://github.com/PerryLink/dsh-contract-stance)** |  |
| **[dsh-customs-doc-check](https://github.com/PerryLink/dsh-customs-doc-check)** |  |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** |  |
| **[dsh-demurrage-ledger](https://github.com/PerryLink/dsh-demurrage-ledger)** |  |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** |  |
| **[dsh-drill-script-check](https://github.com/PerryLink/dsh-drill-script-check)** |  |
| **[dsh-eia-guide-check](https://github.com/PerryLink/dsh-eia-guide-check)** |  |
| **[dsh-emergency-plan](https://github.com/PerryLink/dsh-emergency-plan)** |  |
| **[dsh-essay-rubric-check](https://github.com/PerryLink/dsh-essay-rubric-check)** |  |
| **[dsh-evidence-check](https://github.com/PerryLink/dsh-evidence-check)** |  |
| **[dsh-export-ctl-check](https://github.com/PerryLink/dsh-export-ctl-check)** |  |
| **[dsh-fast](https://github.com/PerryLink/dsh-fast)** |  |
| **[dsh-fmea-table-check](https://github.com/PerryLink/dsh-fmea-table-check)** |  |
| **[dsh-forecast-penalty](https://github.com/PerryLink/dsh-forecast-penalty)** |  |
| **[dsh-fund-research](https://github.com/PerryLink/dsh-fund-research)** |  |
| **[dsh-github](https://github.com/PerryLink/dsh-github)** |  |
| **[dsh-gongwen-flow-check](https://github.com/PerryLink/dsh-gongwen-flow-check)** |  |
| **[dsh-gongwen-word-check](https://github.com/PerryLink/dsh-gongwen-word-check)** |  |
| **[dsh-guard-plan-qc](https://github.com/PerryLink/dsh-guard-plan-qc)** |  |
| **[dsh-hazchem-check](https://github.com/PerryLink/dsh-hazchem-check)** |  |
| **[dsh-hazplan-check](https://github.com/PerryLink/dsh-hazplan-check)** |  |
| **[dsh-hidden-risk-map](https://github.com/PerryLink/dsh-hidden-risk-map)** |  |
| **[dsh-hs-classify](https://github.com/PerryLink/dsh-hs-classify)** |  |
| **[dsh-icd-rule-check](https://github.com/PerryLink/dsh-icd-rule-check)** |  |
| **[dsh-industry-research](https://github.com/PerryLink/dsh-industry-research)** |  |
| **[dsh-lawcite-adapter](https://github.com/PerryLink/dsh-lawcite-adapter)** |  |
| **[dsh-laya](https://github.com/PerryLink/dsh-laya)** |  |
| **[dsh-lc-doc-check](https://github.com/PerryLink/dsh-lc-doc-check)** |  |
| **[dsh-learning-gap-check](https://github.com/PerryLink/dsh-learning-gap-check)** |  |
| **[dsh-library](https://github.com/PerryLink/dsh-library)** |  |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** |  |
| **[dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions)** |  |
| **[dsh-mask](https://github.com/PerryLink/dsh-mask)** |  |
| **[dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel)** |  |
| **[dsh-medrec-qc](https://github.com/PerryLink/dsh-medrec-qc)** |  |
| **[dsh-memento](https://github.com/PerryLink/dsh-memento)** |  |
| **[dsh-nsfc-form-check](https://github.com/PerryLink/dsh-nsfc-form-check)** |  |
| **[dsh-nurse-record-check](https://github.com/PerryLink/dsh-nurse-record-check)** |  |
| **[dsh-observe](https://github.com/PerryLink/dsh-observe)** |  |
| **[dsh-origin-rvc-check](https://github.com/PerryLink/dsh-origin-rvc-check)** |  |
| **[dsh-ota-review-check](https://github.com/PerryLink/dsh-ota-review-check)** |  |
| **[dsh-output-styles](https://github.com/PerryLink/dsh-output-styles)** |  |
| **[dsh-paper-doc-adapter](https://github.com/PerryLink/dsh-paper-doc-adapter)** |  |
| **[dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules)** |  |
| **[dsh-permit-report-check](https://github.com/PerryLink/dsh-permit-report-check)** |  |
| **[dsh-pipeline-check](https://github.com/PerryLink/dsh-pipeline-check)** |  |
| **[dsh-pleading-draft](https://github.com/PerryLink/dsh-pleading-draft)** |  |
| **[dsh-plugin-doctor](https://github.com/PerryLink/dsh-plugin-doctor)** |  |
| **[dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide)** |  |
| **[dsh-plugin-kit](https://github.com/PerryLink/dsh-plugin-kit)** |  |
| **[dsh-plugin-upgrade](https://github.com/PerryLink/dsh-plugin-upgrade)** |  |
| **[dsh-policy-brief-draft](https://github.com/PerryLink/dsh-policy-brief-draft)** |  |
| **[dsh-power-loss-split](https://github.com/PerryLink/dsh-power-loss-split)** |  |
| **[dsh-power-ticket-check](https://github.com/PerryLink/dsh-power-ticket-check)** |  |
| **[dsh-ppap-check](https://github.com/PerryLink/dsh-ppap-check)** |  |
| **[dsh-protest-deadline](https://github.com/PerryLink/dsh-protest-deadline)** |  |
| **[dsh-railway-window](https://github.com/PerryLink/dsh-railway-window)** |  |
| **[dsh-repair-order-qc](https://github.com/PerryLink/dsh-repair-order-qc)** |  |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** |  |
| **[dsh-review-reply-check](https://github.com/PerryLink/dsh-review-reply-check)** |  |
| **[dsh-rulefile-check](https://github.com/PerryLink/dsh-rulefile-check)** |  |
| **[dsh-safety-brief-check](https://github.com/PerryLink/dsh-safety-brief-check)** |  |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** |  |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** |  |
| **[dsh-site-log-check](https://github.com/PerryLink/dsh-site-log-check)** |  |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** |  |
| **[dsh-soe-decision-check](https://github.com/PerryLink/dsh-soe-decision-check)** |  |
| **[dsh-soilwater-check](https://github.com/PerryLink/dsh-soilwater-check)** |  |
| **[dsh-sop-sync-check](https://github.com/PerryLink/dsh-sop-sync-check)** |  |
| **[dsh-spc-gbt-adapter](https://github.com/PerryLink/dsh-spc-gbt-adapter)** |  |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** |  |
| **[dsh-tender-extract](https://github.com/PerryLink/dsh-tender-extract)** |  |
| **[dsh-tender-matrix](https://github.com/PerryLink/dsh-tender-matrix)** |  |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** |  |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** |  |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** |  |
| **[dsh-warranty-calc](https://github.com/PerryLink/dsh-warranty-calc)** |  |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | 🚫 RETIRADO — ver o README do repositório |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | 🚫 RETIRADO — ver o README do repositório |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | 🚫 RETIRADO — ver o README do repositório |

</details>

## Licença

[Apache License 2.0](LICENSE) © 2026 dsh-doublecheck contributors
