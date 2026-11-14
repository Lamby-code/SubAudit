# Plan 001 — Esqueleto y Nivel 1

Estado: borrador
Base: `specs/001-esqueleto-nivel-1/spec.md` (aprobada). Este plan no agrega comportamiento: solo decide cómo se cumple cada RF.

## 1. Alcance técnico

Página estática sin dependencias: HTML + CSS + JS vanilla (ES2022, módulos ES) + Canvas 2D, servida con `python -m http.server 8000`. Sin `package.json`, sin bundler, sin backend. Node v26.13.0 detecta ESM en `.js` sin configuración, así que `node --test` y `node --check` funcionan directo.

Hito: un cuarto, un jugador que se mueve con WASD/flechas, paredes sólidas con deslizamiento, meta con victoria y mensaje en español. **Nada** de loop, grabación, fantasmas, rastro, placas, puertas, láser, rewind, pausa, reinicio ni menús.

## 2. Archivos y responsabilidades

| Archivo | Responsabilidad | No hace |
|---|---|---|
| `index.html` | Documento con `<canvas id="game" width="960" height="600">`, idioma `es`, título de pestaña, `<script type="module" src="./js/main.js">`. | No contiene lógica ni estilos inline. |
| `style.css` | Fondo `#14161a`, centrado del canvas con flexbox, `canvas { width: 960px; height: 600px; display: block; }` (tamaño fijo, sin escalado), tipografía base. | No dibuja el juego. |
| `js/sim.js` | Constantes numéricas, estado inicial, movimiento, colisiones círculo-AABB, detección de victoria. **Puro y determinista**: no importa nada del navegador, no usa `Math.random`, `Date`, `performance` ni `requestAnimationFrame`. | No crea canvas, no lee eventos, no dibuja, no reproduce audio. |
| `js/levels.js` | Datos del Nivel 1: spawn, meta, lista de paredes, nombre del nivel y área de juego. **Datos puros**, sin lógica de colisión. | No importa `render.js` ni `main.js`. |
| `js/render.js` | Todo el dibujo del canvas: fondo, paredes, meta, jugador y superposición de victoria. Funciones puras auxiliares de encuadre (rectángulo centrado) exportadas para test. Al importarse en Node no toca `document` a nivel de módulo. | No calcula física ni lee teclado. |
| `js/main.js` | Boot: obtiene el canvas y el contexto, arma el estado inicial, escucha teclado y `blur`, corre el bucle de timestep fijo y llama a `step` y `render`. Único archivo que conoce DOM y eventos. | No contiene reglas de movimiento ni de victoria. |
| `test/*.test.js` | Pruebas de `node --test` sobre `sim.js`, `levels.js` y las funciones de encuadre de `render.js`, más guardas de pureza. | No simulan DOM ni canvas real. |

Regla de dependencias: `levels.js` ← `sim.js` ← `main.js` ← `render.js` → solo `main.js` importa los tres; `render.js` puede importar constantes de `sim.js` para radios y no duplica números.

## 3. Estado y modelo de datos

Sin flags ocultos (constitución, principio 3 y §10.4 del diseño): el estado mínimo es geometría.

```js
// State
{ level, player: { x, y, r } }          // level = objeto de levels.js

// Input (ya normalizado por main.js)
{ up, down, left, right }               // booleanos

// Wall (AABB)
{ x, y, w, h }
```

- La victoria **no se guarda**: `isWon(state)` la deriva de la distancia entre centros (`≤ 36 px`). No existe `state.won`, ni `messageShown`, ni `levelComplete`.
- No hay temporizador, ni `t`, ni `lap`, ni `dead` (RF-18, fuera de alcance).
- `step` **no muta**: devuelve un estado nuevo (`{ level, player: { ... } }`). Si ya hay victoria, devuelve el mismo estado sin tocar al jugador (RF-16).

### 3.1 Estado inicial del Nivel 1

`createInitialState(level)` devuelve `{ level, player: { x: level.spawn.x, y: level.spawn.y, r: PLAYER_RADIUS } }`. Siempre el mismo punto (RF-2). El punto de aparición está libre de paredes y a más de 36 px de la meta, por lo que la partida no arranca ganada.

