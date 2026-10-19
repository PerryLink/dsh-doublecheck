<div align="center">

# dsh-doublecheck
- **Canal 1024 store**: `npm i -g dsh1024` una vez, luego `dsh1024 plugin --profile web add dsh-doublecheck` (cuenta para el ranking de instalaciones de [deepseek1024.com](https://deepseek1024.com)).

**La puerta de calidad de entrega para DeepSeek Harness: interroga los requisitos, prueba la implementación, demuestra la entrega — y controla el traspaso con una decisión de entregable / rehacer.**

*Los requisitos se interrogan antes de la primera edición; la entrega se demuestra, nunca se afirma.*

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
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-doublecheck?metric=downloads&lang=es)](https://dshfind.com/es/plugins/PerryLink/dsh-doublecheck?ref=badge)

[English](README.md) · [简体中文](README-zh.md) · [Español](README-es.md) · [Português](README-pt.md) · [हिन्दी](README-hi.md)

```sh
dsh plugin --profile <name> add dsh-doublecheck
```


</div>

---


**📖 Base de conocimiento del ecosistema** — datos medidos, no marketing: [guía de desarrollo · datos de selección · criterios de mantenimiento](https://perrylink.github.io/dsh-plugin-guide/).

<!-- star-cta -->
## Instalación y desinstalación

- **canal git** (última `main`): `dsh plugin --profile web add github:PerryLink/dsh-doublecheck` — el script `prepare` compila solo con dependencias de producción.
- **canal npm** (versiones publicadas): `dsh plugin --profile web add dsh-doublecheck`.
- **canal tarball**: `pnpm pack` en este repo y luego `dsh plugin --profile web add ./dsh-doublecheck-<version>.tgz`.
- **desinstalar**: `dsh plugin --profile web remove dsh-doublecheck` (o elimina las filas del parche de perfil).

Para un modo estricto sin configuración (cada puerta activa con intensidad `block`, cobertura de la puerta requerida), aplica la capa superpuesta incluida sobre el parche del bundle: `dsh --profile web --patch ./node_modules/dsh-doublecheck/strict.patch.yml`.

## ⭐ 如果它帮到了你

Este plugin forma parte de la [familia de plugins DSH](https://github.com/PerryLink) (más de 40, todos Apache-2.0). Si te resulta útil, **dale una estrella**: no desbloquea nada, pero ayuda a que la siguiente persona lo encuentre antes.

*English:* part of a 95 plugin family for DeepSeek Harness. If it is useful, **a star helps the next person find it** — nothing is gated behind it.

## What is dsh-doublecheck?

La puerta de calidad de entrega para DeepSeek Harness: interroga los requisitos, prueba la implementación, demuestra la entrega — y controla el traspaso con una decisión de entregable / rehacer.

Los requisitos se interrogan antes de la primera edición; la entrega se demuestra, nunca se afirma.

![Demostración de terminal de dsh-doublecheck: dsh-doublecheck — /gate report (example block from the README)](https://raw.githubusercontent.com/PerryLink/dsh-doublecheck/main/docs/assets/dsh-doublecheck-hero.png)

![Animated terminal demo of dsh-doublecheck](https://raw.githubusercontent.com/PerryLink/dsh-doublecheck/main/docs/assets/dsh-doublecheck-demo.gif)

*La misma ejecución, animada.*

## Compatibilidad

| Superficie | Estado |
|---|---|
| Harness | DeepSeek Harness `dsh-v0.2.1-rc.2` (verified 2026-10-18): `engines.dsh >=0.2.1-0 <0.3.0`; the gate and projection paths are covered by the rc.2 test suite. |
| Node | `^22.19.0 \|\| >=24.0.0` |
| Plataformas | Todas (host puro; sin código nativo, sin solicitudes de red directas propias) |
| Modelo | Cualquiera (el guard nunca llama a un modelo; las fases de crítico y revisor se ejecutan como subagentes del harness) |

## Qué obtienes

`dsh-doublecheck` instala dos filas de plugin que leen y aplican desde el mismo registro de sesión durable:

1. **`doublecheck-grill`** — el horno de requisitos: la skill empaquetada `grill-requirements` más las herramientas orientadas al modelo `doublecheck_skills`, `doublecheck_spec` y `doublecheck_report`, y el flujo de verificación por dimensión.
2. **`doublecheck-guard`** — el guard de disciplina: la puerta grill, las puertas de evidencia rojo/verde, la revisión adversarial, los comandos `/doublecheck` y `/gate`, la tarjeta de ajustes en vivo `gate` y la puerta de entrega de cuatro fases.

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

Ambas filas (`doublecheck-grill` y `doublecheck-guard`) se activan automáticamente con el perfil.

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
| `gate.tests.evalReports.enabled` | `false` | Encendido pliega el informe dsh-eval (el motor de evaluación de dsh-auto-review) en la evidencia de prueba. |
| `gate.tests.evalReports.dir` | `'.eval-reports'` | Directorio relativo al espacio de trabajo que contiene el informe del motor. |
| `gate.tests.evalReports.file` | `'report.json'` | Nombre del archivo de informe dentro del directorio. |
| `gate.tests.evalReports.required` | `false` | Un informe ausente es una luz roja exactamente cuando es true (un salto en caso contrario). |
| `gate.consistency.*` | `provider: 'fork'`, `model: null`, `tools: ['read','glob','grep']`, `timeoutMs: 120000`, `maxFindings: 5` | Ajustes del revisor local de consistencia (`model: null` = modelo principal). |
| `gate.review.engine` | `'auto'` | `auto` = registros de veredicto de dsh-auto-review cuando están presentes, si no el revisor local; `local` = siempre local. |
| `gate.review.provider` | `'fork'` | Proveedor del revisor local de revisión (su `model`/`tools`/`timeoutMs`/`maxFindings` coinciden con `gate.consistency.*`). |

Cada clave `gate.*` de arriba forma parte de un único **campo en vivo**: el guard marca todo el bloque `gate` como `.volatile()`, así que es la tarjeta de ajustes editable de la fila (el espacio de nombres del formulario es el id de entrada de perfil de la fila). Las demás claves son configuración de composición normal del parche de perfil. El bloque se lee una vez al cargar, así que una edición surte efecto en la siguiente carga: `gate.enabled` decide si el aviso rojo del límite de turno se instala. Si el schemastery del host es anterior a `.volatile()`, la fila monta igualmente: no hay tarjeta y el bloque viene del parche de perfil.

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
| `gate` | campo de configuración en vivo | La lista enchufable es el único campo `.volatile()` de la fila del guard: se edita desde la tarjeta de ajustes de la fila (espacio de nombres = el id de entrada de perfil de la fila) y se lee una vez al cargar. |
| `strict.patch.yml` | capa superpuesta | Cada puerta activa con intensidad `block` más el requisito de cobertura, en una capa de parche. |
| `dsh-doublecheck/invariant` | fila acompañante | Informa contradicciones de ruta de escritura propias del paquete a través del registro `invariants` del host. |
| `doublecheck` | proyección de sesión | Una línea de estado acotada que el cliente muestra: etapa, último veredicto de la puerta, cuenta de rojos, ediciones y marcas spec/review. Ver [Cómo leer la línea de estado](#cómo-leer-la-línea-de-estado). |

### Cómo leer la línea de estado

La proyección de sesión `doublecheck` es una **cadena**, y es deliberadamente una sola línea: la idea es que cualquier cliente pueda mostrarla sin recortar nada. El `/status` de un puente de chat, una barra de estado o cualquier consumidor propio la muestra tal cual:

```text
gate:rework r2 | stage:green | test:green edits:12 spec:yes review:yes | goal:ship parser fix
```

| Segmento | Se lee como |
|---|---|
| `gate:<veredicto> r<n>` | El último veredicto de la puerta de entrega — `none` antes de cualquier ejecución, `deliverable` o `rework` — y su cuenta de rojos `r<n>`. |
| `stage:<etapa>` | La etapa de disciplina alcanzada con evidencia durable: `grill`, `design`, `red`, `green`, `review`, `verify`. |
| `test:<color>` | El color de la última ejecución de pruebas: `none`, `red`, `green`. |
| `edits:<n>` | Ediciones de implementación plegadas del registro de sesión (escribir archivos de prueba no cuenta). |
| `spec:yes` / `spec:no` | Si existe un `doublecheck_spec` confirmado. |
| `review:yes` / `review:no` | Si existe un registro de revisión adversaria. |
| `goal:<extracto>` | El objetivo del spec confirmado, recortado. Solo aparece con `spec:yes`. |

La línea está acotada **por construcción**, así que ningún renderizador la trunca:

- Presupuesto duro: **120 caracteres**. Un renderizador que conserva los valores de hasta 120 caracteres — el renderizador genérico de proyecciones del puente de WeChat es uno de ellos — muestra la línea completa. La forma de objeto anterior tenía 131 caracteres **en vacío**, y por eso el veredicto y la cuenta de rojos se recortaban.
- Los tres primeros segmentos son **sin pérdida**. Las cuentas por encima de `9999` rojos o `99999` ediciones se imprimen como `9999+` / `99999+` en lugar de crecer sin límite; una cuenta no finita o negativa se imprime como `0`.
- `goal:` es el único segmento con pérdida. Se aplana a una sola línea (los saltos de línea y los caracteres de control pasan a espacios, `|` pasa a `/`) y se recorta al presupuesto restante, como máximo 40 caracteres, terminando en `…` cuando se recortó. El objetivo completo está en `/doublecheck status` y en el informe de entrega.
- Esto es un vistazo, no el registro: `/gate status` y `/doublecheck status` muestran el estado completo.

El `stateVersion` de la proyección es **3**. Incrementarlo descarta una fila de caché de proyección escrita por una versión anterior y vuelve a plegar la clave desde el registro de sesión, de modo que una sesión actualizada recalcula la línea en lugar de mostrar una obsoleta. El estado plegado en sí no cambia, y una sesión anterior a la actualización nunca falla al cargar.

## Fases de la puerta

La puerta de entrega agrega la evidencia durable de la sesión en una lista configurable de cuatro fases y asienta una decisión **entregable / rehacer requerido**. Cada fase pliega solo el registro de sesión (la reproducción ES el estado), por lo que una ejecución se vuelve a derivar idénticamente tras reanudar o bifurcar.

| Fase | Comprobaciones | Fuente de evidencia | Costo de modelo |
|---|---|---|---|
| Interrogatorio de requisitos | Lista de preguntas clave confirmadas una a una (seis preguntas de dimensión de spec por defecto) | `doublecheck_spec` confirmado + llamadas `ask_user_question` | ninguno |
| Evidencia de prueba | Color de la última ejecución, ejecuciones fallidas tras el verde, umbral de cobertura opcional, informe dsh-eval opcional | Ejecuciones de prueba shell en el registro de sesión (`[exit code: N]`, porcentajes de cobertura); el archivo de informe dsh-eval cuando `gate.tests.evalReports.enabled` | ninguno |
| Consistencia de implementación | Mapeo diff ↔ requisito: cada edición debe servir a una dimensión de spec | Revisor bifurcado local (hallazgos estructurados, herramientas de solo lectura) | un subagente |
| Conclusión de revisión | El veredicto de entrega; `engine: auto` consume los registros de veredicto durables de dsh-auto-review cuando están presentes, si no el revisor local | Eventos `autoReview/verdict` / `autoReview/rejection`, o el revisor bifurcado local | un subagente (local) |

Las luces rojas son comprobaciones fallidas (un spec ausente, una última ejecución fallida, cobertura bajo el mínimo, una edición sin mapear, hallazgos blocker/major) — cada una lleva una sugerencia de retrabajo. Las advertencias y los saltos nunca invierten la decisión. La puerta integra [dsh-auto-review](https://github.com/PerryLink/dsh-auto-review) como dependencia débil: `review.engine: auto` pliega sus registros de veredicto cuando están presentes y degrada al revisor local en caso contrario; `gate.tests.evalReports.enabled` pliega el informe dsh-eval de su motor de evaluación (suites de regresión de prompt / estrés / equidad) en la evidencia de prueba y salta honestamente cuando no existe informe. La puerta nunca sintetiza solicitudes de aprobación.

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

## Salida de CI

`/gate run` también escribe un `gate-report.json` (el mismo estado asentado que el JSON sin pérdida, junto a `gate-report.md`). El CLI `doublecheck-gate` convierte ese archivo en salida legible por máquina para GitHub Actions:

```sh
# JSON (comentario de PR / payload de estado)
doublecheck-gate --format json --input gate-report.json
# SARIF 2.1.0 (subida de code-scanning / verificación de estado)
doublecheck-gate --format sarif < gate-report.json
```

El CLI solo serializa el `GateState` ya asentado — nunca vuelve a ejecutar la puerta de cuatro fases ni los pliegues de evidencia. Su código de salida mapea el veredicto: `0` = entregable, `1` = retrabajo, `2` = error de uso/análisis.

## Permisos y datos

- **Lee**: el registro de sesión (`tool/call` / `tool/result` / `tool/ptc-dispatch`, fuentes `user/message` inyectadas y los registros de veredicto ajenos `autoReview/*`) solo en proceso; el estado opcional del servicio de modo plan. Antes del renombrado de V3 el host registra los subenvíos PTC con la etiqueta predecesora `tool/code-dispatch`; ambas etiquetas se pliegan de forma idéntica. Los avisos inyectados llevan el kind de fuente de mensaje propio del paquete, `dsh-doublecheck`; los registros anteriores a ese kind llegan como `plugin:dsh-doublecheck` (la reescritura que la migración V3→V4 del host aplica a un envoltorio catch-all publicado) o como el envoltorio `plugin` publicado, y las tres formas se pliegan igual.
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

- **Escrituras durables.** `/doublecheck on\|off` → `doublecheck/state` y `/gate run` → `doublecheck/gate` necesitan la superficie de append `ignorable` del host (post-rc.6 hasta `0.1.1-rc.2`). En hosts sin esa superficie (rc.6/rc.8 y `0.1.2-alpha.1`, que eliminó el sobre — `0.1.2-rc.1` restaura el campo solo para compatibilidad de lectura de logs almacenados y aún no puede estamparlo), las escrituras se omiten y el interruptor queda en proceso.
0.1.2-rc.1 (adaptado el 2026-09-02): el sobre de sesión conserva su campo ignorable solo para compatibilidad de lectura de logs almacenados - Session.append aún no puede estamparlo, por lo que el comportamiento de la puerta no cambia.
0.1.5-alpha.1 (adaptado el 2026-09-09): el formato de sesión V3 renombra el evento durable de subenvío `tool/code-dispatch` a `tool/ptc-dispatch` (carga útil sin cambios; ambas etiquetas se pliegan de forma idéntica). Session.append sigue sin canal `ignorable`, así que las escrituras durables se omiten y el interruptor permanece en proceso - comportamiento sin cambios. (El espacio de ajustes `doublecheck-gate` que introdujo esa entrada se eliminó en 0.1.7-alpha.1, cuando el host borró el registro de espacios de nombres.)
0.1.5-rc.1 (adaptado el 2026-09-10): los pines de dependencias pasan a la línea publicada 0.1.5-rc.1; ningún cambio de interfaz afecta el comportamiento de este plugin.
0.1.5-rc.2 (adaptado el 2026-09-11): los pines de dependencias pasan a la línea publicada 0.1.5-rc.2; ningún cambio de interfaz afecta el comportamiento de este plugin.
0.1.7-alpha.1 (adaptado el 2026-10-04): el host eliminó el kind de fuente de mensaje catch-all compartido `plugin` (los avisos ahora llevan el kind propio `dsh-doublecheck`, y el plegado de `remindOnce` sigue leyendo las dos formas previas a la actualización que un registro durable puede contener) y sustituyó el registro de espacios de nombres de ajustes por `SettingsForms` (el espacio `doublecheck-gate` desaparece; la lista de la puerta pasa a ser el único campo `.volatile()` de la fila del guard, todavía leído una vez al cargar). Los pisos de peers de `@deepseek-ai/cordis` y `@deepseek-ai/schemastery` pasan a `^4.0.3` / `^3.18.3` en las dependencias de desarrollo; los rangos de peers siguen siendo `^4.0.2` / `^3.18.2` y la capacidad de campos en vivo se detecta al cargar, así que las líneas de host anteriores siguen montando la fila (sin tarjeta de ajustes). Sin cambios de comportamiento salvo la ubicación de almacenamiento de los ajustes.
- **Interfaces opcionales.** La tarjeta de ajustes de la fila del guard aparece cuando el servicio de ajustes está montado; la tarjeta es la Config de esta propia fila (espacio de nombres = su id de entrada de perfil), y el bloque `gate` se lee una vez al cargar, así que sus valores aplican al panel `/gate` y al aviso rojo en la siguiente carga. La capacidad de campos en vivo se detecta al cargar: si el schemastery del host es anterior a `.volatile()`, la fila monta igualmente — sin tarjeta, con el bloque `gate` tomado del parche de perfil. La línea de modo plan de `/gate status` lee el `ctx.planMode` opcional (muestra `unknown` sin él); la revisión adversarial necesita `ctx.subagents`; la verificación necesita `workflowEngine`.
- **Degradación local.** `gate.review.engine: auto` degrada al revisor local cuando dsh-auto-review está ausente o no tiene registros de veredicto en esta sesión — el informe nombra la razón en lugar de inventar un veredicto.
- **La evidencia dsh-eval se basa en archivos.** El motor de evaluación de dsh-auto-review (`dsh-eval`) escribe sus resultados de regresión de prompt / estrés / equidad en un archivo de informe del espacio de trabajo, no en el registro de sesión. `gate.tests.evalReports.enabled` pliega ese archivo (desactivado por defecto; salta cuando está ausente) y los recuentos pliegados viajan en el registro duradero `doublecheck/gate` para que una ejecución asentada siga siendo reproducible.

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

## Interoperabilidad con otros plugins de DSH

Verificado contra **DSH `0.2.0-rc.2`** (el runtime para el que se publica este README) y el conjunto de plugins con más estrellas sondeado el 2026-10-05.

Este plugin **no interfiere** con otros plugins, incluidos los de más estrellas:

- **Sin colisión de nombres de herramienta.** Todas las herramientas llevan espacio de nombres; ninguna ocupa un nombre desnudo ya perteneciente a una herramienta incluida u otro plugin.
- **Sin colisión de clave de servicio.** No provee ninguna clave de servicio, así que no puede colisionar en una.
- **Sin colisión de slot.** No registra ninguna clave de slot de cliente, así que no disputa un asiento `shadows-shipped-ui`.
- **Sin colisión de ruta HTTP.** No registra ningún prefijo `webServer`.
- **Sin colisión en la capa de patch.** El patch del bundle solo hace `insert` de su propia fila; nunca sobrescribe el `config` de una fila incluida.
- **Sin mutación global.** No parchea prototipos, ni reescribe `process.env`, ni reemplaza el dispatcher global de fetch.

**Los listeners de eventos compartidos no interfieren por construcción.** Observa los eventos sensibles al orden `agent/turn-stopping`, `tools/post-execute`, `tools/pre-execute` con `ctx.on()` — el registro de difusión de Cordis, donde cada listener se ejecuta y ninguno puede dejar sin turno a otro. **Todos los listeners aquí delegan por `next()`**, así que la cadena nunca se cortocircuita:
  - `tools/post-execute` — also used by `cc-safety-net` (1576★).
  - `tools/pre-execute` — also used by `cc-safety-net` (1576★).

Evidencia estática: `dsh-plugin-doctor` K10–K13 dan `pass` en todas las comprobaciones de este repositorio.

## PerryLink DSH Plugin Family

Este proyecto forma parte de la familia de plugins de DeepSeek Harness de [PerryLink](https://github.com/PerryLink). El registro permanece plegado abajo para que cada README conserve una primera pantalla corta; expándelo para ver cada fila y su estado.

<details>
<summary>Expandir todos los plugins</summary>

| Plugin | Estado |
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
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | 🚫 RETIRADO — ver el README del repositorio |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | 🚫 RETIRADO — ver el README del repositorio |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | 🚫 RETIRADO — ver el README del repositorio |

</details>

## Licencia

[Apache License 2.0](LICENSE) © 2026 dsh-doublecheck contributors
