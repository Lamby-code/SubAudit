import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  PLAYER_RADIUS,
  META_RADIUS,
  META_TOUCH_DISTANCE,
  createInitialState,
  circleOverlapsRect,
  distance,
  touchesMeta,
  isWon,
  step,
} from '../js/sim.js';
import { LEVEL_1 } from '../js/levels.js';

// --- local helpers -----------------------------------------------------------

const NONE = { up: false, down: false, left: false, right: false };
const UP = { ...NONE, up: true };
const DOWN = { ...NONE, down: true };
const RIGHT = { ...NONE, right: true };

const ALL_INPUTS = [
  UP,
  DOWN,
  { ...NONE, left: true },
  RIGHT,
  { ...NONE, up: true, right: true },
  { ...NONE, up: true, left: true },
  { ...NONE, down: true, right: true },
  { ...NONE, down: true, left: true },
];

const META = LEVEL_1.meta;

const playerAt = (x, y) => ({ x, y, r: PLAYER_RADIUS });
const stateAt = (x, y) => ({ level: LEVEL_1, player: playerAt(x, y) });

const overlapsAnyWall = (player) =>
  LEVEL_1.walls.some((wall) => circleOverlapsRect(player.x, player.y, player.r, wall));

const assertClear = (state, where) => {
  assert.ok(!overlapsAnyWall(state.player), `${where}: the body overlaps a wall (${state.player.x}, ${state.player.y})`);
};

/** Runs `ticks` steps with the same input, checking wall clearance every tick. */
const walk = (state, input, ticks) => {
  let next = state;
  for (let i = 0; i < ticks; i += 1) {
    next = step(next, input);
    assertClear(next, `tick ${i}`);
  }
  return next;
};

// --- tests -------------------------------------------------------------------

test('CL-13: the 36 px threshold is inclusive and a hair beyond it loses', () => {
  assert.equal(META.x, 816);
  assert.equal(META.y, 536);

  const beyond = stateAt(META.x + 36.1, META.y); // 36.1 px away
  const exactly = stateAt(META.x + 36, META.y); // exactly 36 px away
  const closer = stateAt(META.x + 35.9, META.y); // 35.9 px away

  assert.ok(Math.abs(distance(beyond.player, META) - 36.1) < 1e-9);
  assert.equal(isWon(beyond), false, '36.1 px must not win');
  assert.equal(isWon(exactly), true, 'exactly 36 px must win');
  assert.equal(isWon(closer), true, '35.9 px must win');
  assert.equal(touchesMeta(exactly), true);
  assert.equal(touchesMeta(beyond), false);
});

test('RF-2: the spawn does not start the level already won', () => {
  const state = createInitialState(LEVEL_1);
  assert.equal(isWon(state), false);
  assert.equal(touchesMeta(state), false);
  assert.ok(distance(state.player, META) > META_TOUCH_DISTANCE);
});

test('CL-4/CL-10: a real walk down the bottom passage and along the lane wins', () => {
  let state = createInitialState(LEVEL_1);

  // Down into the bottom corridor (64 ticks puts the body at y ~ 534.7,
  // clear of the pillar whose bottom edge is y = 504).
  state = walk(state, DOWN, 64);
  assert.equal(isWon(state), false, 'the corridor is not the meta yet');
  assert.ok(state.player.y - PLAYER_RADIUS > 504, 'the body must be below the pillar');

  // Right along the lane until the body touches the meta circle.
  let ticks = 0;
  while (!isWon(state) && ticks < 400) {
    state = step(state, RIGHT);
    assertClear(state, `lane tick ${ticks}`);
    ticks += 1;
  }

  assert.ok(ticks < 400, 'the lane must reach the meta');
  assert.equal(isWon(state), true, 'touching the meta must win');
  assert.ok(distance(state.player, META) <= META_TOUCH_DISTANCE);
});

test('CL-5: touching the meta while pinned to a wall still wins', () => {
  // Tangent to the south wall (576 - 12 = 564), 28 px from the meta centre.
  const state = stateAt(META.x, 564);
  assert.ok(Math.abs(distance(state.player, META) - 28) < 1e-9);
  assert.equal(isWon(state), true, 'victory must prevail over wall contact');

  // And after stepping there, the body must not be pushed away from the win.
  const next = step(state, DOWN);
  assert.equal(isWon(next), true);
  assert.deepEqual(next.player, state.player);
});

test('RF-16/CL-6: after winning every input keeps the player still and the win alive', () => {
  const won = stateAt(META.x, META.y);
  assert.equal(isWon(won), true);

  for (const input of ALL_INPUTS) {
    let state = won;
    for (let tick = 0; tick < 50; tick += 1) {
      state = step(state, input);
      assert.deepEqual(state.player, won.player, `tick ${tick}: the body moved after winning`);
      assert.equal(state.level, LEVEL_1, 'the level must be preserved');
      assert.equal(isWon(state), true, `tick ${tick}: the win must stay true`);
    }
  }
});

test('RF-16/RF-17: a won state comes back intact and evaluating it is idempotent', () => {
  const won = stateAt(META.x + 20, META.y);
  const next = step(won, RIGHT);

  assert.deepEqual(next.player, won.player);
  assert.equal(isWon(won), true);
  assert.equal(isWon(won), true);
  assert.equal(isWon(won), true);
  assert.equal(touchesMeta(won), true);
  // No flag was added to the state: victory is derived, not stored.
  assert.deepEqual(Object.keys(won).sort(), ['level', 'player']);
  assert.deepEqual(Object.keys(won.player).sort(), ['r', 'x', 'y']);
});

test('RF-14: the touch distance is the sum of both radii', () => {
  assert.equal(META_TOUCH_DISTANCE, 36);
  assert.equal(META_TOUCH_DISTANCE, PLAYER_RADIUS + META_RADIUS);
  assert.equal(PLAYER_RADIUS, 12);
  assert.equal(META_RADIUS, 24);
});

test('RF-16: step does not mutate the state it receives', () => {
  const state = createInitialState(LEVEL_1);
  const snapshot = structuredClone(state);

  step(state, { ...NONE, right: true, up: true });
  assert.deepEqual(state, snapshot, 'a free state must stay untouched');

  const won = stateAt(META.x, META.y);
  const wonSnapshot = structuredClone(won);
  step(won, { ...NONE, left: true, down: true });
  assert.deepEqual(won, wonSnapshot, 'a won state must stay untouched');
});

test('CL-8/RF-18: 36000 idle ticks change nothing and never lose', () => {
  const start = createInitialState(LEVEL_1);
  let state = start;

  for (let tick = 0; tick < 36000; tick += 1) {
    state = step(state, NONE);
    assert.equal(isWon(state), false, `tick ${tick}: the level must not be won`);
  }

  assert.deepEqual(state.player, start.player, 'the body must not drift');
  assert.equal(state.level, LEVEL_1);
  assert.equal(isWon(state), false);
});
