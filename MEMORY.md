# MEMORY.md — Paradox Loop

Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- Fase inicial: configuración de arnés (Harness) y base del proyecto.
- Alcance definido: webapp de 7 días, 4 niveles, JS vanilla + Canvas 2D.
- Pendiente: `docs/constitution.md` e inicio de la spec `specs/001-*`.

## Decisiones (y por qué)
- **Timestep fijo de 60 Hz y transforms grabados:** la reproducción de fantasmas y el rewind deben ser deterministas; nada de delta variable.
- **Estado derivado de posiciones, sin flags ocultos:** puertas, láser y muertes se calculan desde posiciones; rebobinar es mover el playhead.
- **Cero dependencias, sin build:** Canvas 2D + JS vanilla; publicable en GitHub Pages y sostenible por una persona en 7 días.

## Aprendizajes y errores a evitar
- (vacío por ahora)

## Próximos pasos
- Redactar `docs/constitution.md` con los principios innegociables.
- Iniciar el flujo de especificación con el agente coordinador/planificador.
