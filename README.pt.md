# dsh-doublecheck

> **Verifique duas vezes antes de publicar: interrogue os requisitos, teste a implementação, comprove a entrega.**

[![license](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)
[![version](https://img.shields.io/badge/dsh-0.1.0--rc.6-8A2BE2)](https://www.npmjs.com/package/@deepseek-ai/dsh)
[![topic](https://img.shields.io/badge/topic-dsh--plugin-22c55e)](https://github.com/topics/dsh-plugin)

Um **bundle de disciplina de engenharia** para o [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). Agentes adoram começar a codar; requisitos odeiam ser presumidos. O `dsh-doublecheck` instala um ciclo de disciplina que faz o agente **interrogar os requisitos antes da primeira edição e comprovar a entrega em vez de afirmá-la** — reimplementado de forma nativa nos pontos de extensão do próprio DSH (registro de skills, pipeline de políticas de ferramentas, seam de aprovação, log de sessão), sem arquivos de prompt emprestados.

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
| **red** | Um teste que falha comprova a lacuna. | 🔜 v0.2 |
| **green** | A correção o faz passar; o log comprova a ordem. | 🔜 v0.2 |
| **review** | Um crítico adversário revisa a entrega (`adversaryModel`). | 🔜 v0.3 |
| **verify** | Orquestração de workflow + relatório doublecheck consolidado. | 🔜 v0.4 |

## Recursos (v0.1)

- 🔥 **Skill `grill-requirements`** — um skill empacotado no formato Agent Skills que interroga a tarefa em seis dimensões (**objetivo, escopo, critérios de aceite, modos de falha, prioridades, não-objetivos**) usando a UI nativa `ask_user_question` do DSH, recusa escrever código até o consenso e registra o contrato.
- 📜 **Ferramenta `doublecheck_spec`** — grava o spec acordado no log da sessão e escreve uma cópia em markdown no workspace, para o contrato sobreviver à conversa.
- 🛡️ **Guard de disciplina** — um portão suave no pipeline de políticas de ferramentas. Tarefa vaga + sem spec + rumo a `edit`/`write` → **lembrar**, **pedir aprovação humana** ou **bloquear**, conforme `intensity`.
- 🔁 **Estado durável** — todo artefato visível ao modelo (spec, lembretes, feedback de negação) fica no log da sessão; as decisões do guard derivam só do log, então sessões retomadas ou bifurcadas se comportam igual.
- 📚 **Ferramenta `doublecheck_skills`** — lista e carrega os skills do pacote pelo seam oficial do registro de skills.

## Instalação

```sh
dsh plugin --profile <name> add dsh-doublecheck
dsh --profile <name> --dump-config   # espere uma camada "# == dsh-doublecheck"
```

As duas linhas de plugin ativam automaticamente com o profile. Instalação por tarball também funciona:

```sh
pnpm pack
dsh plugin --profile <name> add ./dsh-doublecheck-0.1.0.tgz
```

## Configuração

Sobrescreva qualquer linha **por id** no `cordis.patch.yml` do profile. Um patch substitui toda a config da linha — reescreva todas as chaves:

```yaml
- id: doublecheck-grill
  config:
    specFile: 'specs/doublecheck-spec.md'   # padrão: 'doublecheck-spec.md'

- id: doublecheck-guard
  config:
    intensity: warn
    modules:
      grill: true
      tdd: false        # reservado para v0.2 — deve ser false na v0.1
      adversary: false  # reservado para v0.3 — deve ser false na v0.1
    adversaryModel: null
    guardTools: ['edit', 'write']
    vagueTaskMaxChars: 200
    remindOnce: true
```

### `intensity`

| Valor | Comportamento diante de `edit`/`write` vago e sem spec |
|---|---|
| `remind` (padrão) | A chamada prossegue; um lembrete viaja no contexto do resultado para a próxima requisição do modelo. |
| `warn` | A chamada fica retida aguardando aprovação humana única pelo seam de aprovação (nega quando não há canal). |
| `block` | A chamada é negada com feedback que orienta o modelo a interrogar primeiro. |

### Ajustes

| Chave | Padrão | Significado |
|---|---|---|
| `modules.grill` | `true` | `false` desativa o guard. O interruptor dos skills/ferramentas grill é o flag `disabled` da linha deles. |
| `guardTools` | `['edit', 'write']` | Nomes de ferramentas de mutação que o guard vigia. |
| `vagueTaskMaxChars` | `200` | Tarefas mais longas nunca são tratadas como vagas. Tarefas breves que citam arquivo, caminho ou URL são concretas. |
| `remindOnce` | `true` | Injetar o lembrete no máximo uma vez por sessão. |
| `adversaryModel` | `null` | Reservado para o crítico da v0.3; `null` = o modelo principal se autorrevisa. Valor não nulo falha ao carregar na v0.1. |

Configuração errada falha em voz alta: ativar um módulo reservado ou definir `adversaryModel` lança erro no carregamento, em vez de não fazer nada em silêncio.

## Como funciona (pontos de extensão)

| Contribuição | Mecanismo DSH |
|---|---|
| Skills empacotados | `ctx.skills.registerProvider()` — seam de capacidade de skills, `source: bundled` |
| Ferramenta de catálogo/carga | `ctx.tools.register()` — `doublecheck_skills` |
| Spec + arquivo no workspace | ferramenta `doublecheck_spec` + escrita opcional via `ctx.fs` |
| Portão de requisitos | waterfall `tools/pre-execute` — `allow` / `ask` (seam de aprovação) / `deny` |
| Injeção de lembrete | waterfall `tools/post-execute` — `additionalContexts` → registrado como `user/message` |
| Estado durável | dobra do log sobre `tool/call` + `tool/result`; visível ao modelo ⟺ registrado |
| Eventos internos | `doublecheck/spec`, `doublecheck/reminder` (tipados via declaration merging, `@mode emit`) |

Sem mudanças no agent-loop. Todo registro é um `ctx.effect` / `ctx.on` / `register()` de serviço reversível.

## O que o modelo vê

- O skill `grill-requirements` entra no catálogo de skills da sessão e carrega pela ferramenta integrada `skill` (ou `doublecheck_skills`).
- `ask_user_question` continua sendo a forma nativa do DSH de perguntar ao usuário; o skill só coreografa (e em headless sem provider degrada para perguntas em prosa).
- Os lembretes chegam como contexto `{kind:'plugin'}`, então as UIs de transcrição os exibem como metadados de injeção.

## Roadmap

- **v0.2** — portões de evidência red/green: verificação no log de que um teste que falha precedeu a correção.
- **v0.3** — módulo adversary: um subagente crítico revisa a entrega; `adversaryModel` escolhe a rota.
- **v0.4** — orquestração de workflow e relatório doublecheck consolidado.

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
