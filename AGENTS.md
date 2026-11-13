# AGENTS.md — Paradox Loop

Puzzle web 2D top-down donde cada turno es una grabación de 20 s de vos mismo.
El jugador coreografía versiones pasadas de sí para abrirse camino. Público: jugadores de puzzle en desktop.

## Stack y estructura
- HTML5 + CSS + JavaScript vanilla (ES2022) + Canvas 2D. Sin frameworks, build, npm ni backend.
- Timestep fijo de 60 Hz; fantasmas kinemáticos grabados; estado derivado de posiciones.
- `js/main.js`: boot, game loop e input.
- `js/sim.js`: estado, colisiones, grabación y rewind.
- `js/render.js`: todo el canvas.
- `js/levels.js`: datos de los 4 niveles.

## Comandos
- Ejecución: `python -m http.server 8000` → http://localhost:8000
- Tests: `node --test`
- Lint / Build: no aplica; validar sintaxis con `node --check js/*.js`

## Convenciones
- Idioma: código y comentarios en inglés; interfaz y documentación en español.
- Módulos ES con `import`/`export`; lógica pura en `sim.js`, sin DOM; cero flags ocultos.
- Colisiones: círculo-AABB (paredes), círculo-cápsula (rastro), círculo-círculo (fantasmas).
- Números: canvas 960×600, loop 20 s, 60 Hz, jugador r=12, velocidad 220 px/s.

## Límites
- Alcance cerrado: solo lo obligatorio de §3.1; el arma (§12) no se implementa sin pedido explícito.
- Sin dependencias, frameworks, bundlers, backend ni servicios externos.
- Sin mobile, gamepad, narrativa, editor ni multijugador; audio solo si se pide.
- Sin `localStorage` salvo progreso trivial; sin cuentas ni red.
- Una tarea a la vez: si toca más de 3 archivos o supera ~40 min, dividila.
- No refactorices módulos ajenos a la tarea activa ni borres trabajo sin confirmar.
- Ante ambigüedad de diseño o requisito faltante: preguntá, no inventes.
- No modifiques `AGENTS.md` ni `PARADOX_LOOP_DISENO.md` sin pedido; `MEMORY.md` se actualiza al cerrar cada tarea.

## Reglas y Gobierno SDD
- Lee `docs/constitution.md` y la spec activa (`specs/NNN-*/`) antes de tocar código.
- La spec manda: no implementes nada que no esté en la especificación activa aprobada.
- Al iniciar una sesión o tarea, lee `MEMORY.md`.
- Al terminar cada tarea, actualiza `MEMORY.md` y asegura todos los tests en verde.
- No almacenes jamás datos sensibles (claves, tokens, credenciales) en ningún archivo.
