# MEMORY.md — Paradox Loop

Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- Arnés (Harness) completo: `AGENTS.md`, `MEMORY.md`, constitución y agentes SDD.
- Constitución aprobada con 6 principios en `docs/constitution.md`.
- Agentes listos en `.opencode/agents/`: `coordinator` (primary), `planner`, `programmer`, `tester`, con modelos gratis asignados.
- **Hito 001 (esqueleto + Nivel 1) implementado, validado por @tester (APROBADO, segunda vuelta) y commiteado:** canvas fijo 960 × 600 centrado, loop de 60 Hz con acumulador, movimiento WASD/flechas, colisiones círculo-AABB con deslizamiento, meta con victoria derivada (≤ 36 px) y pantalla `¡Nivel 1 completado!`.
- Tests: **87** en `node --test` (todos en verde) + `node --check` en todos los archivos de `js/` y `test/`.
- Correcciones post-validación: `js/input.js` (mapeo de teclas puro, hace testeable RF-9/CL-7) y `js/render.js` con `COLORS` + `relativeLuminance`/`contrastRatio` (RNF-4 con umbrales WCAG medidos).
- Alcance global: webapp de 7 días, 4 niveles, JS vanilla + Canvas 2D.

## Decisiones (y por qué)
- **Timestep fijo de 60 Hz y transforms grabados:** la reproducción de fantasmas y el rewind deben ser deterministas; nada de delta variable.
- **La victoria no se guarda:** `isWon(state)` la deriva de la distancia entre centros (≤ 36 px), sin `state.won` ni flags de mensaje; así RF-17 es idempotente y rebobinar será mover el playhead.
- **Colisión por ejes, X y luego Y, con dos pasadas por eje (`RESOLVE_PASSES = 2`):** da deslizamiento gratis, contacto exactamente tangente y esquinas interiores estables sin trigonometría.
- **Estado derivado de posiciones, sin flags ocultos:** puertas, láser y muertes se calculan desde posiciones.
- **Colores en una sola tabla `COLORS` en `render.js`:** el contraste se mide con sus mismas entradas, así el test detecta cualquier color fuera de la paleta.
- **Cero dependencias, sin build:** Canvas 2D + JS vanilla; publicable en GitHub Pages y sostenible por una persona en 7 días.
- **Cuatro agentes con permisos separados:** `coordinator` solo delega, `planner` solo escribe en `specs/`, `programmer` implementa una tarea a la vez, `tester` valida sin editar.

## Hechos del proyecto
- Geometría del Nivel 1: área 960 × 600, perímetro de 24 px, spawn `(120,300)`, meta `(816,536)` r=24, pilar `{456, 96, 24, 408}`, pasos de 72 px arriba y abajo.
- Números fijos: jugador r=12, meta r=24, contacto 36 px, 220 px/s, 60 Hz (3.6667 px/tick).
- Ratios WCAG medidos: texto/panel 15.20, jugador/fondo 18.11, jugador/pared 10.46, meta/fondo 10.37, meta/pared 5.99.

## Aprendizajes y errores a evitar
- Medir el canvas con `getImageData` en bucle dispara el warning de `willReadFrequently`: medir una sola vez o recargar antes de revisar la consola.

## Próximos pasos
- Push de `Dev` a `origin` (14 commits locales sin subir) y publicación en **GitHub Pages** (rama `Dev`, carpeta raíz) en https://lamby-code.github.io/SubAudit/ — lo hace el usuario, no un agente.
- Validar el sitio publicado una vez que esté arriba: carga del canvas, movimiento con WASD/flechas y victoria del Nivel 1.
- **Spec 002:** loop de 20 s, grabación de turnos, fantasma, placa/puerta y Nivel 2; es el hito más pesado, así que si supera 10 tareas hay que dividirlo.
