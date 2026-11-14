import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  TICK_RATE,
  TICK_SECONDS,
  MOVE_SPEED,
  PLAYER_RADIUS,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  createInitialState,
  directionFromInput,
  circleOverlapsRect,
  movePlayer,
  step,
} from '../js/sim.js';
import { LEVEL_1 } from '../js/levels.js';

// --- local helpers -----------------------------------------------------------

const NONE = { up: false, down: false, left: false, right: false };

const TOLERANCE = 1e-9;
const STEP_PX = MOVE_SPEED * TICK_SECONDS;

/** True when the player's body overlaps any wall of the level. */
const overlapsAnyWall = (level, player) =>
  level.walls.some((wall) => circleOverlapsRect(player.x, player.y, player.r, wall));

/** True when the player's body is fully inside the play area. */
const insideArea = (player) =>
  player.x - player.r >= 0 &&
  player.y - player.r >= 0 &&
  player.x + player.r <= CANVAS_WIDTH &&
  player.y + player.r <= CANVAS_HEIGHT;

/** Inner faces of the playable area, derived from the perimeter walls only. */
const MID_X = CANVAS_WIDTH / 2;
const MID_Y = CANVAS_HEIGHT / 2;

const northInnerFace = Math.max(
  ...LEVEL_1.walls
    .filter((wall) => wall.y === 0 && wall.x <= MID_X && wall.x + wall.w >= MID_X)
    .map((wall) => wall.y + wall.h),
);

const westInnerFace = Math.max(
  ...LEVEL_1.walls
    .filter((wall) => wall.x === 0 && wall.y <= MID_Y && wall.y + wall.h >= MID_Y)
    .map((wall) => wall.x + wall.w),
);

const southInnerFace = Math.min(
  ...LEVEL_1.walls
    .filter((wall) => wall.y + wall.h === CANVAS_HEIGHT && wall.x <= MID_X && wall.x + wall.w >= MID_X)
    .map((wall) => wall.y),
);

/** Runs `ticks` simulation steps with the same input, checking invariants. */
const runTicks = (state, input, ticks, onTick) => {
  let next = state;
  for (let i = 0; i < ticks; i += 1) {
    next = step(next, input);
    if (onTick) onTick(next, i);
  }
  return next;
};

// --- tests -------------------------------------------------------------------

test('RF-5: directionFromInput maps pressed keys to -1/0/1 components', () => {
  assert.deepEqual(directionFromInput(NONE), { x: 0, y: 0 });
  assert.deepEqual(directionFromInput({ ...NONE, right: true }), { x: 1, y: 0 });
  assert.deepEqual(directionFromInput({ ...NONE, left: true }), { x: -1, y: 0 });
  assert.deepEqual(directionFromInput({ ...NONE, down: true }), { x: 0, y: 1 });
  assert.deepEqual(directionFromInput({ ...NONE, up: true }), { x: 0, y: -1 });
  // Not normalised yet (normalisation is a later spec task): diagonals are ±1/±1.
  assert.deepEqual(directionFromInput({ ...NONE, up: true, right: true }), { x: 1, y: -1 });
  // Opposite keys cancel by addition on that axis.
  assert.deepEqual(directionFromInput({ ...NONE, left: true, right: true }), { x: 0, y: 0 });
  assert.deepEqual(directionFromInput({ ...NONE, up: true, down: true }), { x: 0, y: 0 });
});

test('RF-8: with no input the step returns a new state with the same position', () => {
  const state = createInitialState(LEVEL_1);
  const next = step(state, NONE);

  assert.notEqual(next, state, 'step must return a new state object');
  assert.notEqual(next.player, state.player, 'step must return a new player object');
  assert.equal(next.level, LEVEL_1, 'the level object must be preserved');
  assert.deepEqual(next.player, { x: 120, y: 300, r: PLAYER_RADIUS });
  assert.deepEqual(state.player, { x: 120, y: 300, r: PLAYER_RADIUS }, 'step must not mutate its input');
});

test('RF-5/RNF-1: one key moves exactly 220/60 px per tick on the correct axis', () => {
  assert.equal(TICK_RATE, 60);
  assert.ok(Math.abs(STEP_PX - 220 / 60) < TOLERANCE, `expected 220/60 px per tick, got ${STEP_PX}`);

  const state = createInitialState(LEVEL_1);
  const cases = [
    { input: { ...NONE, right: true }, axis: 'x', sign: 1 },
    { input: { ...NONE, left: true }, axis: 'x', sign: -1 },
    { input: { ...NONE, down: true }, axis: 'y', sign: 1 },
    { input: { ...NONE, up: true }, axis: 'y', sign: -1 },
  ];

  for (const { input, axis, sign } of cases) {
    const { player } = step(state, input);
    const other = axis === 'x' ? 'y' : 'x';
    const delta = player[axis] - state.player[axis];

    assert.ok(
      Math.abs(delta - sign * STEP_PX) < TOLERANCE,
      `expected ${sign * STEP_PX} on ${axis}, got ${delta}`,
    );
    assert.equal(player[other], state.player[other], `the ${other} axis must not move`);
    assert.ok(!overlapsAnyWall(LEVEL_1, player), 'the player must not enter a wall');
  }
});

