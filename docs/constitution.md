# Constitución — Paradox Loop

Principios innegociables del proyecto. Toda spec, plan, tarea y línea de código se subordina a este documento.

## Principios

1. **Stack mínimo, sin dependencias.** HTML + CSS + JS vanilla (ES2022) + Canvas 2D, servido con `python -m http.server`; sin `package.json`, bundler, framework ni backend. Agregar una dependencia exige enmendar esta constitución.
2. **La spec manda.** Ningún cambio de comportamiento sin un RF aprobado en `specs/NNN-*/spec.md`, y ninguna fase avanza sin aprobación explícita. Ante una decisión faltante, se detiene y se pregunta.
3. **Lógica e interfaz separadas.** `js/sim.js` es puro y determinista: no importa DOM, Canvas ni `window`, y con el mismo estado y entrada produce el mismo resultado. Solo `main.js` y `render.js` tocan el navegador.
4. **Tests primero y en verde.** Toda función pura de `sim.js` tiene test en `test/`: se escribe en rojo, se implementa y `node --test` queda en verde antes de cerrar la tarea. Sin tests rojos ni lógica nueva sin test.
5. **Datos del usuario: locales, mínimos y sin secretos.** Sin backend, cuentas, red ni telemetría; el progreso vive solo en el navegador. Nunca se escriben credenciales, tokens ni datos personales en el repo.
6. **Un idioma por capa.** Código, nombres, tests y comentarios en inglés; interfaz, textos de juego, documentación y errores visibles en español. Un identificador o texto fuera de esa regla se corrige antes de cerrar la tarea.

## Gobierno

- Toda enmienda requiere aprobación explícita del usuario y actualización de `MEMORY.md`.
- Un principio no se viola "temporalmente": si el proyecto lo necesita, se enmienda la constitución primero.
