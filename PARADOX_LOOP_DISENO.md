# PARADOX LOOP — Versión 7 días (Webapp)

**Plan de producción y diseño — v1.0**
Fecha: 2026-11-12
Objetivo: videojuego jugable en navegador, terminado y publicado en **menos de 7 días**.
Este documento reemplaza al GDD largo para este deadline. Conserva las ideas de diseño que hacen bueno al juego y descarta todo el aparato de producto comercial.

---

## 0. Ficha

| Campo | Definición |
|---|---|
| Formato | Webapp jugable en navegador. |
| Stack | HTML + CSS + JavaScript vanilla + Canvas 2D. |
| Dependencias | **Cero.** Sin frameworks, sin build, sin npm, sin backend. |
| Contenido | 4 niveles, 10–15 minutos. |
| Equipo | 1 persona. |
| Entregable | Link público jugable + repo + video de 60 s. |
| Plataforma | Desktop (teclado + mouse). Sin mobile. |

**Regla número uno del proyecto:** si una feature no está en este documento, no se hace.

---

## 1. Pitch

Un puzzle donde la solución es una grabación de vos mismo.

Cada nivel es un cuarto y un loop de 20 segundos. Cuando el loop termina, volvés a empezar y tu vuelta anterior se convierte en un fantasma sólido que repite exactamente lo que hiciste. Diez vueltas después sos una cuadrilla de versiones de vos mismo, y el único camino a la salida pasa por el hueco que dejó tu propia historia.

> **Sos tu peor enemigo. También sos la única ayuda que vas a tener.**

---

## 2. La regla única

> ### El presente es blando. El pasado es duro.

| Elemento | Presente | Pasado |
|---|---|---|
| Tu rastro | No colisiona | **Pared** que bloquea al jugador |
| Tu cuerpo | Controlable | **Pared móvil** que empuja y aplasta |
| Placas y puertas | Interactúa | Interactúa (los fantasmas son manos válidas) |
| Geometría del cuarto | Colisiona | La ignora (el pasado atraviesa el presente) |
| Láser | Te mata | El fantasma lo bloquea |

Todo el juego se deduce de esa tabla. Si el jugador necesita el manual, el nivel está mal.

---

## 3. Alcance: qué entra y qué no

### 3.1 Entra (obligatorio)

- Loop de 20 segundos y 4 vueltas máximo.
- Grabación y reproducción de fantasmas.
- Fantasmas sólidos que empujan y aplastan.
- Rastro como pared.
- Placas de presión y puertas.
- Un láser (nivel 4).
- Rewind gratis.
- Barra de tiempo con marcas de vuelta.
- Render de rutas por color.
- Preview de los fantasmas 2 segundos en el futuro.
- Carta de muerte con causa.
- 4 niveles.
- Pantalla de victoria y selector de nivel.

### 3.2 No entra (prohibido)

- Arma y disparos. **Es stretch, ver §12.**
- Editor de niveles.
- Guardado / localStorage (salvo progreso trivial).
- Narrativa, diálogos, cinemáticas.
- Audio (salvo 2–3 SFX si sobra tiempo).
- Mobile, gamepad, accesibilidad avanzada.
- Multijugador.
- Backend, cuentas, base de datos.
- Motor externo (Godot, Unity, Phaser, Three.js).
- 45 niveles. **Cuatro.**

---

## 4. Modelo temporal

No hay rondas. Hay una línea de tiempo y un playhead.

```
t=0                    t=20s                  t=40s
|---- vuelta 1 ----|---- vuelta 2 ----|---- vuelta 3 ----|
                                            ^
                                         playhead
```

- **Loop (T):** 20 s fijos, 60 Hz → 1200 frames por vuelta.
- **Vuelta:** una repetición. Cada vuelta arranca en el spawn.
- **Nivel:** 2 a 4 vueltas.
- **Fantasma:** la grabación de una vuelta anterior.
- **Rewind:** mover el playhead hacia atrás y descartar el futuro. Gratis.