## 4. Constantes (`js/sim.js`)

```js
export const TICK_RATE = 60;
export const TICK_SECONDS = 1 / TICK_RATE;          // 1/60 s
export const MOVE_SPEED = 220;                       // px/s (Apéndice C)
export const PLAYER_RADIUS = 12;                     // px
export const META_RADIUS = 24;                       // px
export const META_TOUCH_DISTANCE = PLAYER_RADIUS + META_RADIUS; // 36 px (RF-14)
export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 600;
```

## 5. Funciones puras de `js/sim.js`

| Función | Firma | Qué hace | RF |
|---|---|---|---|
| `createInitialState` | `(level) → State` | Crea el estado con el jugador en `level.spawn` y radio 12. | RF-2 |
| `directionFromInput` | `(input) → {x, y}` | Traduce booleanos a vector con componentes en `-1, 0, 1`; dos teclas opuestas en un eje dan `0` en ese eje. | RF-5, RF-7, CL-1 |
| `normalizeDirection` | `(dir) → {x, y}` | Devuelve el vector unitario (módulo 1) o `{0,0}` si no hay dirección; diagonal dividida por `√2`. | RF-6 |
| `circleOverlapsRect` | `(cx, cy, r, rect) → boolean` | Solapamiento círculo-AABB por distancia al punto más cercano del rectángulo. | RF-11 |
| `resolveAxis` | `(player, walls, dx, dy) → {x, y}` | Aplica un desplazamiento en un solo eje y empuja al jugador fuera de cada pared que solape, según el signo del movimiento (dos pasadas para esquinas). | RF-11, RF-12, RF-13 |
| `movePlayer` | `(player, walls, dx, dy) → {x, y}` | Resuelve primero el eje X y luego el Y (movimiento separado por ejes) para producir deslizamiento. | RF-11, RF-12, CL-2 |
| `distance` | `(a, b) → number` | Distancia euclidiana entre dos puntos. | RF-14 |
| `touchesMeta` | `(state) → boolean` | `distance(player, state.level.meta) ≤ META_TOUCH_DISTANCE`. | RF-14, CL-13 |
| `isWon` | `(state) → boolean` | Alias semántico de `touchesMeta`; es el único criterio de victoria. | RF-14, RF-17 |
| `step` | `(state, input) → State` | Si `isWon(state)`, devuelve el estado intacto. Si no: vector de entrada normalizado × `MOVE_SPEED × TICK_SECONDS`, `movePlayer`, devuelve estado nuevo. | RF-5, RF-6, RF-8, RF-10, RF-16 |

Pseudocódigo de `step`:

```
step(state, input):
  if isWon(state): return state
  dir = normalizeDirection(directionFromInput(input))
  if dir.x == 0 and dir.y == 0: return { level: state.level, player: { ...state.player } }  # inmóvil, sin inercia
  stepPx = MOVE_SPEED * TICK_SECONDS                         # 3.6667 px
  next = movePlayer(state.player, state.level.walls, dir.x * stepPx, dir.y * stepPx)
  return { level: state.level, player: next }
```

Pseudocódigo de `resolveAxis` (una pasada de X, otra de Y en `movePlayer`):

```
resolveAxis(player, walls, dx, dy):
  next = { x: player.x + dx, y: player.y + dy, r: player.r }
  repeat twice:
    for wall in walls:
      if not circleOverlapsRect(next.x, next.y, next.r, wall): continue
      if dx > 0: next.x = wall.x - next.r
      elif dx < 0: next.x = wall.x + wall.w + next.r
      elif dy > 0: next.y = wall.y - next.r
      elif dy < 0: next.y = wall.y + wall.h + next.r
  return next
```

Notas de diseño de la colisión:

- El paso máximo por tick es `220 / 60 ≈ 3.67 px`, menor que el grosor de pared (24 px) y que el diámetro del jugador (24 px); por eso el desplazamiento discreto no puede tunelar (RNF-3). No hace falta *swept collision*.
- Resolver por ejes produce deslizamiento gratis: si X queda bloqueado, Y avanza (RF-12).
- El empuje deja el cuerpo **exactamente** tangente a la cara de la pared (`wall.x - r`), lo que da contacto estable y no acumula penetración (RF-13, CL-3).
- En una esquina interior, X e Y se resuelven contra las dos paredes y el jugador queda encajado sin vibrar (CL-2).

