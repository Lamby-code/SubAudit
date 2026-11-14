# Spec 001 — Esqueleto y Nivel 1
Estado: aprobada

## Contexto y objetivo

Paradox Loop es un puzzle 2D top-down donde el jugador coreografía versiones pasadas de sí mismo. Antes de que exista el loop, los fantasmas o el rewind, el juego necesita un piso jugable: un cuarto, un jugador que responde al teclado, paredes que bloquean y una meta que se pueda tocar.

Esta spec es el primer hito jugable del proyecto: **se puede abrir la app, caminar por el cuarto del Nivel 1 y ganar**. No introduce ninguna mecánica temporal. Su objetivo es dejar una base verificable —movimiento y colisiones correctos, victoria clara— sobre la que los hitos siguientes (loop, fantasmas, rastro, rewind) se apoyen sin rehacer nada.

**Por qué ahora:** el Nivel 1 es el nivel que enseña a moverse y a leer el tono visual del juego. Sin un Nivel 1 jugable no hay forma de validar legibilidad, colisiones ni victoria, que son prerequisitos de todo lo demás.

## Usuarios

- **Jugador de puzzle en desktop** (usuario final): quiere entender el juego en segundos y sentir que el control responde.
- **Autor/prototipista del proyecto** (usuario interno): necesita un esqueleto jugable que pueda servir de base para las mecánicas del loop.

## Historias de usuario

- HU-1. Como jugador, quiero abrir el juego y ver de inmediato un cuarto con mi personaje, paredes y una meta clara, para entender qué hacer sin instrucciones.
- HU-2. Como jugador, quiero moverme con WASD o con las flechas, para usar el esquema que ya conozco.
- HU-3. Como jugador, quiero que las paredes me bloqueen de forma predecible (incluido deslizar por ellas), para no perder el control ni atravesar geometría.
- HU-4. Como jugador, quiero que tocar la meta me dé la victoria con un mensaje claro en español, para saber que terminé el Nivel 1.
- HU-5. Como autor del proyecto, quiero un Nivel 1 jugable de punta a punta, para validar movimiento, colisiones y victoria antes de construir el loop.

## Definiciones

- **Jugador:** el cuerpo circular que controla la persona. Radio 12 px. Es el único ser controlable en este hito.
- **Cuarto:** el área de juego del Nivel 1, de 960 × 600 px, delimitada por paredes en todo su perímetro. No se puede salir de ella.
- **Pared:** geometría fija que bloquea al jugador y no se puede atravesar. Incluye el perímetro del cuarto y al menos un obstáculo interior.
- **Meta:** zona circular de radio 24 px que, al ser tocada por el cuerpo del jugador, produce la victoria. Es un objetivo, no un obstáculo: no bloquea el paso. **Tocar la meta** significa que los dos círculos se solapan, es decir, que la distancia entre sus centros es menor o igual a la suma de sus radios (12 + 24 = **36 px**); no hace falta que el centro del jugador entre en la meta.
- **Victoria:** estado terminal del Nivel 1 en el que el jugador ya tocó la meta (solapamiento de círculos, distancia entre centros ≤ 36 px) y se muestra el mensaje correspondiente. El Nivel 1 queda en ese estado: no se reinicia ni avanza a otro nivel en este hito.
- **Mensaje de victoria:** el texto exacto que la app muestra al ganar el Nivel 1: `¡Nivel 1 completado!`, centrado sobre el área de juego.
- **Esquina interior:** el vértice cóncavo que forman dos paredes que se tocan y delimitan el área libre; es el punto donde el jugador puede quedar encajado al empujar en diagonal.
- **Nivel 1 ("Caminar"):** el único nivel de este hito. Un cuarto con una meta, sin fantasmas, sin grabación y sin loop.
- **30 segundos del Nivel 1:** el documento de diseño indica que el Nivel 1 dura "30 segundos", pero ese valor es una **estimación de duración de juego para una persona que lo recorre por primera vez**, no un límite. En este hito **no existe temporizador, ni cuenta regresiva, ni muerte por tiempo**: el jugador puede tardar lo que quiera.
- **Vuelta / loop / fantasma / rastro:** existen en el diseño general del juego, pero **no existen en este hito** y nada de esta spec los requiere.

## Requisitos funcionales

### Cuarto y presentación

- **RF-1.** CUANDO el jugador abre la app, EL SISTEMA muestra el cuarto del Nivel 1 con el jugador, las paredes y la meta visibles y distinguibles entre sí y respecto del fondo.
- **RF-2.** EL SISTEMA coloca al jugador en un punto de aparición fijo, libre de paredes y de la meta, y mantiene ese mismo punto en cada apertura del Nivel 1.
- **RF-3.** EL SISTEMA delimita el cuarto con paredes en todo su perímetro, de modo que el jugador nunca puede salir del área de juego.
- **RF-4.** EL SISTEMA incluye al menos una pared interior que separa el punto de aparición de la meta, de modo que llegar a la meta exige rodearla y no una línea recta.
- **RF-4b.** EL SISTEMA mantiene la meta visible desde el punto de aparición: ninguna pared ni obstáculo interior la oculta desde la posición inicial del jugador.
- **RF-4c.** EL SISTEMA cumple RF-4 y RF-4b **al mismo tiempo**: la geometría del Nivel 1 debe satisfacer ambas condiciones a la vez. Ninguna de las dos tiene prioridad ni excepción; una disposición que bloquee el camino recto tapando la meta desde el punto de aparición no es válida, y una que deje ver la meta sin obstáculo intermedio tampoco.

