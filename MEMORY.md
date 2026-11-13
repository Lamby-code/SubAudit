# MEMORY.md — Paradox Loop

Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- Arnés (Harness) completo: `AGENTS.md`, `MEMORY.md`, constitución y agentes SDD.
- Constitución aprobada con 6 principios en `docs/constitution.md`.
- Agentes listos en `.opencode/agents/`: `coordinator` (primary), `planner`, `programmer`, `tester`, con modelos gratis asignados.
- Alcance definido: webapp de 7 días, 4 niveles, JS vanilla + Canvas 2D.
- Pendiente: inicio de la spec `specs/001-*`.

## Decisiones (y por qué)
- **Timestep fijo de 60 Hz y transforms grabados:** la reproducción de fantasmas y el rewind deben ser deterministas; nada de delta variable.
- **Estado derivado de posiciones, sin flags ocultos:** puertas, láser y muertes se calculan desde posiciones; rebobinar es mover el playhead.
- **Cero dependencias, sin build:** Canvas 2D + JS vanilla; publicable en GitHub Pages y sostenible por una persona en 7 días.
- **Cuatro agentes con permisos separados:** `coordinator` solo delega (sin edición ni shell), `planner` solo escribe en `specs/`, `programmer` implementa una tarea a la vez, `tester` valida sin editar; así el flujo SDD no se autoaprueba.
- **Modelos gratis por rol:** `opencode/big-pickle` para coordinator y planner (razonamiento; no necesitan visión), `opencode/deepseek-v4.1-flash-free#high` para programmer (código + visión) y `opencode/nemotron-3.5-super-vl-free#high` para tester (capturas del canvas).

## Aprendizajes y errores a evitar
- (vacío por ahora)

## Próximos pasos
- Cambiar al agente `coordinator` e iniciar la spec `001` (loop, fantasmas y Nivel 1).
- Aprobar la spec antes de pasar al plan y a las tareas.