## 6. Geometría del Nivel 1 (`js/levels.js`)

Canvas 960 × 600. Paredes de perímetro de 24 px de grosor; una pared interior vertical de 24 × 408 px que deja dos pasos de 72 px arriba y abajo.

```
x=0      24      120              456 480            816        936 960
y=0   +------------------------------------------------------------+
      |                                                            |  ← N
y=24  |                                                            |
      |                       +----+                               |
y=96  |                       |    |                               |
      |                       |    |                               |
y=300 |      (spawn)          |    |                               |
      |                       |    |                               |
y=504 |                       +----+                               |
      |                                             .-~~~-.        |
y=512 |                                            ( meta )        |
y=536 |                                             `-~~~-´        |
y=560 |                                                            |
y=576 +------------------------------------------------------------+  ← S
y=600
```

| Elemento | Valores |
|---|---|
| Área de juego | 960 × 600, con paredes en todo el perímetro |
| Pared norte | `{ x: 0, y: 0, w: 960, h: 24 }` |
| Pared sur | `{ x: 0, y: 576, w: 960, h: 24 }` |
| Pared oeste | `{ x: 0, y: 0, w: 24, h: 600 }` |
| Pared este | `{ x: 936, y: 0, w: 24, h: 600 }` |
| Obstáculo interior | `{ x: 456, y: 96, w: 24, h: 408 }` (de y=96 a y=504) |
| Spawn | `{ x: 120, y: 300 }`, radio 12 |
| Meta | `{ x: 816, y: 536 }`, radio 24 (círculo de x=792 a x=840, de y=512 a y=560) |

**Definición operativa de "visible desde el spawn" (RF-4b):** se juega en una vista cenital plana, sin cámara ni perspectiva; no hay sombras ni línea de visión. Por lo tanto, "la meta es visible desde el spawn" significa exactamente tres cosas, y es lo que se testea:

1. El círculo completo de la meta (centro `(816, 536)`, radio 24) está **dentro del área de juego** (entre `x = 24..936` y `y = 24..576`), sin tocar ninguna pared.
2. **Ningún AABB de pared se solapa** con el círculo de la meta.
3. El render dibuja la meta **después** de las paredes, así que siempre queda por encima del fondo y de la geometría.

Una pared que bloquea el camino recto **no oculta** la meta si no cubre sus píxeles: la meta sigue dibujada, completa y a la vista al otro lado del pilar, simplemente hay que rodear. No se promete línea de visión libre, porque eso sería incompatible con RF-4 (que exige un obstáculo en el camino recto).

Verificación de los RF de geometría:

- **RF-4 (no hay línea recta):** el segmento spawn→meta va de `(120, 300)` a `(816, 536)`; al pasar por `x = 456` está en `y ≈ 413.9` y al pasar por `x = 480` en `y ≈ 422.1`, ambos dentro del tramo `y = 96..504` del obstáculo. La recta queda bloqueada; para llegar hay que subir o bajar por los pasos de 72 px (entre `y = 24` y `y = 96`, o entre `y = 504` y `y = 576`).
- **RF-4b (meta visible desde el spawn):** según la definición operativa, el círculo de la meta (`x = 792..840`, `y = 512..560`) queda 8 px por debajo del borde inferior del pilar (`y = 504`), 16 px por encima de la pared sur (`y = 576`) y 96 px a la izquierda de la pared este (`x = 936`). No se solapa con ningún AABB y está completamente dentro del área de juego; el render la dibuja después de las paredes. La meta además queda claramente "por debajo" del pilar, no detrás de él en la línea de la mirada.
- **RF-4c (ambas a la vez):** la geometría satisface las dos condiciones simultáneamente. Hay tests para cada una y para su coexistencia: el segmento recto choca con el pilar y, a la vez, el círculo de la meta no toca ninguna pared y está dentro del área.
- **Paso inferior:** 72 px libres entre el pilar (`y = 504`) y la pared sur (`y = 576`); con radio 12 el centro del jugador circula entre `y = 516` y `y = 564` (48 px de holgura). El centro de la meta (`y = 536`) cae dentro de ese corredor, así que se llega bajando por la izquierda, cruzando el paso inferior y avanzando en línea recta hasta la meta (CL-4, CL-10).
- **Paso superior:** 72 px libres entre la pared norte (`y = 24`) y el pilar (`y = 96`); centro entre `y = 36` y `y = 84`. Sigue siendo transitable, aunque es el camino largo.
- **RF-3 / CL-9:** las cuatro paredes de perímetro se solapan en las esquinas y cubren todo el borde; no hay hueco.
- **RF-2:** el spawn (120, 300) está a 96 px de la pared oeste, a 336 px del obstáculo y a más de 36 px de la meta; libre y sin victoria instantánea.
- **Recorrido estimado (paso inferior):** ~240 px de bajada + ~660 px de avance horizontal hasta tocar la meta ≈ 900 px ≈ 4.1 s a 220 px/s; con titubeos, holgadamente dentro de la estimación de 30 s del diseño.

No se agregan más paredes ni decoración: el Nivel 1 enseña a moverse y a leer el tono visual.

## 7. Bucle principal (`js/main.js`)

- `requestAnimationFrame` solo agenda; el tiempo real nunca entra en la simulación.
- Acumulador fijo:
  - `accumulator += Math.min(elapsed, 0.25)` (corte anti-espiral si la pestaña estuvo en pausa).
  - `while (accumulator >= TICK_SECONDS) { state = step(state, readInput()); accumulator -= TICK_SECONDS; }`
  - `render(ctx, state)` una vez por frame visual.
- Máximo de ticks por frame visual opcional (p. ej. 5) para no congelar tras un `blur` largo; el estado resultante es el mismo porque cada tick es determinista.
- **Input:** `Set` de `event.code` (`KeyW`, `KeyA`, `KeyS`, `KeyD`, `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`); `preventDefault()` en las flechas para que no scrollee la página. `readInput()` arma `{ up, down, left, right }` desde el set.
- **RF-9 / CL-7:** en `window.blur` se vacía el set de teclas, así que al volver el jugador está quieto hasta una nueva pulsación. También se vacía en `visibilitychange` oculto.
- RF-16/RF-19: no hay manejadores de reinicio ni de cambio de nivel; con victoria, `step` ignora el input y el render mantiene el mensaje.

## 8. Render (`js/render.js`)

Orden de dibujo: fondo → paredes → meta → jugador → superposición de victoria.

| Elemento | Dibujo | Motivo |
|---|---|---|
| Fondo | `fillRect` completo `#14161a` | Contraste (RNF-4) |
| Paredes | `fillRect` `#3a4048` | Sólido, distinto del fondo por luminancia |
| Meta | círculo `#ffb703` de radio 24 + anillo interior más claro y borde oscuro | Objetivo reconocible sin depender solo del color (RNF-4) |
| Jugador | círculo blanco `#ffffff` radio 12 + contorno oscuro | Se lee sobre pared y fondo |
| Victoria | velo `rgba(20,22,26,0.72)` + panel centrado + texto `¡Nivel 1 completado!` | RF-15, RNF-5 |