### Movimiento

- **RF-5.** CUANDO el jugador mantiene presionada una tecla de movimiento (W, A, S, D o una flecha), EL SISTEMA desplaza al jugador en la dirección correspondiente a una velocidad de 220 px por segundo.
- **RF-6.** CUANDO el jugador mantiene presionadas dos teclas de movimiento no opuestas (por ejemplo, arriba y derecha), EL SISTEMA desplaza al jugador en diagonal conservando la misma velocidad total que en línea recta (220 px por segundo), es decir, sin acelerar en diagonal.
- **RF-7.** CUANDO el jugador mantiene presionadas dos teclas opuestas en el mismo eje (izquierda y derecha, o arriba y abajo), EL SISTEMA no desplaza al jugador en ese eje.
- **RF-8.** MIENTRAS el jugador no mantiene ninguna tecla de movimiento, EL SISTEMA mantiene al jugador inmóvil en su posición.
- **RF-9.** CUANDO la ventana del juego pierde el foco, EL SISTEMA descarta las teclas que estuvieran presionadas y detiene al jugador; para volver a moverse hace falta una nueva pulsación de tecla.
- **RF-10.** CUANDO el jugador deja de presionar todas las teclas de movimiento, EL SISTEMA detiene al jugador de inmediato, sin inercia ni deslizamiento residual.

### Paredes

- **RF-11.** CUANDO el jugador se desplaza contra una pared, EL SISTEMA impide que la cruce y mantiene su cuerpo completo dentro del área libre, sin penetración ni solapamiento sostenido.
- **RF-12.** CUANDO el jugador se desplaza en diagonal contra una pared, EL SISTEMA conserva el desplazamiento sobre el eje que no está bloqueado (deslizamiento), en lugar de detenerlo por completo.
- **RF-13.** CUANDO el jugador queda detenido contra una pared mientras el Nivel 1 está en juego, EL SISTEMA lo mantiene en contacto estable con la pared, sin atravesarla ni expulsarlo a una posición anterior distinta de la de contacto.

### Meta y victoria

- **RF-14.** CUANDO el cuerpo del jugador toca la meta, es decir, cuando la distancia entre el centro del jugador y el centro de la meta es menor o igual a 36 px (12 + 24), EL SISTEMA declara la victoria del Nivel 1.
- **RF-15.** CUANDO se declara la victoria, EL SISTEMA muestra el mensaje `¡Nivel 1 completado!` centrado sobre el área de juego, con signos de apertura y cierre y exclamación final, legible y en español sin depender solo del color.
- **RF-16.** MIENTRAS el Nivel 1 está en victoria, EL SISTEMA ignora toda entrada de movimiento —no hay desplazamiento, ni deslizamiento contra paredes, ni respuesta a teclas— y mantiene el mensaje de victoria visible.
- **RF-17.** CUANDO la victoria ya fue declarada, EL SISTEMA no la declara de nuevo ni duplica ni altera el mensaje.
- **RF-18.** EL SISTEMA no impone ningún límite de tiempo para completar el Nivel 1: no hay cuenta regresiva, ni tiempo agotado, ni muerte por tiempo.
- **RF-19.** MIENTRAS el Nivel 1 está en victoria, EL SISTEMA no ofrece reiniciar el nivel ni avanzar a otro nivel: la partida queda en la pantalla de victoria.

## Requisitos no funcionales

- **RNF-1 (respuesta del control).** La simulación avanza en pasos fijos de 1/60 de segundo; un cambio de tecla se refleja en el movimiento dentro de, como máximo, 2 pasos (≈33 ms) desde que se presiona.
- **RNF-2 (tamaño y encuadre).** El área de juego mide 960 × 600 px y se dibuja a tamaño fijo, centrada en la ventana, sin escalado ni estiramiento en ventanas de escritorio. Dentro de ella, el jugador tiene radio 12 px y la meta radio 24 px.
- **RNF-3 (sin teletransporte ni falsos negativos).** A la velocidad máxima y en cualquier dirección, incluida la diagonal, el jugador no puede atravesar una pared (tunelado) ni pasar sobre la meta sin que se detecte el contacto.
- **RNF-4 (legibilidad).** Jugador, paredes, fondo y meta son distinguibles entre sí sin depender solo del brillo; la meta se reconoce como objetivo y no como obstáculo.
- **RNF-5 (idioma).** Todo texto visible para el jugador (mensaje de victoria, cualquier indicación en pantalla) está en español; el mensaje de victoria se muestra exactamente como `¡Nivel 1 completado!`.
- **RNF-6 (previsibilidad).** La simulación es por frames: con la misma secuencia de estados de teclas frame a frame, el jugador recorre exactamente el mismo camino. El comportamiento no depende del reloj real, de la tasa de refresco del equipo ni de la velocidad de fotogramas alcanzada.
- **RNF-7 (desktop con teclado).** El juego se opera íntegramente con teclado de escritorio; no requiere mouse, táctil ni gamepad.
- **RNF-8 (arranque limpio).** Al abrir la app no aparecen errores visibles ni mensajes de fallo; el cuarto queda listo para jugar sin pasos intermedios (sin menús, sin pantallas de carga que exijan interacción).