### 4.1 El loop es un turno

Es un **puzzle por turnos donde cada turno es una grabación de 20 segundos**. El jugador puede pausar en cualquier momento. No hay reflejos en ningún punto.

---

## 5. Verbos

| Verbo | Input | Costo | Efecto |
|---|---|---|---|
| Caminar | WASD / flechas | — | Dibuja el rastro. |
| Pausar | Espacio | — | Congela el tiempo. |
| Rebobinar | Mantener R | — | Retrocede el playhead. |
| Reiniciar nivel | Supr | — | Borra todo. |

Sin disparo en la v1. Ver §12 para el stretch.

---

## 6. Fantasmas

- Reproducen su trayectoria grabada. **Kinemáticos:** sin física, sin colisiones con geometría.
- Atraviesan paredes, rastros y a otros fantasmas.
- **Son sólidos para el jugador.** Empujan.
- **Son inmunes a todo.** No se matan, no se empujan, no se bloquean.
- Activan placas y bloquean láseres.
- No pueden tocar la meta por vos.

### 6.1 Trabajos

| Trabajo | Qué hace |
|---|---|
| **Sostén** | Se queda parado sobre una placa. |
| **Pared** | Se queda en un pasillo. |
| **Bloqueo** | Se queda dentro de un láser. |
| **Relevo** | Termina la vuelta en el lugar exacto donde la siguiente lo necesita. |

---

## 7. Fallos

| Muerte | Causa | Texto |
|---|---|---|
| Aplastamiento | Un fantasma te empuja contra una pared y no hay salida. | "Te cerró tu vuelta 2." |
| Láser | Tocás un láser activo. | "Te cortó el láser." |
| Sin tiempo | Se agota la última vuelta. | "Se terminó el loop." |

- Slow-motion de 0,4 s.
- Carta de muerte: vuelta + segundo + causa.
- Botón "rebobinar a esta vuelta".
- **No existe game over.** Rebobinar es gratis.

---

## 8. Los cuatro niveles

### Nivel 1 — "Caminar"
Un cuarto, una meta, sin fantasmas. 30 segundos.
**Enseña:** mover, meta, tono visual.

### Nivel 2 — "El sostén" (2 vueltas)
Una placa en el centro. Una puerta a la derecha que **solo abre mientras la placa está apretada**. La placa está lejos de la puerta.

```
+--------------------------------------------------+
|                                                  |
|   [spawn]        (A)                  [meta]     |
|                   |                    |         |
|                   |       puerta ------+         |
+--------------------------------------------------+
```

**Solución:** vuelta 1 pisás A y te quedás hasta que termina el loop. Vuelta 2: tu fantasma sostiene A, la puerta está abierta, caminás a la meta.
**Enseña:** existe el loop, existe el rewind, el pasado es sólido y **puede trabajar para vos**.

### Nivel 3 — "El relevo" (3 vueltas)
Placa A abre la **puerta 1**, que da acceso a la **placa B**. La puerta final necesita **A y B a la vez**.

**Solución:** vuelta 1 sostenés A. Vuelta 2 cruzás la puerta 1 y sostenés B. Vuelta 3, con A y B sostenidas por fantasmas, caminás a la meta.
**Enseña:** repartir trabajos y encadenar vueltas.

### Nivel 4 — "La cuadrilla" (4 vueltas)
Placa A abre la puerta 1. Un **láser** corta el pasillo central. Placa B abre la puerta final.

**Solución:** vuelta 1 sostenés A. Vuelta 2 te metés en el láser y te quedás (el fantasma lo bloquea). Vuelta 3 sostenés B. Vuelta 4 cruzás el pasillo con el láser bloqueado y tocás la meta.
**Enseña:** el fantasma como cobertura y la combinación de tres trabajos.

---