- Funciones puras exportadas para test: `centeredRect(areaW, areaH, w, h) → {x, y, w, h}` (centrado exacto del panel) y `victoryLayout(areaW, areaH, textWidth, textHeight) → {panel, textX, textY}`.
- El texto usa `bold 36px system-ui, sans-serif`, `fillStyle: '#ffffff'`, `textAlign: 'center'`, `textBaseline: 'middle'`, centrado en el área de juego (960 × 600), no en la ventana.
- El panel tiene borde claro y el texto está sobre fondo opaco: legible sin depender del color (RF-15). El texto es literal, con `¡` y `!` (RNF-5, CL-12).
- Sin `devicePixelRatio`: el canvas se dibuja a 960 × 600 y CSS lo muestra a 960 × 600; el tamaño es fijo y centrado, sin escalado (RNF-2).

## 9. Decisiones técnicas y alternativas descartadas

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Movimiento separado por ejes (`movePlayer` resuelve X y luego Y) | Resolver el desplazamiento diagonal con vector y *push-out* general | El enfoque por ejes da deslizamiento y contacto estable sin trigonometría ni casos especiales; el general produce atascos y vibración en esquinas. |
| Colisión discreta (sin *swept*), confiando en `paso (3.67 px) < grosor de pared (24 px)` | *Swept collision* con subpasos | Con el timestep fijo y estas velocidades el tunelado es imposible; subpasos agregan complejidad y costo sin beneficio (RNF-3 queda garantizado por invariante testeado). |
| Victoria derivada de la distancia (`isWon`) | `state.won = true` y flag de mensaje mostrado | La constitución prohíbe flags ocultos y el diseño exige derivar el estado de posiciones; además hace RF-17 idempotente sin código extra. |
| `step` devuelve un estado nuevo | Mutar el estado en el lugar | Facilita tests de determinismo y evita efectos colaterales; el estado es chico (2 objetos). |
| Estado mínimo `{ level, player }` sin `tick` | Guardar contador de frames y tiempo | No hay límite de tiempo ni grabación en este hito; agregar tiempo ahora sería estado muerto que la spec 002 redefiniría. |
| Input como `{ up, down, left, right }` normalizado en `main.js` | Pasar el `Set` de teclas a `sim.js` | `sim.js` no debe conocer códigos de teclado del navegador; así es puro y testeable con objetos literales. |
| Constantes numéricas exportadas desde `sim.js` | Archivo `js/constants.js` o duplicarlas en `render.js` | Una sola fuente de verdad para radios y velocidad sin sumar un módulo; `render` importa radios desde `sim`. |
| Pared interior vertical con dos pasos laterales | Laberinto en S o una pared con un solo paso | Un solo obstáculo ya cumple RF-4/4b/4c y enseña el verbo caminar sin frustrar; más geometría es contenido de niveles posteriores. |
| Canvas de tamaño fijo 960 × 600, sin `devicePixelRatio` | Escalado responsivo o *fit* al viewport | La spec exige tamaño fijo, centrado y sin estiramiento; el escalado introduce diferencias subpíxel entre equipos y complica RNF-2. |
| Mensaje de victoria dibujado en el canvas | Elemento HTML superpuesto | Un solo lugar de render, sin sincronización de estilos; el texto sigue siendo seleccionable/discernible y la spec no exige DOM semántico. |
| `node --test` sobre módulos ES puros | Frameworks de test o jsdom | Cero dependencias (constitución, principio 1); `sim.js` y `levels.js` no necesitan DOM y las funciones de encuadre de `render.js` son matemática pura. |

