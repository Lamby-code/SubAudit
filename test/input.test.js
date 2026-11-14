import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  TICK_RATE,
  TICK_SECONDS,
  MOVE_SPEED,
  createInitialState,
  directionFromInput,
  normalizeDirection,
  step,
} from '../js/sim.js';
import { LEVEL_1 } from '../js/levels.js';

// --- local helpers -----------------------------------------------------------

const NONE = { up: false, down: false, left: false, right: false };

const TOLERANCE = 1e-9;
const STEP_PX = MOVE_SPEED * TICK_SECONDS;
const DIAGONAL_PX = STEP_PX * Math.SQRT1_2;

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/** Runs `ticks` simulation steps with the same input and returns the final state. */
const runTicks = (state, input, ticks) => {
  let next = state;
  for (let i = 0; i < ticks; i += 1) next = step(next, input);
  return next;
};

// --- tests -------------------------------------------------------------------

test('RF-6: up+right travels 220/60 px of magnitude, not 220/60 * sqrt(2)', () => {
  const state = createInitialState(LEVEL_1);
  const { player } = step(state, { ...NONE, up: true, right: true });

  const dx = player.x - state.player.x;
  const dy = player.y - state.player.y;

  assert.ok(Math.abs(dx - DIAGONAL_PX) < TOLERANCE, `expected x +${DIAGONAL_PX}, got ${dx}`);
  assert.ok(Math.abs(dy + DIAGONAL_PX) < TOLERANCE, `expected y -${DIAGONAL_PX}, got ${dy}`);
  assert.ok(
    Math.abs(Math.hypot(dx, dy) - STEP_PX) < TOLERANCE,
    `diagonal magnitude must stay ${STEP_PX}, got ${Math.hypot(dx, dy)}`,
  );
  assert.ok(
    Math.abs(Math.hypot(dx, dy) - STEP_PX * Math.SQRT2) > TOLERANCE,
    'the diagonal must not be larger than a straight step',
  );
});

test('RF-6: all four diagonals keep the same magnitude and sign', () => {
  const state = createInitialState(LEVEL_1);
  const cases = [
    { input: { right: true, up: true }, sx: 1, sy: -1 },
    { input: { right: true, down: true }, sx: 1, sy: 1 },
    { input: { left: true, up: true }, sx: -1, sy: -1 },
    { input: { left: true, down: true }, sx: -1, sy: 1 },
  ];

  for (const { input, sx, sy } of cases) {
    const { player } = step(state, { ...NONE, ...input });
    const dx = player.x - state.player.x;
    const dy = player.y - state.player.y;
    assert.ok(Math.abs(dx - sx * DIAGONAL_PX) < TOLERANCE, `dx ${dx} should be ${sx * DIAGONAL_PX}`);
    assert.ok(Math.abs(dy - sy * DIAGONAL_PX) < TOLERANCE, `dy ${dy} should be ${sy * DIAGONAL_PX}`);
    assert.ok(Math.abs(Math.hypot(dx, dy) - STEP_PX) < TOLERANCE);
  }
});

test('RF-6: normalizeDirection returns a unit vector and handles the empty vector', () => {
  const empty = normalizeDirection({ x: 0, y: 0 });
  assert.deepEqual(empty, { x: 0, y: 0 });
  assert.ok(Number.isFinite(empty.x) && Number.isFinite(empty.y), 'an empty direction must not produce NaN');

  // Cardinal directions are already unit vectors: they must come back untouched.
  assert.deepEqual(normalizeDirection({ x: 1, y: 0 }), { x: 1, y: 0 });
  assert.deepEqual(normalizeDirection({ x: -1, y: 0 }), { x: -1, y: 0 });
  assert.deepEqual(normalizeDirection({ x: 0, y: 1 }), { x: 0, y: 1 });
  assert.deepEqual(normalizeDirection({ x: 0, y: -1 }), { x: 0, y: -1 });

  for (const dir of [
    { x: 1, y: 1 },
    { x: -1, y: 1 },
    { x: 1, y: -1 },
    { x: -1, y: -1 },
  ]) {
    const unit = normalizeDirection(dir);
    assert.ok(Math.abs(Math.hypot(unit.x, unit.y) - 1) < TOLERANCE, `|${JSON.stringify(dir)}| must normalise to 1`);
    assert.equal(unit.x, dir.x * Math.SQRT1_2, 'the diagonal must be divided by sqrt(2)');
    assert.equal(unit.y, dir.y * Math.SQRT1_2, 'the diagonal must be divided by sqrt(2)');
  }
});

