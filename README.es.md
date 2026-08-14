# dsh-doublecheck

> **Verifica dos veces antes de publicar: interroga los requisitos, prueba la implementación, demuestra la entrega.**

[![license](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)
[![version](https://img.shields.io/badge/dsh-0.1.0--rc.6-8A2BE2)](https://www.npmjs.com/package/@deepseek-ai/dsh)
[![topic](https://img.shields.io/badge/topic-dsh--plugin-22c55e)](https://github.com/topics/dsh-plugin)

Un **bundle de disciplina de ingeniería** para [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). A los agentes les encanta empezar a programar; los requisitos odian que se los dé por sentados. `dsh-doublecheck` instala un bucle de disciplina que obliga al agente a **interrogar los requisitos antes de la primera edición y a demostrar la entrega en lugar de afirmarla** — reimplementado de forma nativa sobre los puntos de extensión propios de DSH (registro de skills, pipeline de políticas de herramientas, seam de aprobación, registro de sesión), no sobre archivos de prompt prestados.

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
| **red** | Una prueba que falla demuestra el hueco. | 🔜 v0.2 |
| **green** | La corrección la hace pasar; el registro prueba el orden. | 🔜 v0.2 |
| **review** | Un crítico adversario revisa la entrega (`adversaryModel`). | 🔜 v0.3 |
| **verify** | Orquestación de workflow + informe doublecheck consolidado. | 🔜 v0.4 |

## Funciones (v0.1)

- 🔥 **Skill `grill-requirements`** — un skill empaquetado en formato Agent Skills que interroga la tarea en seis dimensiones (**objetivo, alcance, criterios de aceptación, modos de fallo, prioridades, no-objetivos**) con la UI nativa `ask_user_question` de DSH, se niega a escribir código hasta el consenso y registra el contrato.
- 📜 **Herramienta `doublecheck_spec`** — guarda el spec acordado en el registro de sesión y escribe una copia en markdown en el workspace, para que el contrato sobreviva a la conversación.
- 🛡️ **Guard de disciplina** — una puerta blanda en el pipeline de políticas de herramientas. Tarea vaga + sin spec + rumbo a `edit`/`write` → **recordar**, **pedir aprobación humana** o **bloquear**, según `intensity`.
- 🔁 **Estado duradero** — todo artefacto visible para el modelo (spec, recordatorios, feedback de denegación) queda en el registro de sesión; las decisiones del guard se derivan solo del registro, así que las sesiones reanudadas o bifurcadas se comportan igual.
- 📚 **Herramienta `doublecheck_skills`** — lista y carga los skills del paquete a través del seam oficial del registro de skills.

## Instalación

```sh
dsh plugin --profile <name> add dsh-doublecheck
dsh --profile <name> --dump-config   # espera una capa "# == dsh-doublecheck"
```

Ambas filas de plugin se activan automáticamente con el profile. También sirve instalar desde tarball:

```sh
pnpm pack
dsh plugin --profile <name> add ./dsh-doublecheck-0.1.0.tgz
```

## Configuración

Sobrescribe cualquier fila **por id** en el `cordis.patch.yml` del profile. Un patch reemplaza toda la config de la fila — reescribe cada clave:

```yaml
- id: doublecheck-grill
  config:
    specFile: 'specs/doublecheck-spec.md'   # por defecto: 'doublecheck-spec.md'

- id: doublecheck-guard
  config:
    intensity: warn
    modules:
      grill: true
      tdd: false        # reservado para v0.2 — debe ser false en v0.1
      adversary: false  # reservado para v0.3 — debe ser false en v0.1
    adversaryModel: null
    guardTools: ['edit', 'write']
    vagueTaskMaxChars: 200
    remindOnce: true
```

### `intensity`

| Valor | Comportamiento ante un `edit`/`write` vago y sin spec |
|---|---|
| `remind` (por defecto) | La llamada sigue; un recordatorio viaja en el contexto del resultado hacia la siguiente petición del modelo. |
| `warn` | La llamada queda retenida a la espera de aprobación humana única vía el seam de aprobación (deniega si no hay canal). |
| `block` | La llamada se deniega con feedback que dirige al modelo a interrogar primero. |

### Ajustes

| Clave | Por defecto | Significado |
|---|---|---|
| `modules.grill` | `true` | En `false` desactiva el guard. El interruptor de los skills/herramientas grill es el flag `disabled` de su fila. |
| `guardTools` | `['edit', 'write']` | Nombres de herramientas de mutación que vigila el guard. |
| `vagueTaskMaxChars` | `200` | Las tareas más largas nunca se consideran vagas. Las tareas breves que nombran un archivo, ruta o URL son concretas. |
| `remindOnce` | `true` | Inyectar el recordatorio como máximo una vez por sesión. |
| `adversaryModel` | `null` | Reservado para el crítico de v0.3; `null` = el modelo principal se autorrevisa. Un valor no nulo falla al cargar en v0.1. |

La mala configuración falla en voz alta: activar un módulo reservado o fijar `adversaryModel` lanza un error al cargar, en lugar de no hacer nada en silencio.

## Cómo funciona (puntos de extensión)

| Contribución | Mecanismo DSH |
|---|---|
| Skills empaquetados | `ctx.skills.registerProvider()` — seam de capacidad de skills, `source: bundled` |
| Herramienta de catálogo/carga | `ctx.tools.register()` — `doublecheck_skills` |
| Spec + archivo en workspace | herramienta `doublecheck_spec` + escritura opcional vía `ctx.fs` |
| Puerta de requisitos | waterfall `tools/pre-execute` — `allow` / `ask` (seam de aprobación) / `deny` |
| Inyección de recordatorio | waterfall `tools/post-execute` — `additionalContexts` → registrado como `user/message` |
| Estado duradero | plegado del registro sobre `tool/call` + `tool/result`; visible para el modelo ⟺ registrado |
| Eventos internos | `doublecheck/spec`, `doublecheck/reminder` (tipados por declaration merging, `@mode emit`) |

Sin cambios en el agent-loop. Cada registro es un `ctx.effect` / `ctx.on` / `register()` de servicio reversible.

## Qué ve el modelo

- El skill `grill-requirements` se une al catálogo de skills de la sesión y se carga con la herramienta integrada `skill` (o `doublecheck_skills`).
- `ask_user_question` sigue siendo la forma nativa de DSH de preguntar al usuario; el skill solo la coreografía (y en headless sin provider degrada a preguntas en prosa).
- Los recordatorios llegan como contexto `{kind:'plugin'}`, así que las UIs de transcripción los muestran como metadatos de inyección.

## Hoja de ruta

- **v0.2** — puertas de evidencia red/green: verificación en el registro de que una prueba que falla precedió a la corrección.
- **v0.3** — módulo adversary: un subagente crítico revisa la entrega; `adversaryModel` elige la ruta.
- **v0.4** — orquestación de workflow e informe doublecheck consolidado.

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