## 10. Determinismo y pureza

- `js/sim.js` no importa `render.js`, `main.js` ni nada del navegador; no usa `Math.random`, `Date`, `performance`, `requestAnimationFrame`, `window`, `document` ni `localStorage`.
- Toda la entrada externa entra por el parámetro `input`; no hay tiempo real dentro de la simulación. `TICK_SECONDS` es una constante, no un reloj.
- Números: punto flotante IEEE-754 con las mismas operaciones y el mismo orden ⇒ mismo resultado en el mismo equipo. No se usan funciones trigonométricas ni acumulación dependiente de frames visuales (`√2` es una constante `Math.SQRT1_2`).
- `step` es función pura: mismo `(state, input)` ⇒ mismo resultado, sin leer ni escribir fuera. Los tests lo verifican ejecutando la misma secuencia de inputs dos veces y comparando posiciones exactas (RNF-6).
- Guardas automáticas (`test/sim.test.js` o `test/purity.test.js`): leer el fuente de `sim.js` y fallar si contiene `document`, `window`, `Math.random`, `Date` o `performance`.

## 11. Estrategia de tests (`node --test`)

Los tests importan `sim.js`, `levels.js` y las funciones de encuadre de `render.js`. No hay DOM, ni canvas real, ni red. Comando: `node --test` en la raíz (detecta `test/*.test.js`).