## 9. Legibilidad (mínimo viable)

Es la feature que decide si el juego se entiende. No es opcional.

1. **Color por vuelta.** Ramp de 6 colores segura para daltonismo. El presente siempre **blanco**.
2. **Rutas dibujadas.** Una línea por vuelta, con grosor igual al rastro real.
3. **Siluetas de fantasmas.** Rellenas del color de su vuelta.
4. **Preview del futuro.** Cada fantasma se dibuja también en **t+1 s y t+2 s**, translúcido. Es trivial porque ya está grabado, y elimina la adivinanza.
5. **Barra de tiempo.** Marcas de vuelta. Click para saltar. Mantener R para retroceder.
6. **Carta de muerte.** Vuelta, segundo, culpable resaltado.

---

## 10. Stack y arquitectura

### 10.1 Estructura de archivos

```
index.html
style.css
js/
  main.js      // boot, game loop, input
  sim.js       // estado, step, colisiones, grabación, rewind
  render.js    // todo el canvas
  levels.js    // datos de los 4 niveles
```

Servir con `python -m http.server` en local. Publicar en GitHub Pages o Netlify.

### 10.2 Loop

Timestep fijo de 60 Hz con acumulador. Nada de `delta` variable en la simulación.

### 10.3 Estado

```js
state = {
  level, lap, t,              // t = frame actual dentro de la vuelta
  player: { x, y, r, angle },
  laps: [ [frame, frame, ...] ], // frames de vueltas completas
  current: [frame, ...],      // frames de la vuelta en curso
  dead: false, cause: null
}

frame = { x, y, angle }        // 3 números. Nada más.
```

- 4 vueltas × 1200 frames = 4800 frames. Memoria trivial.
- **Se guardan transforms, no inputs.** El fantasma reproduce posiciones exactas.

### 10.4 Regla de oro técnica

> **Todo el estado del mundo se deriva de posiciones. Cero flags ocultos.**

- Puerta abierta = sus placas están pisadas.
- Láser bloqueado = hay un fantasma sobre la línea.
- Muerte = hay solapamiento no resoluble.
- Victoria = el jugador toca la meta.

Así el rewind es solo mover el playhead: no hay estado que restaurar.

### 10.5 Rewind

- Playhead = `(lap, t)`.
- Retroceder: `t--`; si `t < 0`, pasar a la última vuelta anterior y truncar la actual.
- Al retroceder, el jugador se coloca en el transform grabado de ese frame.
- Re-grabar desde ahí descarta todo el futuro.
- Al inicio de cada vuelta el jugador vuelve al spawn.

### 10.6 Colisiones (simple)

| Qué | Cómo |
|---|---|
| Jugador ↔ paredes | Círculo vs AABB. |
| Jugador ↔ rastro | Círculo vs cápsula, muestreando el rastro cada 4 frames. |
| Jugador ↔ fantasma | Círculo vs círculo + push-out. |
| Aplastamiento | Si sigue solapado después del push-out → muerte. |
| Láser | Distancia punto-segmento. |
| Placa | Distancia centro-centro. |

### 10.7 Preview del futuro

Como los frames están grabados, `frameAt(lap, t + 60)` y `frameAt(lap, t + 120)` existen. Dibujarlos translúcidos. Cero tecnología nueva.

---

## 11. Plan día por día

| Día | Objetivo | Terminado cuando… |
|---|---|---|
| **1** | Esqueleto: canvas, loop 60 Hz, movimiento, paredes, meta, Nivel 1. | Se puede caminar y ganar el Nivel 1. |
| **2** | Grabación, fin de vuelta, reproducción de fantasmas, placa y puerta, Nivel 2. | El Nivel 2 se resuelve en 2 vueltas. |
| **3** | Rastro como pared, solidez del fantasma, aplastamiento, Nivel 3. | El Nivel 3 se resuelve en 3 vueltas. |
| **4** | Rewind + barra de tiempo + colores + preview de futuro. | Se puede rebobinar a cualquier vuelta y re-grabar. |
| **5** | Láser, Nivel 4, carta de muerte, victoria, selector de nivel. | Los 4 niveles son jugables de punta a punta. |
| **6** | Playtest con 3–5 personas, bugs, pulido visual, deploy. | Link público funcionando. |
| **7** | Buffer, correcciones del playtest, video de 60 s, entrega. | Entregado. |

