# Tareas 001 — Esqueleto y Nivel 1

Máximo 10 tareas, en orden de dependencia. Cada una toca ≤3 archivos, entra en una sesión corta y deja `node --test` en verde (tests primero: se escriben en rojo, se implementa y se cierra en verde). Referencia: `plan.md` §11 y §12.

- [x] **T1. Cáscara estática y runner de tests.** RNF-2, RNF-8 (parcial), RNF-5 (título en español)
  - Archivos: `index.html`, `style.css`, `test/smoke.test.js`.
  - Objetivo: página con `<canvas id="game" width="960" height="600">`, `lang="es"`, título en español y hoja de estilos que centra el canvas a tamaño fijo. Sin lógica de juego todavía.
  - Hecho cuando: `node --test` pasa con el smoke test verde (canvas de 960 × 600, centrado por CSS sin `scale`, sin estilos inline, `lang="es"`); al servir con `python -m http.server 8000` se ve el fondo oscuro con el canvas centrado y la consola queda limpia.

- [x] **T2. Constantes, datos del Nivel 1 y estado inicial.** RF-2, RF-3, RF-4, RF-4b, RF-4c; RNF-2 (datos)
  - Archivos: `js/sim.js`, `js/levels.js`, `test/level.test.js`.
  - Objetivo: constantes del plan §4 (`220`, `60`, `12`, `24`, `36`, `960×600`), `createInitialState` y la geometría del plan §6 (perímetro de 24 px, obstáculo `{456,96,24,408}`, spawn `(120,300)`, meta `(816,536)`).
  - Hecho cuando: los tests de geometría pasan: perímetro cerrado en los cuatro bordes, spawn libre de paredes y de meta y a más de 36 px de ella, círculo de la meta (`x 792..840`, `y 512..560`) completamente dentro del área de juego, ningún AABB solapado con ese círculo (RF-4b), segmento spawn→meta bloqueado por el pilar (RF-4), ambas condiciones a la vez (RF-4c), BFS de 6 px desde el spawn alcanza el centro de la meta, pasos superior e inferior de 72 px ≥ diámetro con el corredor inferior cubriendo `y = 536`, y `META_TOUCH_DISTANCE === 36`.

- [x] **T3. Movimiento cardinal, paredes y contacto.** RF-5, RF-8, RF-10, RF-11, RF-13; RNF-3, CL-3
  - Archivos: `js/sim.js`, `test/movement.test.js`.
  - Objetivo: `step` con vector sin normalizar diagonal todavía, `movePlayer`/`resolveAxis` por ejes e `circleOverlapsRect`.
  - Hecho cuando: sin input la posición no cambia; una tecla avanza `3.6667 px` (±1e-9) por tick; al soltar no hay inercia; empujar la pared deja al jugador tangente y nunca dentro del AABB; 600 ticks de empuje no acumulan penetración; un test falla si `MOVE_SPEED / TICK_RATE` deja de ser menor que el grosor mínimo de pared.

- [x] **T4. Diagonal normalizada y teclas opuestas.** RF-6, RF-7, CL-1, RNF-1
  - Archivos: `js/sim.js`, `test/input.test.js`.
  - Objetivo: `directionFromInput` + `normalizeDirection` con `Math.SQRT1_2`, y `step` usando el vector unitario.
  - Hecho cuando: la diagonal recorre `3.6667 px` de módulo (no `× √2`); izquierda+derecha anula X y permite avanzar en Y; arriba+abajo anula Y; tres teclas equivalen a dos ortogonales; mantener teclas opuestas no produce oscilación entre ticks.

- [x] **T5. Deslizamiento, esquinas y estabilidad.** RF-11, RF-12, RF-13, CL-2
  - Archivos: `js/sim.js`, `test/slide.test.js`.
  - Objetivo: completar `movePlayer` con resolución X→Y, dos pasadas por eje y deslizamiento en paredes y en el obstáculo interior.
  - Hecho cuando: en diagonal contra la pared oeste el avance vertical se conserva; ídem contra el obstáculo; en la esquina inferior izquierda se detienen ambos ejes y la posición queda idéntica tick a tick durante 100 ticks; 300 ticks en diagonal contra una pared no atraviesan ningún AABB.

- [x] **T6. Victoria derivada y estado terminal.** RF-14, RF-16, RF-17, RF-18, CL-4, CL-5, CL-8, CL-13
  - Archivos: `js/sim.js`, `test/victory.test.js`.
  - Objetivo: `distance`, `touchesMeta`, `isWon` y el corte de `step` cuando ya hay victoria. La victoria no se guarda en el estado.
  - Hecho cuando: 36.1 px no gana, exactamente 36 gana, 35.9 gana; desde el spawn no gana; un recorrido real por los pasos hasta la meta gana; tocar la meta en contacto con pared gana; tras ganar, `step` con cualquier input devuelve la misma posición y sigue ganando; `step` no muta el estado recibido; 36 000 ticks quieto no cambian nada.