| Archivo | Casos | RF |
|---|---|---|
| `test/smoke.test.js` | `index.html` declara `<canvas ... width="960" height="600">` y `lang="es"`; `style.css` fija el canvas a 960 × 600 centrado, sin `scale` ni `transform`. | RNF-2, RNF-8 |
| `test/level.test.js` | El perímetro cubre los cuatro bordes sin huecos; spawn libre de paredes y de la meta y a más de 36 px de ella; el círculo completo de la meta (centro `(816,536)`, radio 24) está dentro del área de juego con margen ≥ 1 px a cada pared; ningún AABB de pared se solapa con ese círculo (RF-4b); el segmento spawn→meta intersecta el pilar interior (RF-4); ambas cosas a la vez (RF-4c); BFS en grilla de 6 px desde el spawn alcanza el centro de la meta (CL-9, CL-10); el paso superior y el inferior miden ≥ diámetro del jugador y el corredor del centro en el paso inferior contiene `y = 536`. | RF-2, RF-3, RF-4/4b/4c, CL-9, CL-10 |
| `test/movement.test.js` | Sin input la posición no cambia (RF-8); una tecla mueve `220/60 ≈ 3.6667 px` por tick en el eje correcto (RF-5, RNF-1); al soltar, el siguiente tick no se mueve (RF-10); caminar contra la pared oeste/sur deja al jugador exactamente tangente y nunca dentro del AABB (RF-11, RF-3); 600 ticks empujando la pared no acumulan penetración (RF-13, CL-3); el paso máximo es menor que el grosor mínimo de pared y que el diámetro (RNF-3). | RF-3, RF-5, RF-8, RF-10, RF-11, RF-13, RNF-3 |
| `test/input.test.js` | Diagonal `up+right` recorre `220/60 px` de módulo, no `× √2` (RF-6); `left+right` deja X quieto y permite avanzar en Y (RF-7, CL-1); `up+down` anula Y; tres teclas se comportan como dos ortogonales; teclas opuestas no producen oscilación. | RF-6, RF-7, CL-1 |
| `test/slide.test.js` | Diagonal contra la pared oeste conserva el avance vertical (RF-12); diagonal contra el obstáculo interior conserva el avance vertical; esquina inferior izquierda: X e Y se detienen y la posición queda estable tick a tick (CL-2); empujar en diagonal 300 ticks no atraviesa ninguna pared. | RF-11, RF-12, RF-13, CL-2 |
| `test/victory.test.js` | Distancia 36.1 ⇒ no gana; exactamente 36 ⇒ gana (CL-13); 35.9 ⇒ gana; desde el spawn `isWon` es `false`; recorrido completo por los pasos hasta la meta ⇒ gana (CL-4, CL-10); tras ganar, `step` con input devuelve la misma posición y sigue ganando (RF-16, CL-6); tocar meta en contacto con pared ⇒ gana (CL-5); 36000 ticks quieto no produce derrota ni cambio de estado (CL-8, RF-18); `step` no muta el estado original. | RF-14, RF-16, RF-17, RF-18, CL-4/5/6/8/13 |
| `test/render.test.js` | `centeredRect` centra el panel en 960 × 600 con tolerancia 0.5 px; `victoryLayout` devuelve el texto centrado en el área de juego y dentro del panel; ninguna función de encuadre depende de tamaño de ventana. | RF-15, RNF-2, CL-12 |
| `test/purity.test.js` | El fuente de `sim.js` no menciona `document`, `window`, `Math.random`, `Date`, `performance`; `levels.js` no importa `sim.js`, `render.js` ni `main.js`; los radios de meta/jugador son 24/12 y `META_TOUCH_DISTANCE` es 36. | RNF-3, RNF-6, constitución 3 |
| `test/determinism.test.js` | La misma secuencia de estados de teclas frame a frame, repetida dos veces, produce posiciones idénticas bit a bit; el resultado no depende de cuántos pasos se agrupen por frame visual (5 ticks en un frame = 5 llamadas a `step`). | RNF-6, RF-5 |

Criterio de test: cada test nombra el RF en el título (`test('RF-12: ...')`) para trazabilidad directa.

## 12. Trazabilidad RF → plan

