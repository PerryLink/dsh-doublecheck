<div align="center">

# dsh-doublecheck
- **Canal 1024 store**: `npm i -g dsh1024` uma vez, depois `dsh1024 plugin --profile web add dsh-doublecheck` (conta para o ranking de instalações do [deepseek1024.com](https://deepseek1024.com)).

**O portão de qualidade de entrega para o DeepSeek Harness: interrogue os requisitos, teste a implementação, comprove a entrega — e então controle a passagem com uma decisão de entregável / retrabalho necessário.**

*Os requisitos são interrogados antes da primeira edição; a entrega é comprovada, nunca afirmada.*

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![DSH plugin](https://img.shields.io/badge/dsh--plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![dsh-doctor](https://raw.githubusercontent.com/PerryLink/dsh-plugin-doctor/main/badges/PerryLink__dsh-doublecheck.svg)](https://github.com/PerryLink/dsh-plugin-doctor#verified-徽章)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-doublecheck/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-doublecheck/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-doublecheck?label=version)](https://github.com/PerryLink/dsh-doublecheck/releases)
[![npm version](https://img.shields.io/npm/v/dsh-doublecheck)](https://www.npmjs.com/package/dsh-doublecheck)
[![npm downloads](https://img.shields.io/npm/dm/dsh-doublecheck)](https://www.npmjs.com/package/dsh-doublecheck)

[English](README.md) · [简体中文](README.zh.md) · [Español](README.es.md) · [Português](README.pt.md) · [हिन्दी](README.hi.md)

</div>

---

## Compatibilidade

| Superfície | Status |
|---|---|
| Harness | DeepSeek Harness `dsh-v0.1.5-alpha.1`. Verificado em 2026-09-09 contra o checkout master `dsh-v0.1.5-alpha.1` (cadeia completa de portões + smoke de instalação do perfil); a linha publicada `0.1.2-rc.1` continua suportada. |
| Node | `^22.19.0 \|\| >=24.0.0` |
| Plataformas | Todas (host puro; sem código nativo, sem requisições de rede diretas próprias) |
| Modelo | Qualquer (o guard nunca chama um modelo; as fases de crítico e revisor rodam como subagentes do harness) |

## O que você obtém

`dsh-doublecheck` instala duas linhas de plugin que leem e aplicam a partir do mesmo registro de sessão durável:

1. **`doublecheck-grill`** — o forno de requisitos: a skill empacotada `grill-requirements` mais as ferramentas voltadas ao modelo `doublecheck_skills`, `doublecheck_spec` e `doublecheck_report`, e o fluxo de verificação por dimensão.
2. **`doublecheck-guard`** — o guard de disciplina: o portão grill, os portões de evidência vermelho/verde, a revisão adversarial, os comandos `/doublecheck` e `/gate`, o namespace de configurações `doublecheck-gate` e o portão de entrega de quatro fases.

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
# 1. install the bundle into your profile
dsh plugin --profile web add "github:PerryLink/dsh-doublecheck#main"

# or from npm (published releases)
dsh plugin --profile web add dsh-doublecheck

# 2. restart and verify the row
dsh --profile web --dump-config | grep -E -A3 'id: doublecheck-(grill|guard)'
```

Ambas as linhas (`doublecheck-grill` e `doublecheck-guard`) são ativadas automaticamente com o perfil.

## Instalar e desinstalar

- **canal git** (última `main`): `dsh plugin --profile web add "github:PerryLink/dsh-doublecheck#main"` — o script `prepare` compila apenas com dependências de produção.
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
| `doublecheck-gate` | namespace de configurações | A lista plugável: a seção do usuário substitui os valores `gate.*` da composição e é lida uma vez ao carregar (`applies: restart`), visível via `ctx.settings.describe()`. |
| `strict.patch.yml` | camada de sobreposição | Cada portão ativo com intensidade `block` mais o requisito de cobertura, em uma camada de patch. |
| `dsh-doublecheck/invariant` | linha acompanhante | Reporta contradições de caminho de escrita próprias do pacote por meio do registro `invariants` do host. |

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

- **Lê**: o registro de sessão (`tool/call` / `tool/result` / `tool/ptc-dispatch`, fontes `user/message` injetadas e os registros de veredicto alheios `autoReview/*`) somente em processo; o estado opcional do serviço de modo plano. Antes da renomeação da V3, o host registra os subenvios PTC com o rótulo predecessor `tool/code-dispatch`; os dois rótulos são dobrados de forma idêntica.
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
0.1.5-alpha.1 (adaptado em 2026-09-09): o formato de sessão V3 renomeia o evento durável de subenvio `tool/code-dispatch` para `tool/ptc-dispatch` (carga útil inalterada; os dois rótulos são dobrados de forma idêntica). O Session.append continua sem canal `ignorable`, então as escritas duráveis são omitidas e o interruptor permanece em processo - comportamento inalterado. O namespace de configurações `doublecheck-gate` é uma interface fraca, resolvida ao carregar (ver Limitações conhecidas).
- **Interfaces opcionais.** O namespace de configurações `doublecheck-gate` é registrado apenas quando o serviço de configurações está montado; então aparece em `ctx.settings.describe()` e sua seção do usuário substitui os valores `gate.*` da composição no próximo carregamento (o pacote não inclui cartão de cliente, então a página de plugins da Web GUI não o lista); a linha de modo plano de `/gate status` lê o `ctx.planMode` opcional (mostra `unknown` sem ele); a revisão adversarial precisa de `ctx.subagents`; a verificação precisa de `workflowEngine`.
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

## PerryLink DSH Plugin Family

Este projeto é um dos [37 plugins de DeepSeek Harness](https://github.com/PerryLink) mantidos por [PerryLink](https://github.com/PerryLink). Se este ajuda você, os outros provavelmente também:

| Plugin | One-liner |
|---|---|
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** | Auto-revisão de segundo modelo na cadeia de aprovação, com falha fechada por padrão | |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | Agentes filhos em segundo plano duráveis com barra lateral de UI web, mensagens e interrupção | |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | Governança de custos para DeepSeek Harness: orçamentos, carbono e latência em um painel. | |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** | Equivalente ao /rewind do Claude Code: instantâneos, bifurcações de sessão, restauração de uso único | |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | Migre sessões, memória, habilidades e CLAUDE.md do Claude Code para o DSH | |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** | Controle de desktop nativo multiplataforma para DeepSeek Harness — Windows primeiro. | |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** | Histórico de entrada estilo terminal para o compositor web: setas, busca Ctrl+R | |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** | Verificações de qualidade de datasets e verificação de citações (a ponte numérica opcional consumida aqui) | |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | Defesa contra injeção de prompt, jailbreak e vazamento de segredos para DeepSeek Harness. | |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | Roteamento unificado de geração de imagens estáticas para DeepSeek Harness. | |
| **[dsh-fast](https://github.com/PerryLink/dsh-fast)** | Diagnóstico de desempenho só de leitura para DeepSeek Harness. | |
| **[dsh-fund-research](https://github.com/PerryLink/dsh-fund-research)** | Relatórios de pesquisa deterministas para fundos mútuos públicos chineses | |
| **[dsh-github](https://github.com/PerryLink/dsh-github)** | Integração de PR/issues do GitHub para o DSH, cada escrita controlada por aprovação | |
| **[dsh-industry-research](https://github.com/PerryLink/dsh-industry-research)** | Orquestração de pesquisa setorial que sela as suas entregas através do `ctx.researchReport.assemble` deste plugin | |
| **[dsh-library](https://github.com/PerryLink/dsh-library)** | Base de conhecimento documental local para DeepSeek Harness. | |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** | Integração de modelos locais (Ollama) para DeepSeek Harness. | |
| **[dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions)** | Diagnósticos, formatação, autocompletar, ações de código e renomeação LSP sobre servidores de linguagem | |
| **[dsh-mask](https://github.com/PerryLink/dsh-mask)** | Middleware de mascaramento de PII: anonimiza no limite do modelo, restaura na camada de exibição | |
| **[dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel)** | Painel de tempo de execução MCP somente leitura: comando /mcp + aba Settings com status, ferramentas e erros | |
| **[dsh-memento](https://github.com/PerryLink/dsh-memento)** | Memória entre sessões controlada por aprovação: costura ctx.memory + SQLite + ferramenta de memória | |
| **[dsh-observe](https://github.com/PerryLink/dsh-observe)** | Exportador de observabilidade OpenTelemetry e Langfuse para DeepSeek Harness. | |
| **[dsh-output-styles](https://github.com/PerryLink/dsh-output-styles)** | Troca de estilo em tempo de execução equivalente ao outputStyles do Claude Code | |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | Ponte multicanal de aprovação/perguntas: WeChat/Telegram/Feishu, console de sessão |
| **[dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules)** | Regras de permissão declarativas allow/deny/ask estilo Claude Code com auditoria | |
| **[dsh-personal-directive](https://github.com/PerryLink/dsh-personal-directive)** | Injetor de diretivas pessoais com alternância na barra superior (edição framework) |
| **[dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide)** | Base de conhecimento de desenvolvimento de plugins como habilidade de agente sob demanda | |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** | Motor de relatórios de pesquisa verificáveis com evidência endereçada por conteúdo | |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** | Pontuação de qualidade multidimensional para plugins de DeepSeek Harness. | |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | Fixe sessões na barra lateral web com ordenação durável | |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** | Sincronização de sessões entre dispositivos para DeepSeek Harness — um espelho git dedicado do seu armazenamento de sessões. | |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** | Pacote de habilidades de auditoria de segurança: varredura de segredos, revisão de dependências e cadeia de suprimentos | |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** | Loop de sessão com voz para DeepSeek Harness: fale e ouça a resposta. | |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** | Test drives isolados de instalação e smoke para plugins de DeepSeek Harness. | |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** | Ponte de tarefas TickTick/Dida365: painel no cabeçalho da sessão + 11 ferramentas |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** | Tradução de parâmetros entre fornecedores e reparo determinístico de JSON para DeepSeek Harness. | |
| **[dsh-wechat](https://github.com/PerryLink/dsh-wechat)** | Ponte WeChat ↔ DSH (bot Tencent iLink): texto/imagem/arquivo/voz, aprovações no chat |

### Instalar a partir do mercado do DSH Desktop

Todos os plugins PerryLink podem ser explorados no mercado integrado do DSH Desktop: **Market → Sources → add source → colar** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ selecionar**. A instalação continua passando pela verificação de identidade npm do mercado e pela sua confirmação.

## Licença

[Apache License 2.0](LICENSE) © 2026 dsh-doublecheck contributors
