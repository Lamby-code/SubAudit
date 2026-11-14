import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { KEY_BINDINGS, keysToInput, isArrowCode } from '../js/input.js';
import { MOVE_SPEED, TICK_SECONDS, createInitialState, step } from '../js/sim.js';
import { LEVEL_1 } from '../js/levels.js';

// --- helpers -----------------------------------------------------------------

const NONE = { up: false, down: false, left: false, right: false };
const STEP_PX = MOVE_SPEED * TICK_SECONDS;
const TOLERANCE = 1e-9;

const ONE_KEY = (key) => ({ ...NONE, [key]: true });

// --- tests -------------------------------------------------------------------

test('RF-5: each WASD key maps to its own verb', () => {
  assert.deepEqual(keysToInput(new Set(['KeyW'])), ONE_KEY('up'));
  assert.deepEqual(keysToInput(new Set(['KeyS'])), ONE_KEY('down'));
  assert.deepEqual(keysToInput(new Set(['KeyA'])), ONE_KEY('left'));
  assert.deepEqual(keysToInput(new Set(['KeyD'])), ONE_KEY('right'));
});

test('RF-5: the four arrows behave exactly like their WASD twins', () => {
  const pairs = [
    ['ArrowUp', 'KeyW'],
    ['ArrowDown', 'KeyS'],
    ['ArrowLeft', 'KeyA'],
    ['ArrowRight', 'KeyD'],
  ];

  for (const [arrow, letter] of pairs) {
    assert.deepEqual(keysToInput(new Set([arrow])), keysToInput(new Set([letter])), `${arrow} must equal ${letter}`);
  }

  // Mixed input (letter + arrow of the same verb) is still a single verb.
  assert.deepEqual(keysToInput(new Set(['KeyD', 'ArrowRight'])), ONE_KEY('right'));
});

test('CL-1: opposite keys both stay true, the simulation cancels them', () => {
  assert.deepEqual(keysToInput(new Set(['KeyA', 'KeyD'])), {
    ...NONE,
    left: true,
    right: true,
  });
  assert.deepEqual(keysToInput(new Set(['ArrowUp', 'ArrowDown'])), {
    ...NONE,
    up: true,
    down: true,
  });
});

test('RF-9/CL-7: clearing the set (blur) stops the player until a new press', () => {
  const pressed = new Set(['KeyD']);
  let state = createInitialState(LEVEL_1);
  const startX = state.player.x;

  for (let tick = 0; tick < 5; tick += 1) state = step(state, keysToInput(pressed));
  assert.ok(
    Math.abs(state.player.x - (startX + 5 * STEP_PX)) < TOLERANCE,
    `5 held ticks must advance ${5 * STEP_PX} px, got ${state.player.x - startX}`,
  );

  const stoppedX = state.player.x;
  pressed.clear(); // what blur and visibilitychange do

  for (let tick = 0; tick < 5; tick += 1) {
    state = step(state, keysToInput(pressed));
    assert.equal(state.player.x, stoppedX, `tick ${tick}: the player must not move after the set is cleared`);
    assert.equal(state.player.y, 300, 'the player must not move vertically either');
  }

  // A new press moves again, from the position where it stopped.
  const freshPress = new Set(['KeyD']);
  state = step(state, keysToInput(freshPress));
  assert.ok(
    Math.abs(state.player.x - (stoppedX + STEP_PX)) < TOLERANCE,
    `a new press must move ${STEP_PX} px, got ${state.player.x - stoppedX}`,
  );
});

test('robustness: empty iterables, unknown codes and no mutation of the input', () => {
  assert.deepEqual(keysToInput(new Set()), NONE);
  assert.deepEqual(keysToInput([]), NONE);
  assert.deepEqual(keysToInput(['KeyZ', 'ShiftLeft', 'Space', 'F1']), NONE);

  // Unknown codes mixed with real ones only light up the known verb.
  assert.deepEqual(keysToInput(['KeyZ', 'KeyA', 'ShiftLeft']), ONE_KEY('left'));

  const pressed = new Set(['KeyW', 'KeyD', 'KeyZ']);
  const before = [...pressed];
  keysToInput(pressed);
  assert.deepEqual([...pressed], before, 'keysToInput must not mutate the set');

  const list = ['KeyS', 'ArrowLeft'];
  keysToInput(list);
  assert.deepEqual(list, ['KeyS', 'ArrowLeft'], 'keysToInput must not mutate the array');

  // Prototype keys must not leak into the input object.
  const weird = keysToInput(['constructor', '__proto__', 'toString']);
  assert.deepEqual(weird, NONE);
});

test('isArrowCode: true for the four arrows only', () => {
  for (const code of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
    assert.equal(isArrowCode(code), true, `${code} must be an arrow`);
  }
  for (const code of ['KeyW', 'KeyD', 'Space', 'KeyR', '']) {
    assert.equal(isArrowCode(code), false, `${code || '(empty)'} must not be an arrow`);
  }
});

test('KEY_BINDINGS: the complete key table lives in input.js', () => {
  assert.deepEqual(KEY_BINDINGS, {
    KeyW: 'up',
    ArrowUp: 'up',
    KeyS: 'down',
    ArrowDown: 'down',
    KeyA: 'left',
    ArrowLeft: 'left',
    KeyD: 'right',
    ArrowRight: 'right',
  });
});

test('constitution 3: input.js is pure, DOM-free and imports nothing', () => {
  const source = readFileSync(new URL('../js/input.js', import.meta.url), 'utf8');

  for (const forbidden of ['document', 'window', 'localStorage', 'addEventListener', 'requestAnimationFrame']) {
    assert.ok(!source.includes(forbidden), `js/input.js must not mention "${forbidden}"`);
  }
  assert.ok(!/\bimport\b/.test(source), 'js/input.js must not import anything');
});