**No se pasa de un día al siguiente con el anterior roto.** El buffer del día 7 no es para features: es para bugs.

---

## 12. Stretch: el arma

**Solo si el día 4 termina sin deuda.** Si no, no existe.

- 1 disparo por vuelta.
- Bala lenta (300 px/s), se congela a los 400 px y queda como nodo de pared.
- Sirve para accionar un interruptor detrás de un vidrio.
- El fantasma repite el disparo.
- Requiere: proyectil, interruptor, y un Nivel 3 bis.

Si entra, se agrega como **Nivel 3b** y no se toca el resto.

---

## 13. Criterio de éxito del playtest

Sentar a 5 personas y verificar:

1. A las 5 les pasa el **"ah, soy yo"** en menos de **90 segundos**.
2. Al menos **3 de 5** resuelven el Nivel 2 **sin explicación previa**.
3. Al menos **3 de 5** piden jugar otro nivel inmediatamente.

Si falla cualquiera de los tres, se arregla **legibilidad**, no contenido. No se agregan niveles.

---

## 14. Plan B: qué cortar si vas atrasado

En este orden, sin culpa:

1. Nivel 4 (el láser).
2. Preview de futuro.
3. Selector de nivel.
4. SFX.
5. Nivel 3 (queda: 1 y 2 + final).
6. Preview de fantasmas a t+2 (dejar solo t+1).

**Nunca se corta:** rewind, rastro sólido, colores por vuelta, carta de muerte. Sin eso no hay juego.

---

## 15. Deploy y entrega

- Repo en GitHub.
- Deploy en **GitHub Pages** (gratis, sin configuración).
- `README.md` con controles y link.
- Video de 60 s: Nivel 2 resuelto + rewind + el "ah, soy yo".
- Guion de demo de 3 minutos:
  1. Nivel 1 (10 s).
  2. Nivel 2: morir, rebobinar, resolver (60 s).
  3. Nivel 4: mostrar la cuadrilla completa (60 s).
  4. Cerrar con la regla: "el presente es blando, el pasado es duro".

---

## Apéndice A — Controles

| Acción | Tecla |
|---|---|
| Mover | WASD / flechas |
| Pausar | Espacio |
| Rebobinar | Mantener R |
| Reiniciar nivel | Supr |
| Volver al menú | Esc |

## Apéndice B — Paleta

| Uso | Color |
|---|---|
| Fondo | `#14161a` |
| Paredes | `#3a4048` |
| Presente | `#ffffff` |
| Vuelta 1 | `#4cc9f0` |
| Vuelta 2 | `#f72585` |
| Vuelta 3 | `#ffd166` |
| Vuelta 4 | `#80ed99` |
| Meta | `#ffb703` |
| Láser | `#ff3b3b` |
| Placa | `#8ecae6` |

## Apéndice C — Números

| Parámetro | Valor |
|---|---|
| Canvas | 960 × 600 |
| Loop | 20 s |
| Tick | 60 Hz |
| Radio jugador | 12 px |
| Velocidad | 220 px/s |
| Grosor rastro | 24 px |
| Radio placa | 22 px |
| Radio meta | 24 px |
| Muestreo de rastro | cada 4 frames |

---

*Fin del plan v1.0. Si algo de este documento no está hecho el día 7, se entrega lo que está y se documenta lo que falta. Un juego de 2 niveles terminado vale más que uno de 10 sin terminar.*