test('RF-10: releasing the keys stops the player on the next tick (no inertia)', () => {
  const state = createInitialState(LEVEL_1);
  const moving = step(state, { ...NONE, right: true });
  const stopped = step(moving, NONE);

  assert.deepEqual(stopped.player, { ...moving.player });
  const afterTwoIdleTicks = runTicks(stopped, NONE, 2);
  assert.deepEqual(afterTwoIdleTicks.player, { ...moving.player });
});

test('RF-11/RF-13/CL-3: pushing the west wall for 600 ticks leaves the body tangent', () => {
  const state = createInitialState(LEVEL_1);
  const tangentX = westInnerFace + PLAYER_RADIUS;

  const pushed = runTicks(state, { ...NONE, left: true }, 600, (next, tick) => {
    assert.ok(!overlapsAnyWall(LEVEL_1, next.player), `tick ${tick}: the player entered a wall`);
    assert.ok(insideArea(next.player), `tick ${tick}: the player left the play area`);
    assert.ok(next.player.x >= tangentX, `tick ${tick}: penetration accumulated at x=${next.player.x}`);
  });

  assert.equal(pushed.player.x, tangentX, 'the body must rest exactly tangent to the west wall');
  assert.ok(
    Math.abs(pushed.player.x - (westInnerFace + PLAYER_RADIUS)) < TOLERANCE,
    'contact must be stable, not drifting',
  );
  assert.equal(pushed.player.y, 300, 'pushing left must not move the player vertically');
});

test('RF-11/RF-13/CL-3: pushing the south wall for 600 ticks leaves the body tangent', () => {
  const state = createInitialState(LEVEL_1);
  const tangentY = southInnerFace - PLAYER_RADIUS;

  const pushed = runTicks(state, { ...NONE, down: true }, 600, (next, tick) => {
    assert.ok(!overlapsAnyWall(LEVEL_1, next.player), `tick ${tick}: the player entered a wall`);
    assert.ok(insideArea(next.player), `tick ${tick}: the player left the play area`);
    assert.ok(next.player.y <= tangentY, `tick ${tick}: penetration accumulated at y=${next.player.y}`);
  });

  assert.equal(pushed.player.y, tangentY, 'the body must rest exactly tangent to the south wall');
  assert.equal(pushed.player.x, 120, 'pushing down must not move the player horizontally');
});

test('RF-11: movePlayer pushes the body out of a wall on a single axis', () => {
  const player = { x: 30, y: 300, r: PLAYER_RADIUS }; // already 6 px inside the west wall
  const next = movePlayer(player, LEVEL_1.walls, -STEP_PX, 0);

  assert.equal(next.x, westInnerFace + PLAYER_RADIUS);
  assert.equal(next.y, 300);
  assert.ok(!overlapsAnyWall(LEVEL_1, next), 'the body must end outside the wall');
  assert.ok(Math.abs(next.x - player.x) < PLAYER_RADIUS, 'the body must be pushed out, not teleported');
});

test('RF-3/RF-11: 300 diagonal ticks towards a wall never tunnel through a wall', () => {
  const state = createInitialState(LEVEL_1);
  const diagonal = { ...NONE, left: true, down: true };

  runTicks(state, diagonal, 300, (next, tick) => {
    assert.ok(!overlapsAnyWall(LEVEL_1, next.player), `tick ${tick}: the player tunneled into a wall`);
    assert.ok(insideArea(next.player), `tick ${tick}: the player left the play area`);
  });
});

test('RNF-3: the per-tick step is smaller than the narrowest wall and passage', () => {
  const stepPx = MOVE_SPEED / TICK_RATE;
  const minWallThickness = Math.min(
    ...LEVEL_1.walls.flatMap((wall) => [wall.w, wall.h]),
  );
  const playerDiameter = 2 * PLAYER_RADIUS;

  // Narrowest passage of Level 1: the gap between the interior pillar and a border.
  const pillar = LEVEL_1.walls.find(
    (wall) =>
      wall.x > westInnerFace &&
      wall.x + wall.w < CANVAS_WIDTH &&
      wall.y > northInnerFace &&
      wall.y + wall.h < southInnerFace,
  );
  assert.ok(pillar, 'Level 1 must keep an interior pillar');
  const narrowestPassage = Math.min(pillar.y - northInnerFace, southInnerFace - (pillar.y + pillar.h));

  assert.equal(narrowestPassage, 72, `expected a 72 px passage, got ${narrowestPassage}`);
  assert.ok(stepPx < minWallThickness, `step ${stepPx} px must be smaller than the wall ${minWallThickness} px`);
  assert.ok(stepPx < playerDiameter, `step ${stepPx} px must be smaller than the body diameter ${playerDiameter} px`);
  assert.ok(
    stepPx < narrowestPassage / 2,
    `step ${stepPx} px must be smaller than half the narrowest passage ${narrowestPassage / 2} px`,
  );
});

test('RF-2: createInitialState still returns the fixed spawn for Level 1', () => {
  const state = createInitialState(LEVEL_1);
  assert.equal(state.level, LEVEL_1);
  assert.deepEqual(state.player, { x: 120, y: 300, r: 12 });
});
