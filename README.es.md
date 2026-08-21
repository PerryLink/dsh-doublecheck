<div align="center">

# dsh-doublecheck

**La puerta de calidad de entrega para DeepSeek Harness: interroga los requisitos, prueba la implementación, demuestra la entrega — y controla el traspaso con una decisión de entregable / rehacer.**

*Los requisitos se interrogan antes de la primera edición; la entrega se demuestra, nunca se afirma.*

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![DSH plugin](https://img.shields.io/badge/dsh-plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-doublecheck/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-doublecheck/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-doublecheck?label=version)](https://github.com/PerryLink/dsh-doublecheck/releases)
[![npm version](https://img.shields.io/npm/v/dsh-doublecheck)](https://www.npmjs.com/package/dsh-doublecheck)
[![npm downloads](https://img.shields.io/npm/dm/dsh-doublecheck)](https://www.npmjs.com/package/dsh-doublecheck)

[English](README.md) · [简体中文](README.zh.md) · [Español](README.es.md) · [Português](README.pt.md) · [हिन्दी](README.hi.md)

</div>

---

## Compatibilidad

| Superficie | Estado |
|---|---|
| Harness | DeepSeek Harness `0.1.0-rc.8` |
| Node | `^22.19.0 \|\| >=24.0.0` |
| Plataformas | Todas (host puro; sin código nativo, sin solicitudes de red directas propias) |
| Modelo | Cualquiera (el guard nunca llama a un modelo; las fases de crítico y revisor se ejecutan como subagentes del harness) |

## Qué obtienes

`dsh-doublecheck` instala dos filas de plugin que leen y aplican desde el mismo registro de sesión durable:

1. **`doublecheck-grill`** — el horno de requisitos: la skill empaquetada `grill-requirements` más las herramientas orientadas al modelo `doublecheck_skills`, `doublecheck_spec` y `doublecheck_report`, y el flujo de verificación por dimensión.
2. **`doublecheck-guard`** — el guard de disciplina: la puerta grill, las puertas de evidencia rojo/verde, la revisión adversarial, los comandos `/doublecheck` y `/gate`, el espacio de ajustes `doublecheck.gate` y la puerta de entrega de cuatro fases.

Juntos imponen el **bucle de disciplina** — *grill → design → red → green → review → verify*:

```text
grill ──▶ design ──▶ red ──▶ green ──▶ review ──▶ verify
   │
   └─ seis dimensiones de requisitos, puerta de consenso,
      spec estructurado confirmado en la sesión + el workspace
```

| Etapa | Significado |
|---|---|
| **grill** | Interroga las seis dimensiones de requisitos; se niega a implementar hasta el consenso. |
| **design** | El spec acordado se confirma mediante `doublecheck_spec`. |
| **red** | Una ejecución de prueba fallida demuestra la brecha antes de las ediciones de implementación. |
| **green** | Una ejecución de prueba aprobada tras las ediciones cierra el bucle. |
| **review** | Un crítico adversarial bifurcado audita la entrega contra el spec. |
| **verify** | `doublecheck_report` + un flujo de verificación por dimensión demuestran la entrega. |

## Inicio rápido

```sh
# 1. install the bundle into your profile
dsh plugin --profile web add "github:PerryLink/dsh-doublecheck#main"

# or from npm (published releases)
dsh plugin --profile web add dsh-doublecheck

# 2. restart and verify the row
dsh --profile web --dump-config | grep -E -A3 'id: doublecheck-(grill|guard)'
```

Ambas filas (`doublecheck-grill` y `doublecheck-guard`) se activan automáticamente con el perfil.

## Instalación y desinstalación

- **canal git** (última `main`): `dsh plugin --profile web add "github:PerryLink/dsh-doublecheck#main"` — el script `prepare` compila solo con dependencias de producción.
- **canal npm** (versiones publicadas): `dsh plugin --profile web add dsh-doublecheck`.
- **canal tarball**: `pnpm pack` en este repo y luego `dsh plugin --profile web add ./dsh-doublecheck-<version>.tgz`.
- **desinstalar**: `dsh plugin --profile web remove dsh-doublecheck` (o elimina las filas del parche de perfil).

Para un modo estricto sin configuración (cada puerta activa con intensidad `block`, cobertura de la puerta requerida), aplica la capa superpuesta incluida sobre el parche del bundle: `dsh --profile web --patch ./node_modules/dsh-doublecheck/strict.patch.yml`.

## Configuración

Todos los ajustes son campos `Config` de Schemastery (modificables desde cordis.yml). Una sobrescritura dirigida por id reemplaza la fila completa — vuelve a declarar cada clave que necesites. `cordis.patch.yml` documenta cada clave en línea; los valores por defecto del Schema son la única fuente de los valores de ajuste.

| Clave | Predeterminado | Significado |
|---|---|---|
| `specFile` | `'doublecheck-spec.md'` | Archivo del workspace para el markdown del spec confirmado (fila grill). |
| `reportFile` | `'doublecheck-report.md'` | Archivo del workspace para el informe de entrega (fila grill). |
| `reportVerify` | `true` | Ejecutar el flujo de verificación por defecto (fila grill). |
| `verifyProvider` | `'fork'` | Proveedor de subagente para los verificadores por dimensión (fila grill). |
| `verifyMode` | `'all'` | `all` = un verificador paralelo por dimensión; `single` = un verificador combinado (fila grill). |
| `intensity` | `'remind'` | Fuerza de aplicación de las puertas grill, rojo/verde y de revisión (`remind` / `warn` / `block`). |
| `enableByDefault` | `true` | Interruptor maestro para sesiones sin registro `/doublecheck on\|off`. |
| `language` | `'en'` | Idioma de la prosa inyectada de recordatorio/denegación/revisión/puerta (`en` / `zh`). |
| `guardTools` | `['edit', 'write']` | Nombres de herramientas de mutación que vigilan ambas puertas. |
| `vagueTaskMaxChars` | `200` | Las tareas más largas nunca se tratan como vagas. |
| `remindOnce` | `true` | Inyecta cada recordatorio como máximo una vez por sesión (durable entre reinicios). |
| `testToolNames` | `['bash', 'pwsh']` | Nombres de herramientas shell que pueden ejecutar pruebas. |
| `testCommandPatterns` | *(pnpm/npm/yarn/bun test, pytest, go/cargo/make test, node --test, deno test, uv run pytest)* | Regex que un comando debe coincidir para contar como ejecución de prueba. |
| `testFilePatterns` | *(dirs de prueba, `*.test.*` / `*.spec.*`)* | Regex que identifican archivos de prueba — siempre editables, exentos de la puerta roja. |
| `modules.grill` | `true` | Apagado desactiva la puerta grill. |
| `modules.tdd` | `true` | Encendido habilita las puertas de evidencia rojo/verde. |
| `modules.adversary` | `false` | Encendido habilita la revisión de crítico bifurcado en verde. |
| `adversaryModel` | `null` | Ruta de modelo del crítico; `null` = el modelo principal se autorevisa. |
| `adversaryProvider` | `'fork'` | Proveedor de subagente sobre el que corre el crítico. |
| `adversaryMaxFindings` | `5` | Límite de hallazgos (1–20) inyectados en la sesión. |
| `adversaryTools` | `['read', 'glob', 'grep']` | Lista permitida de herramientas del crítico; mantenla de solo lectura. |
| `adversaryTimeoutMs` | `120000` | Presupuesto de tiempo duro para una ejecución del crítico. |
| `gate.enabled` | `true` | Interruptor maestro del panel de la puerta y el aviso rojo de límite de turno. |
| `gate.planSuggestion` | `true` | Añade la sugerencia de re-verificación en modo plan a los informes rojos. |
| `gate.reportFile` | `'gate-report.md'` | Archivo del workspace para el informe de la puerta. |
| `gate.requirements.checklist` | *(seis preguntas de dimensión de spec)* | Lista de preguntas clave enchufable: `{ id, question, specDimension, required }`. |
| `gate.requirements.minConfirmed` | `6` | Preguntas obligatorias mínimas que deben aprobar (1..cantidad obligatoria). |
| `gate.requirements.interrogateTool` | `'ask_user_question'` | Nombre de herramienta cuyas llamadas cuentan como evidencia de interrogatorio. |
| `gate.tests.requirePassingRun` | `true` | Una última ejecución de prueba no aprobada (o ausente) es una luz roja. |
| `gate.tests.allowFailingRuns` | `0` | Ejecuciones fallidas tras el último verde permitidas antes del rojo. |
| `gate.tests.requireCoverage` | `false` | Encendido exige evidencia de cobertura en la salida de prueba. |
| `gate.tests.minCoveragePct` | `80` | Porcentaje mínimo de cobertura (0–100). |
| `gate.consistency.*` | `provider: 'fork'`, `model: null`, `tools: ['read','glob','grep']`, `timeoutMs: 120000`, `maxFindings: 5` | Ajustes del revisor local de consistencia (`model: null` = modelo principal). |
| `gate.review.engine` | `'auto'` | `auto` = registros de veredicto de dsh-auto-review cuando están presentes, si no el revisor local; `local` = siempre local. |
| `gate.review.provider` | `'fork'` | Proveedor del revisor local de revisión (su `model`/`tools`/`timeoutMs`/`maxFindings` coinciden con `gate.consistency.*`). |

La mala configuración falla en voz alta al cargar: regex inválidas, listas de nombres vacías o duplicadas, umbrales fuera de rango e ids de lista duplicados lanzan error en lugar de no hacer nada en silencio. `strict.patch.yml` es la capa de todas las puertas en bloqueo que vuelve a declarar la fila guard con `intensity: block`, todos los módulos activos y el requisito de cobertura habilitado.

## Herramientas y superficies

| Superficie | Tipo | Notas |
|---|---|---|
| `doublecheck_skills` | herramienta | Lista y carga las cuatro skills empaquetadas a través de la interfaz del registro de skills. |
| `doublecheck_spec` | herramienta | Confirma el spec de seis dimensiones en el registro de sesión y una copia markdown del workspace. |
| `doublecheck_report` | herramienta | Pliega la evidencia de disciplina en un informe de entrega (flujo de verificación por dimensión opcional). |
| `/doublecheck status\|report\|on\|off` | comando | Interruptor, módulos, intensidad, hechos de etapa, informe plegado y la sobrescritura durable on/off. |
| `/gate status\|run\|config` | comando | Progreso de la lista en vivo, el informe entregable/rehacer asentado y la configuración efectiva. |
| `grill-requirements`, `red-green-tdd`, `delivery-review`, `delivery-proof` | skill | Skills de disciplina empaquetadas que cubren las seis etapas del bucle. |
| `doublecheck.gate` | espacio de ajustes | La lista enchufable, expuesta a UIs con ajustes (`expose: true`, `applies: restart`). |
| `strict.patch.yml` | capa superpuesta | Cada puerta activa con intensidad `block` más el requisito de cobertura, en una capa de parche. |
| `dsh-doublecheck/invariant` | fila acompañante | Informa contradicciones de ruta de escritura propias del paquete a través del registro `invariants` del host. |

## Fases de la puerta

La puerta de entrega agrega la evidencia durable de la sesión en una lista configurable de cuatro fases y asienta una decisión **entregable / rehacer requerido**. Cada fase pliega solo el registro de sesión (la reproducción ES el estado), por lo que una ejecución se vuelve a derivar idénticamente tras reanudar o bifurcar.

| Fase | Comprobaciones | Fuente de evidencia | Costo de modelo |
|---|---|---|---|
| Interrogatorio de requisitos | Lista de preguntas clave confirmadas una a una (seis preguntas de dimensión de spec por defecto) | `doublecheck_spec` confirmado + llamadas `ask_user_question` | ninguno |
| Evidencia de prueba | Color de la última ejecución, ejecuciones fallidas tras el verde, umbral de cobertura opcional | Ejecuciones de prueba shell en el registro de sesión (`[exit code: N]`, porcentajes de cobertura) | ninguno |
| Consistencia de implementación | Mapeo diff ↔ requisito: cada edición debe servir a una dimensión de spec | Revisor bifurcado local (hallazgos estructurados, herramientas de solo lectura) | un subagente |
| Conclusión de revisión | El veredicto de entrega; `engine: auto` consume los registros de veredicto durables de dsh-auto-review cuando están presentes, si no el revisor local | Eventos `autoReview/verdict` / `autoReview/rejection`, o el revisor bifurcado local | un subagente (local) |

Las luces rojas son comprobaciones fallidas (un spec ausente, una última ejecución fallida, cobertura bajo el mínimo, una edición sin mapear, hallazgos blocker/major) — cada una lleva una sugerencia de retrabajo. Las advertencias y los saltos nunca invierten la decisión. La puerta integra [dsh-auto-review](https://github.com/PerryLink/dsh-auto-review) como dependencia débil: `review.engine: auto` pliega sus registros de veredicto cuando están presentes y degrada al revisor local en caso contrario; la puerta nunca sintetiza solicitudes de aprobación.

## Informe de ejemplo

`/gate run` devuelve este markdown — pégalo en la descripción de un PR:

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

## Permisos y datos

- **Lee**: el registro de sesión (`tool/call` / `tool/result` / `tool/code-dispatch`, fuentes `user/message` inyectadas y los registros de veredicto ajenos `autoReview/*`) solo en proceso; el estado opcional del servicio de modo plan.
- **Escribe**: `doublecheck-spec.md`, `doublecheck-report.md` y `gate-report.md` en el workspace de sesión (rutas configurables) a través de la interfaz `ctx.fs`; los eventos de sesión durables `doublecheck/state` y `doublecheck/gate`.
- **Llamadas a modelo**: las fases de consistencia y revisión local de la puerta (un subagente cada una por `/gate run`), la revisión adversarial opcional y el flujo de verificación de `doublecheck_report` inician ejecuciones de subagente; nada más llama a un modelo o a la red.
- **Nunca toca**: credenciales, variables de entorno o cualquier archivo fuera del workspace de sesión. El manifiesto del workshop declara solo `filesystem:read` y `filesystem:write`. Los informes de la puerta llevan solo conteos, ids y veredictos; los secretos reconocidos en los textos del revisor se redactan antes de almacenarlos o mostrarlos.

## Límites de seguridad

- **Visible para el modelo ⟺ registrado.** Cada recordatorio, revisión y aviso de puerta inyectado viaja por los canales estándar y cae en el registro de sesión; los hechos durables spec/state/gate viajan por resultados de herramienta o miembros de `SessionEventMap`.
- **Falla cerrado / falla en voz alta.** La configuración del guard y de la puerta se valida en `apply` (las aserciones lanzan); una interfaz de revisor o adversario que no puede ejecutarse se asienta como un aviso honesto "unavailable"/salto en lugar de un veredicto falso.
- **Informes auditables.** Los informes de puerta y entrega registran solo conteos, ids y veredictos — sin contenidos de archivo ni texto de sesión — y los textos de hallazgos producidos por el modelo pasan un redactor de secretos antes de almacenarlos o mostrarlos.
- **Sin red propia.** El plugin no hace solicitudes de red directas; los subagentes de crítico y revisor viajan por la interfaz de subagentes del harness.
- **Dependencia débil de dsh-auto-review.** Nunca se importa ni se exige; la puerta pliega sus registros de veredicto durables y degrada al revisor local, y nunca sintetiza solicitudes de aprobación.

## Limitaciones conocidas

- **Escrituras durables.** `/doublecheck on\|off` → `doublecheck/state` y `/gate run` → `doublecheck/gate` necesitan la superficie de append `ignorable` del host (post-rc.6), que todo host compatible (≥ `0.1.0-rc.8`) proporciona.
- **Interfaces opcionales.** El espacio de ajustes `doublecheck.gate` se registra solo cuando el servicio de ajustes está montado; la línea de modo plan de `/gate status` lee el `ctx.planMode` opcional (muestra `unknown` sin él); la revisión adversarial necesita `ctx.subagents`; la verificación necesita `workflowEngine`.
- **Degradación local.** `gate.review.engine: auto` degrada al revisor local cuando dsh-auto-review está ausente o no tiene registros de veredicto en esta sesión — el informe nombra la razón en lugar de inventar un veredicto.

## Desarrollo

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

## Temas

`dsh`, `dsh-plugin`, `deepseek-harness`, `engineering-discipline`, `requirements`, `guard`, `skill`, `quality-gate`, `delivery-gate`

## Contribuidores

- [@PerryLink](https://github.com/PerryLink) — creador y mantenedor: el bucle de disciplina grill → design → red → green → review → verify, la puerta de entrega de cuatro fases, la documentación en cinco idiomas y el pipeline de CI/publicación.

## PerryLink DSH Plugin Family

Este proyecto es uno de los [15 complementos de DeepSeek Harness](https://github.com/PerryLink) mantenidos por [PerryLink](https://github.com/PerryLink). Si este te ayuda, los demás probablemente también:

| Plugin | One-liner |
|---|---|
| [dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel) | Read-only MCP runtime panel: /mcp command + Settings tab with status, tools and errors |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** | Engineering-discipline guard + delivery quality gate: requirements grill, test gates, adversary review, /gate deliverable/rework panel |
| [dsh-background-agents](https://github.com/PerryLink/dsh-background-agents) | Durable background child agents with a Web UI sidebar, messaging and interrupt |
| [dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions) | LSP diagnostics, formatting, completion, code actions and rename over language servers |
| [dsh-output-styles](https://github.com/PerryLink/dsh-output-styles) | Claude Code outputStyles-equivalent runtime style switching |
| [dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind) | Claude Code /rewind-equivalent: snapshots, session forks, one-shot restore |
| [dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules) | Claude Code-style declarative allow/deny/ask permission rules with audit |
| [dsh-auto-review](https://github.com/PerryLink/dsh-auto-review) | Second-model auto-review on the approval chain, fail-closed by default |
| [dsh-memento](https://github.com/PerryLink/dsh-memento) | Approval-gated cross-session memory: ctx.memory seam + SQLite + memory tool |
| [dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security) | Security-audit skill pack: secret scan, dependency and supply-chain review |
| [dsh-session-pin](https://github.com/PerryLink/dsh-session-pin) | Pin sessions in the Web sidebar with durable ordering |
| [dsh-composer-history](https://github.com/PerryLink/dsh-composer-history) | Terminal-style input history for the web composer: arrows, Ctrl+R search |
| [dsh-github](https://github.com/PerryLink/dsh-github) | GitHub PR/issues integration for DSH, every write gated by approval |
| [dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide) | Plugin-development knowledge base as an on-demand agent skill |
| [dsh-claude-move](https://github.com/PerryLink/dsh-claude-move) | Migrate Claude Code sessions, memory, skills and CLAUDE.md into DSH |

## Licencia

[Apache License 2.0](LICENSE) © 2026 dsh-doublecheck contributors