- [x] **T7. Render del cuarto.** RF-1, RF-4b (meta por encima de paredes), RNF-2, RNF-4
  - Archivos: `js/render.js`, `test/render.test.js`.
  - Objetivo: fondo `#14161a`, paredes `#3a4048`, meta `#ffb703` r=24 en `(816, 536)` con anillo y borde, jugador blanco r=12 con contorno; helpers puros `centeredRect` y `victoryLayout`.
  - Hecho cuando: el orden de dibujo es fondo → paredes → meta → jugador, con la meta pintada después de las paredes y en la posición `(816, 536)` (8 px por debajo del pilar, sin solape con él ni con la pared sur); `centeredRect(960, 600, w, h)` centra con tolerancia 0.5 px; importar `render.js` en Node no toca `document`; `node --test` verde.

- [x] **T8. Bucle de 60 Hz, teclado y foco.** RF-5 (cableado), RF-9, RNF-1, RNF-6, RNF-7, RNF-8, CL-7
  - Archivos: `js/main.js`, `index.html`.
  - Objetivo: acumulador de timestep fijo con `requestAnimationFrame`, `Set` de `event.code`, `preventDefault` en flechas, limpieza de teclas en `blur` y `visibilitychange`, `step` + `render` por frame. Sin temporizador ni reinicio.
  - Hecho cuando: se camina con WASD y con flechas sin que la página scrollee; al soltar todas las teclas el jugador se detiene en el siguiente tick; tras cambiar de foco el jugador está quieto hasta una nueva pulsación; la página abre sin errores de consola; el canvas sigue a 960 × 600 centrado.
  - Desvío real: el mapeo de códigos a `{ up, down, left, right }` se movió a `js/input.js` en T11; `main.js` conserva el `Set` de `event.code`, el `preventDefault` de flechas y el vaciado en `blur`/`visibilitychange`.

- [x] **T9. Pantalla de victoria.** RF-15, RF-16, RF-19, CL-6, CL-12, RNF-5
  - Archivos: `js/render.js`, `js/main.js`, `test/render.test.js`.
  - Objetivo: velo y panel con el texto literal `¡Nivel 1 completado!` centrado en el área de juego, texto blanco sobre panel opaco; ninguna tecla mueve, reinicia ni avanza de nivel.
  - Hecho cuando: el texto se dibuja centrado en 960 × 600 y el test de encuadre lo confirma; el mensaje permanece visible e idéntico mientras se mantienen teclas; no existe ningún handler de reinicio ni de cambio de nivel; `node --test` verde.

- [x] **T10. Guardas de pureza y determinismo; cierre del hito.** RNF-3, RNF-6, constitución 3; criterios de finalización de la spec
  - Archivos: `test/purity.test.js`, `test/determinism.test.js`.
  - Objetivo: guardas automáticas y verificación final. No se toca lógica salvo que un test revele un defecto.
  - Hecho cuando: `sim.js` no menciona `document`, `window`, `Math.random`, `Date` ni `performance`; `levels.js` no importa módulos de juego; la misma secuencia de inputs frame a frame produce posiciones idénticas en dos corridas; `node --test` completo en verde; `node --check` pasa en cada archivo de `js/`; recorrido manual completo del Nivel 1 (abrir, caminar, deslizar, ganar, ver `¡Nivel 1 completado!` sin reinicio) validado también con Chrome DevTools, incluyendo que desde el spawn se ve el círculo completo de la meta por debajo del pilar, sin taparse con ninguna pared.

## Correcciones tras la validación

T11 y T12 nacen de los cambios necesarios del tester y quedan fuera del límite original de 10 tareas: no agregan comportamiento ni RF nuevos, solo hacen verificable lo que ya exige la spec (plan `§9`, `§11`, `§12`).

- [x] **T11. Mapeo de teclas puro.** RF-9, CL-7
  - Archivos: `js/input.js`, `js/main.js`, `test/keyboard.test.js`.
  - Objetivo: extraer de `main.js` el mapeo de códigos a entrada en un módulo puro sin DOM (`KEY_BINDINGS`, `keysToInput`, `isArrowCode`) que `main.js` importe; `main.js` conserva el `Set` de `event.code`, el `preventDefault` de flechas y el vaciado en `blur`/`visibilitychange`, sin lógica de mapeo duplicada. `sim.js` sigue sin conocer códigos de teclado.
  - Hecho cuando: `node --test` verde con tests de `keysToInput` para WASD, flechas, teclas desconocidas, `Set` vacío y combinaciones (opuestas apagan su eje); `isArrowCode` verdadero solo para las cuatro flechas; un test de comportamiento vacía el set, pasa la entrada a `step` y comprueba que el jugador no se mueve tick a tick, y que una pulsación nueva sí lo mueve; `input.js` no menciona `document`/`window` ni importa `sim.js`.

- [x] **T12. Contraste verificable.** RNF-4
  - Archivos: `js/render.js`, `test/render.test.js`.
  - Objetivo: exportar `relativeLuminance` y `contrastRatio` (WCAG 2.x) y `COLORS`, de modo que el render use constantes exportadas en vez de strings de color sueltos.
  - Hecho cuando: `relativeLuminance` da 0 para `#000000` y 1 para `#ffffff`; `contrastRatio` es simétrico y máximo entre blanco y negro; sobre los hex de `COLORS` los umbrales del plan se cumplen (texto/panel ≥ 4.5:1, jugador/fondo ≥ 3:1, jugador/pared ≥ 3:1, meta/fondo ≥ 3:1); los tests de render siguen verificando que la meta se reconoce por forma (`arc` + borde + anillo interior); `node --test` verde.