## Casos límite

- **CL-1.** El jugador mantiene dos teclas opuestas del mismo eje: no se mueve en ese eje, pero sí puede moverse en el otro (por ejemplo, izquierda+derecha+arriba sube).
- **CL-2.** El jugador se mueve en diagonal contra una esquina interior (el vértice cóncavo donde se tocan dos paredes): queda detenido en la esquina, sin penetrar ninguna de las dos paredes ni vibrar entre ellas.
- **CL-3.** El jugador mantiene una tecla contra una pared durante muchos segundos: permanece pegado a la pared, sin acumular desplazamiento que lo haga atravesarla al soltar.
- **CL-4.** El jugador pasa en diagonal a velocidad máxima con la distancia entre centros apenas por debajo de 36 px: el contacto se detecta y la victoria se declara igual.
- **CL-5.** El jugador toca la meta en el mismo instante en que está en contacto con una pared: prevalece la victoria.
- **CL-6.** El jugador sigue apretando teclas después de la victoria: el cuerpo no se mueve, el mensaje permanece visible y sin cambios, y no hay forma de reiniciar ni de pasar a otro nivel.
- **CL-7.** El jugador cambia de foco (otra ventana) mientras mantiene una tecla: al volver, el jugador no se mueve hasta presionar una tecla de nuevo.
- **CL-8.** El jugador se queda quieto sin tocar nada durante varios minutos: no ocurre nada; no hay derrota, ni mensaje, ni cuenta regresiva.
- **CL-9.** El jugador recorre todo el perímetro del cuarto: no encuentra ningún hueco por el que salir del área de juego.
- **CL-10.** El jugador llega a la meta sin haber tocado el obstáculo interior: la victoria se declara igual (el obstáculo no es obligatorio, solo separa el camino recto).
- **CL-11.** Al abrir el Nivel 1, la meta es reconocible desde el punto de aparición: el obstáculo interior no la tapa ni la deja fuera de la vista inicial.
- **CL-12.** El jugador llega a la victoria y el mensaje se lee una sola vez, completo y con los signos `¡` y `!`; no aparece cortado ni duplicado, y se ve centrado sobre el área de juego.
- **CL-13.** El jugador se aproxima a la meta hasta que la distancia entre centros es exactamente 36 px: la victoria ya se declaró (el umbral es "menor o igual a 36 px"), y tampoco queda un caso de contacto visual sin victoria.

## Fuera de alcance

Queda explícitamente fuera de esta spec y no debe implementarse ni insinuarse como requisito:

- Loop de 20 s, vueltas, playhead, grabación y reproducción, fantasmas (sólidos o no), rastro sólido, empuje y aplastamiento.
- Rewind, pausa, reinicio de nivel, barra de tiempo, preview del futuro, colores por vuelta.
- Placas de presión, puertas, láser, carta de muerte, selector de nivel, pantalla de menú, progresión a otros niveles.
- Audio, guardado de progreso, `localStorage`, backend, cuentas, red, telemetría.
- Mobile, táctil, gamepad, accesibilidad avanzada.
- Niveles 2, 3 y 4.
- Editor de niveles, narrativa, cinemáticas.

## Criterios de finalización

El hito se considera terminado cuando, en una sesión manual en desktop:

1. Se abre la app y se ve el cuarto del Nivel 1 con jugador, paredes y meta claramente distinguibles, sin errores visibles; la meta es visible desde el punto de aparición y, a la vez, el obstáculo interior impide llegar a ella en línea recta.
2. El jugador se desplaza con WASD y con flechas, a velocidad constante, y se detiene al soltar las teclas.
3. Las paredes bloquean al jugador, permiten deslizar en diagonal y no dejan salir del área de juego.
4. Tocar la meta (distancia entre centros ≤ 36 px) produce la victoria y muestra `¡Nivel 1 completado!` centrado sobre el área de juego y legible.
5. Después de la victoria el jugador no se mueve, el mensaje sigue visible y no hay opción de reiniciar ni de avanzar de nivel.
6. Dejar el juego abierto sin tocar nada no produce derrota, muerte ni cuenta regresiva.
7. La batería de pruebas automáticas del proyecto queda en verde y cubre movimiento, colisiones, deslizamiento y detección de meta.

## Dudas abiertas

No quedan dudas abiertas. Fase de clarificación cerrada: las cinco dudas originales fueron resueltas por el usuario (geometría a cargo del plan, texto de victoria literal, estado posterior a la victoria, visibilidad de la meta desde el punto de aparición y pausa fuera de alcance) y los nueve hallazgos del tester quedaron corregidos en esta versión.
