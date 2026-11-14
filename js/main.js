// Boot and game loop: the only module that knows about the browser.
// Real time is used only to schedule fixed simulation ticks; it never enters
// the simulation itself, so the same key sequence always walks the same path.

import { TICK_SECONDS, createInitialState, step } from './sim.js';
import { LEVEL_1 } from './levels.js';
import { render } from './render.js';
import { keysToInput, isArrowCode } from './input.js';

// Anti-spiral cap: a background tab can deliver a huge elapsed time.
const MAX_ELAPSED_SECONDS = 0.25;
// After a long stall, stop catching up so the page never freezes.
const MAX_TICKS_PER_FRAME = 5;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const pressed = new Set();
let state = createInitialState(LEVEL_1);

// The mapping from event.code to direction lives in input.js; here we only keep
// every held code and let the pure mapper ignore the ones it does not know.
const readInput = () => keysToInput(pressed);

const releaseAll = () => pressed.clear();

window.addEventListener('keydown', (event) => {
  // Arrows would scroll the page otherwise.
  if (isArrowCode(event.code)) event.preventDefault();
  pressed.add(event.code);
});

window.addEventListener('keyup', (event) => {
  if (isArrowCode(event.code)) event.preventDefault();
  pressed.delete(event.code);
});

// Losing focus drops every held key: coming back requires a new press (RF-9).
window.addEventListener('blur', releaseAll);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) releaseAll();
});

let lastTime = null;
let accumulator = 0;

const frame = (now) => {
  if (lastTime === null) lastTime = now;
  const elapsed = Math.min((now - lastTime) / 1000, MAX_ELAPSED_SECONDS);
  lastTime = now;
  accumulator += elapsed;

  let ticks = 0;
  while (accumulator >= TICK_SECONDS && ticks < MAX_TICKS_PER_FRAME) {
    state = step(state, readInput());
    accumulator -= TICK_SECONDS;
    ticks += 1;
  }
  if (ticks === MAX_TICKS_PER_FRAME) accumulator = 0;

  render(ctx, state);
  requestAnimationFrame(frame);
};

requestAnimationFrame(frame);
