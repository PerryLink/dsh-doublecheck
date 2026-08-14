# dsh-doublecheck

> **Verifica dos veces antes de publicar: interroga los requisitos, prueba la implementación, demuestra la entrega.**

[![version](https://img.shields.io/badge/version-0.4.0-blue)](https://github.com/PerryLink/dsh-doublecheck/releases)
[![license](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)
[![topics](https://img.shields.io/badge/topics-dsh%20%7C%20dsh--plugin-22c55e)](https://github.com/topics/dsh-plugin)

Un **bundle de disciplina de ingeniería** para [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). A los agentes les encanta empezar a programar; los requisitos odian que se los dé por sentados. `dsh-doublecheck` instala un bucle de disciplina que obliga al agente a **interrogar los requisitos antes de la primera edición y a demostrar la entrega en lugar de afirmarla** — reimplementado de forma nativa sobre los puntos de extensión propios de DSH (registro de skills, pipeline de políticas de herramientas, seam de aprobación, seams de subagente y workflow, registro de sesión), no sobre archivos de prompt prestados. Probado contra DSH `0.1.0-rc.6`.

La metodología está inspirada en [obra/superpowers](https://github.com/obra/superpowers) y [TimothyVang/Grill-me](https://github.com/TimothyVang/Grill-me). Todos los prompts, términos, ejemplos y archivos de este paquete están escritos desde cero: nada se copia de ninguno de los dos proyectos.

## Por qué

- Las tareas vagas producen software equivocado. Una petición breve («hazme una función») esconde seis decisiones sin resolver; hoy el agente las adivina todas y tú pagas por la suposición.
- Los equipos disciplinados hacen esto con humanos: revisión de requisitos → prueba que falla → prueba que pasa → autorrevisión → prueba de entrega. Los agentes merecen el mismo bucle, impuesto por el harness y no por la buena voluntad.

## El bucle de disciplina

```
grill ──▶ design ──▶ red ──▶ green ──▶ review ──▶ verify
  │         │
  │      (v0.1)        (v0.2+)        (v0.3)         (v0.4)
  │
  └─ horno de requisitos: seis dimensiones, puerta de consenso,
     spec estructurado guardado en la sesión y en el workspace
```

| Etapa | Significado | Estado |
|---|---|---|
| **grill** | Interrogar las seis dimensiones de requisitos; negarse a implementar hasta el consenso. | ✅ v0.1 |
| **design** | Spec registrado con `doublecheck_spec`. | ✅ v0.1 |
| **red** | Una prueba que falla demuestra el hueco; las ediciones de implementación necesitan tenerla registrada. | ✅ v0.2 |
| **green** | Una prueba que pasa tras las ediciones cierra el bucle. | ✅ v0.2 |
| **review** | Un crítico adversario bifurcado audita la entrega contra el spec. | ✅ v0.3 |
| **verify** | `doublecheck_report` + un workflow de verificación por dimensión demuestran la entrega. | ✅ v0.4 |

## Funciones (v0.4)

- 🔥 **Skill `grill-requirements`** — un skill empaquetado en formato Agent Skills que interroga la tarea en seis dimensiones (**objetivo, alcance, criterios de aceptación, modos de fallo, prioridades, no-objetivos**) con la UI nativa `ask_user_question` de DSH, se niega a escribir código hasta el consenso y registra el contrato.
- 📜 **Herramienta `doublecheck_spec`** — guarda el spec acordado en el registro de sesión y escribe una copia en markdown en el workspace, para que el contrato sobreviva a la conversación.
- 🛡️ **Guard de disciplina** — una puerta blanda en el pipeline de políticas de herramientas. Tarea vaga + sin spec + rumbo a `edit`/`write` → **recordar**, **pedir aprobación humana** o **bloquear**, según `intensity`.
- 🟥🟩 **Puertas de evidencia red/green** (`modules.tdd`) — comprobaciones duras sobre el registro de sesión: una edición de implementación requiere una **prueba que falla registrada** desde la última prueba que pasa (escribir archivos de prueba siempre está permitido — así ocurre el paso red), y un turno que termina con ediciones pero sin ninguna prueba que pasa recibe un recordatorio green inyectado.
- 👁️ **Revisión adversaria** (`modules.adversary`) — una vez que la entrega alcanza green, un subagente crítico bifurcado (seam nativo de subagentes de DSH, provider `fork` por defecto) audita la sesión contra el spec registrado con una postura adversaria y devuelve hallazgos estructurados. `remind` inyecta la crítica; `warn`/`block` además dirigen una ronda para que el modelo responda a los hallazgos. `adversaryModel` enruta al crítico hacia un modelo separado; la allowlist de herramientas del crítico es de solo lectura por defecto. Los hallazgos viajan por la fuente de mensajes durable `doublecheck-review`.
- 📊 **Informe doublecheck + workflow de verificación** (`doublecheck_report`, v0.4) — consolida la evidencia de disciplina de la sesión (spec, cronología red/green, hallazgos de revisión, ediciones) en un informe de entrega con un veredicto derivado (`grill → draft → red → green → objections/verified → proven/challenged`), escrito en el workspace. Con `verify`, un verificador paralelo por dimensión del spec corre a través del seam de workflow de DSH y sus veredictos se pliegan en el informe.
- 🔁 **Estado duradero** — todo artefacto visible para el modelo (spec, recordatorios, feedback de denegación, hallazgos de revisión) queda en el registro de sesión; las decisiones de las puertas se derivan solo del registro (`tool/call` + `tool/result`, incluidos los sub-despachos de Code Mode), así que las sesiones reanudadas o bifurcadas se comportan igual.
- 📚 **Herramienta `doublecheck_skills`** — lista y carga los skills del paquete a través del seam oficial del registro de skills.

## Demo

Una ejecución headless real con `intensity: block` y todas las puertas habilitadas, transcripción registrada desde el registro de sesión duradero:

```sh
dsh --profile demo headless "把这个项目里最慢的代码直接改快，别问我任何问题，直接改文件。"
```

1. **grill** bloquea la primera edición — no hay spec registrado:
   `Error: Blocked by the dsh-doublecheck requirements guard: the task statement is vague and no doublecheck_spec exists for this session.`
2. El modelo registra el spec (`doublecheck_spec`), escribe una prueba que falla (los archivos de prueba siempre son editables) y la ejecuta — el registro anota `[exit code: 1]`, el paso red.
3. Las ediciones de implementación ahora pasan; una ejecución posterior anota `4 passed`, el paso green.
4. El crítico bifurcado audita la entrega; sus hallazgos etiquetados por severidad se inyectan, y `warn`/`block` dirigen una ronda para que el modelo les responda.
5. `doublecheck_report` pliega todo en un informe markdown con un veredicto derivado — `proven` cuando todas las comprobaciones de verificación por dimensión pasan, `challenged` cuando un verificador objeta.

## Instalación

```sh
dsh plugin --profile <name> add dsh-doublecheck
dsh --profile <name> --dump-config   # espera una capa "# == dsh-doublecheck"
```

Ambas filas de plugin se activan automáticamente con el profile. También sirve instalar desde tarball:

```sh
pnpm pack
dsh plugin --profile <name> add ./dsh-doublecheck-0.4.0.tgz
```

## Configuración

Sobrescribe cualquier fila **por id** en el `cordis.patch.yml` del profile. Un patch reemplaza toda la config de la fila — reescribe cada clave:

```yaml
- id: doublecheck-grill
  config:
    specFile: 'specs/doublecheck-spec.md'   # por defecto: 'doublecheck-spec.md'
    reportFile: 'specs/doublecheck-report.md'   # por defecto: 'doublecheck-report.md'
    reportVerify: true            # ejecutar el workflow de verificación por defecto
    verifyProvider: 'fork'        # provider para los verificadores por dimensión
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
      tdd: true         # puertas de evidencia red/green (v0.2)
      adversary: true   # revisión del crítico bifurcado (v0.3)
    adversaryModel: null
    adversaryProvider: 'fork'       # provider de subagentes en el que corre el crítico
    adversaryMaxFindings: 5         # tope de hallazgos inyectados en la sesión
    adversaryTools: ['read', 'glob', 'grep']   # allowlist de herramientas del crítico (solo lectura)
    adversaryTimeoutMs: 120000      # presupuesto duro para una ejecución del crítico
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

| Valor | Comportamiento ante un `edit`/`write` sujeto a la puerta |
|---|---|
| `remind` (por defecto) | La llamada sigue; un recordatorio viaja en el contexto del resultado hacia la siguiente petición del modelo. |
| `warn` | La llamada queda retenida a la espera de aprobación humana única vía el seam de aprobación (deniega si no hay canal). |
| `block` | La llamada se deniega con feedback que dirige al modelo a corregir primero la disciplina. |

### Ajustes

| Clave | Por defecto | Significado |
|---|---|---|
| `modules.grill` | `true` | En `false` desactiva la puerta grill. El interruptor de los skills/herramientas grill es el flag `disabled` de su fila. |
| `modules.tdd` | `false` | En `true` activa las puertas de evidencia red/green (v0.2). |
| `modules.adversary` | `false` | En `true` activa la revisión del crítico bifurcado en green (v0.3); usa el seam `ctx.subagents` — un seam ausente se resuelve como un aviso «no disponible». |
| `guardTools` | `['edit', 'write']` | Nombres de herramientas de mutación que vigila el guard. |
| `vagueTaskMaxChars` | `200` | Las tareas más largas nunca se consideran vagas. Las tareas breves que nombran un archivo, ruta, URL, una palabra clave con guion bajo o una palabra clave con guion son concretas. |
| `remindOnce` | `true` | Inyectar el recordatorio de cada puerta como máximo una vez por sesión. |
| `testToolNames` | `['bash', 'pwsh']` | Nombres de herramientas de shell que pueden ejecutar pruebas. |
| `testCommandPatterns` | *(pnpm/npm/yarn/bun test, pytest, go/cargo/make test, node --test)* | Expresiones regulares con las que debe coincidir un comando para contar como ejecución de prueba. |
| `testFilePatterns` | *(directorios de prueba, `*.test.*` / `*.spec.*`)* | Expresiones regulares que identifican archivos de prueba — siempre editables, exentos de la puerta red. |
| `adversaryModel` | `null` | Ruta del modelo crítico; `null` = el modelo principal se autorrevisa. |
| `adversaryProvider` | `'fork'` | Nombre del provider de subagentes en el que corre el crítico. |
| `adversaryMaxFindings` | `5` | Tope de hallazgos (1–20) inyectados en la sesión. |
| `adversaryTools` | `['read', 'glob', 'grep']` | Allowlist de herramientas del crítico; mantenla de solo lectura. |
| `adversaryTimeoutMs` | `120000` | Presupuesto de tiempo duro para una ejecución del crítico. |

La mala configuración falla en voz alta: una regex inválida, una lista de nombres vacía o duplicada, o un tope de hallazgos fuera de rango lanza un error al cargar en lugar de no hacer nada en silencio. Un crítico que no puede ejecutarse (seam ausente, fallo del provider, timeout) se resuelve como un aviso honesto «no disponible» en la sesión.

### Controles del informe (fila grill)

| Clave | Por defecto | Significado |
|---|---|---|
| `reportFile` | `'doublecheck-report.md'` | Archivo del workspace que recibe el markdown del informe. |
| `reportVerify` | `true` | Valor por defecto para el flag `verify` de la herramienta. |
| `verifyProvider` | `'fork'` | Provider de subagentes en el que corren los verificadores por dimensión. |
| `reportTestToolNames` / `reportTestCommandPatterns` | *(same defaults as the guard row)* | Clasificación de ejecuciones de prueba con alcance de informe. |
| `reportMutationTools` / `reportTestFilePatterns` | *(same defaults as the guard row)* | Clasificación de ediciones de implementación con alcance de informe. |

Los controles de clasificación del informe son independientes de los del guard: la aplicación de la puerta y el plegado del informe se pueden ajustar por separado sin que uno cambie silenciosamente al otro. La verificación degrada honestamente: un seam `workflowEngine` ausente o una ejecución rechazada deja `verification: null` y el markdown lo dice.

## Cómo funciona (puntos de extensión)

| Contribución | Mecanismo DSH |
|---|---|
| Skills empaquetados | `ctx.skills.registerProvider()` — seam de capacidad de skills, `source: bundled` |
| Herramienta de catálogo/carga | `ctx.tools.register()` — `doublecheck_skills` |
| Spec + archivo en workspace | herramienta `doublecheck_spec` + escritura opcional vía `ctx.fs` |
| Puerta de requisitos | waterfall `tools/pre-execute` — `allow` / `ask` (seam de aprobación) / `deny` |
| Puerta red | waterfall `tools/pre-execute` — comprobación dura de la evidencia de prueba fallida antes de las ediciones de implementación |
| Inyección de recordatorio | waterfall `tools/post-execute` — `additionalContexts` → registrado como `user/message` |
| Puerta green | `agent/turn-stopping` serial — inyecta un recordatorio de finalización cuando las ediciones carecen de una prueba que pasa |
| Revisión adversaria | `ctx.subagents.start()` — forked critic with structured findings schema, injected at green; `warn`/`block` steer one round |
| Informe de entrega | `doublecheck_report` tool — session-log fold + workspace markdown |
| Workflow de verificación | `ctx.workflowEngine.start()` — one parallel checker per spec dimension, structured checks |
| Estado duradero | session log fold over `tool/call` + `tool/result` + `tool/code-dispatch` + injected structured sources; model-visible ⟺ logged |
| Eventos internos | `doublecheck/spec`, `doublecheck/reminder`, `doublecheck/review`, `doublecheck/report` (typed via declaration merging, `@mode emit`) |

Sin cambios en el agent-loop. Cada registro es un `ctx.effect` / `ctx.on` / `register()` de servicio reversible.

## Qué ve el modelo

- El skill `grill-requirements` se une al catálogo de skills de la sesión y se carga con la herramienta integrada `skill` (o `doublecheck_skills`).
- `ask_user_question` sigue siendo la forma nativa de DSH de preguntar al usuario; el skill solo la coreografía (y en headless sin provider degrada a preguntas en prosa).
- Los recordatorios llegan como contexto `{kind:'plugin'}`, así que las UIs de transcripción los muestran como metadatos de inyección.
- La crítica del adversario llega de la misma manera cuando el crítico se asienta, con hallazgos etiquetados por severidad; bajo `warn`/`block` el bucle se dirige una ronda para que el modelo les responda.
- `doublecheck_report` devuelve el informe consolidado como resultado de herramienta (spec, cronología de pruebas, revisión, verificación, veredicto), así que «demostrar la entrega» está a una llamada de distancia.

## Hoja de ruta

El bucle de disciplina de seis etapas está completo: **grill → design → red → green → review → verify** se incluyen todas en este paquete (v0.1 → v0.4). Trabajo futuro: cobertura de snapshot para las transcripciones de review/informe y un formato de informe más rico.

## Desarrollo

```sh
pnpm install --ignore-workspace
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```

## Agradecimientos

Metodología inspirada en [obra/superpowers](https://github.com/obra/superpowers) (disciplina de ingeniería estilo TDD) y [TimothyVang/Grill-me](https://github.com/TimothyVang/Grill-me) (interrogar los requisitos antes de implementar). Este paquete es una implementación original: no se copia ningún texto, prompt o archivo de ninguno de los dos proyectos.

## Licencia

[Apache-2.0](LICENSE)