test('RF-7/CL-1: opposite keys cancel their axis but allow the other axis', () => {
  const state = createInitialState(LEVEL_1);

  const leftRightOnly = step(state, { ...NONE, left: true, right: true });
  assert.deepEqual(leftRightOnly.player, { ...state.player }, 'left+right must not move the player');

  const upDownOnly = step(state, { ...NONE, up: true, down: true });
  assert.deepEqual(upDownOnly.player, { ...state.player }, 'up+down must not move the player');

  const horizontal = step(state, { ...NONE, left: true, right: true, up: true });
  assert.equal(horizontal.player.x, state.player.x, 'X must stay still with left+right held');
  assert.ok(horizontal.player.y < state.player.y, 'Y must still advance with left+right+up held');
  assert.ok(Math.abs(horizontal.player.y - (state.player.y - STEP_PX)) < TOLERANCE);

  const vertical = step(state, { ...NONE, up: true, down: true, right: true });
  assert.equal(vertical.player.y, state.player.y, 'Y must stay still with up+down held');
  assert.ok(Math.abs(vertical.player.x - (state.player.x + STEP_PX)) < TOLERANCE);
});

test('RF-7/CL-1: holding opposite keys for 10 ticks does not oscillate', () => {
  const state = createInitialState(LEVEL_1);
  const input = { ...NONE, left: true, right: true, up: true };
  const positions = [];

  let next = state;
  for (let i = 0; i < 10; i += 1) {
    next = step(next, input);
    positions.push({ x: next.player.x, y: next.player.y });
  }

  assert.equal(positions[0].x, state.player.x, 'X must never move');
  for (let i = 1; i < positions.length; i += 1) {
    assert.equal(positions[i].x, state.player.x, `tick ${i}: X drifted`);
    assert.ok(positions[i].y < positions[i - 1].y, `tick ${i}: Y must advance monotonically`);
    assert.ok(
      Math.abs(positions[i - 1].y - positions[i].y - STEP_PX) < TOLERANCE,
      `tick ${i}: Y must advance exactly ${STEP_PX} px`,
    );
  }
});

test('RF-7: three keys behave like the two orthogonal ones (up+right+down === right)', () => {
  const state = createInitialState(LEVEL_1);
  const withThree = runTicks(state, { ...NONE, up: true, right: true, down: true }, 10);
  const withOne = runTicks(state, { ...NONE, right: true }, 10);

  assert.deepEqual(withThree.player, withOne.player);
  assert.ok(Math.abs(withOne.player.x - (state.player.x + 10 * STEP_PX)) < TOLERANCE);
  assert.equal(withOne.player.y, state.player.y);
});

test('RNF-1: the diagonal advances 220/60 px per tick on every tick', () => {
  const input = { ...NONE, right: true, up: true };
  let next = createInitialState(LEVEL_1);
  let previous = next.player;

  // 5 ticks in open space: the per-tick distance must be constant, no frame dependence.
  for (let tick = 1; tick <= 5; tick += 1) {
    next = step(next, input);
    const moved = distance(next.player, previous);
    assert.ok(
      Math.abs(moved - STEP_PX) < TOLERANCE,
      `tick ${tick}: expected ${STEP_PX} px of travel, got ${moved}`,
    );
    previous = next.player;
  }

  // A key change is reflected in the very first tick (spec allows at most 2 steps).
  const idle = step(createInitialState(LEVEL_1), NONE);
  const firstMove = step(idle, input);
  assert.ok(distance(firstMove.player, idle.player) > 0, 'the first tick after pressing a key must already move');
});

test('RF-5/RF-6: the cardinal step is unchanged and equals the diagonal magnitude', () => {
  assert.equal(TICK_RATE, 60);
  const state = createInitialState(LEVEL_1);
  const { player } = step(state, { ...NONE, right: true });

  assert.ok(
    Math.abs(player.x - state.player.x - STEP_PX) < TOLERANCE,
    'a cardinal step must keep 220/60 px (floating-point sum at x = 120 is not exact)',
  );
  assert.equal(player.y, state.player.y);
});

test('RF-6: step normalises what directionFromInput leaves unnormalised', () => {
  const input = { ...NONE, up: true, right: true };
  const raw = directionFromInput(input);
  assert.deepEqual(raw, { x: 1, y: -1 }, 'directionFromInput must stay unnormalised');

  const unit = normalizeDirection(raw);
  assert.deepEqual(unit, { x: Math.SQRT1_2, y: -Math.SQRT1_2 });

  const state = createInitialState(LEVEL_1);
  const { player } = step(state, input);
  const dx = player.x - state.player.x;
  const dy = player.y - state.player.y;
  assert.ok(Math.abs(dx - unit.x * STEP_PX) < TOLERANCE, 'step must scale the normalised vector');
  assert.ok(Math.abs(dy - unit.y * STEP_PX) < TOLERANCE, 'step must scale the normalised vector');
});