| RF | Dónde se cumple |
|---|---|
| RF-1 | §8 render (fondo, paredes, meta, jugador) + §2 `index.html` |
| RF-2 | §3.1, §5 `createInitialState`, §6 spawn, `test/level.test.js` |
| RF-3 | §6 perímetro, §5 colisión, `test/movement.test.js`, `test/level.test.js` |
| RF-4 / RF-4b / RF-4c | §6 geometría y verificaciones, `test/level.test.js` |
| RF-5, RF-6, RF-7, RF-8, RF-10 | §4, §5 `directionFromInput` / `normalizeDirection` / `step`, `test/movement.test.js`, `test/input.test.js` |
| RF-9 | §7 `blur` + `visibilitychange` |
| RF-11, RF-12, RF-13 | §5 `resolveAxis` / `movePlayer`, `test/movement.test.js`, `test/slide.test.js` |
| RF-14, RF-17 | §4 `META_TOUCH_DISTANCE`, §5 `touchesMeta` / `isWon`, `test/victory.test.js` |
| RF-15 | §8 superposición de victoria, `test/render.test.js` |
| RF-16, RF-19 | §5 `step` corta con victoria, §7 sin manejadores de reinicio, `test/victory.test.js` |
| RF-18 | §3 sin temporizador, `test/victory.test.js` (CL-8) |
| RNF-1 | §7 acumulador de 60 Hz, `test/movement.test.js` |
| RNF-2 | §2 `style.css`, §8 canvas fijo, `test/smoke.test.js`, `test/render.test.js` |
| RNF-3 | §5 invariante paso < grosor, `test/movement.test.js`, `test/purity.test.js` |
| RNF-4 | §8 contraste y formas, revisión visual |
| RNF-5 | §8 texto literal, RF-15 |
| RNF-6 | §10, `test/victory.test.js`, `test/purity.test.js` |
| RNF-7 | §7 solo teclado |
| RNF-8 | §2, `test/smoke.test.js`, `node --check` |

## 13. Riesgos y mitigaciones

1. **Interpretación de RF-4b.** La vista es cenital plana, sin cámara ni sombras, así que "visible" se define operativamente en §6: círculo de la meta dentro del área, sin solape con ningún AABB y dibujado por encima de las paredes. Con la meta en `(816, 536)` — 8 px por debajo del pilar y 16 px por encima de la pared sur — la meta se ve completa y claramente por debajo del obstáculo, no "detrás" de él. Riesgo residual: solo aparece si alguien exige línea de visión estricta (rayo sin obstáculos desde el spawn); esa lectura es incompatible con RF-4, que obliga a poner una pared en el camino recto, así que se descarta y se documenta la definición operativa en su lugar.
2. **Tunelado si cambian las constantes.** Un test verifica `MOVE_SPEED / TICK_RATE < min(espesor de pared)`, así que subir la velocidad o bajar el tick rompe el test y obliga a decidir (subpasos) antes de shippear.
3. **`node --check js/*.js` en Windows.** PowerShell/cmd no expanden el glob. Validar con `node --check js/sim.js` (y cada archivo) o desde Git Bash; documentarlo en el cierre de tarea.
4. **ESM sin `package.json`.** Node 26 detecta módulos por sintaxis; si alguna versión de Node lo hiciera distinto, el fallback es importar con extensión `.js` desde el HTML y no agregar `type` (el navegador ya usa `type="module"`).
5. **Fluctuación del timestep en el navegador.** El acumulador y el corte de `elapsed` evitan que un frame lento altere la simulación; la simulación solo depende de la cantidad de ticks, no del reloj.
6. **Teclas retenidas al cambiar de foco.** Se limpia el set en `blur` y en `visibilitychange`; CL-7 cubierto.
7. **Baja resolución de dibujo en pantallas HiDPI.** Decisión consciente: tamaño fijo sin `devicePixelRatio` para cumplir RNF-2. Si se ve borroso, se resuelve en una spec posterior, no acá.
8. **Validación visual.** El MCP de Chrome DevTools se usa para abrir `http://localhost:8000`, capturar el cuarto y la pantalla de victoria, y confirmar centrado y legibilidad; no reemplaza los tests ni agrega dependencias al proyecto.

## 14. Orden de implementación

Ver `tasks.md`: 10 tareas, de la cáscara de página (T1) a la validación final (T10). Las tareas de lógica van con tests en rojo primero (constitución, principio 4) y cada una deja `node --test` en verde.
