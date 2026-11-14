import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  TICK_SECONDS,
  MOVE_SPEED,
  PLAYER_RADIUS,
  createInitialState,
  circleOverlapsRect,
  step,
} from '../js/sim.js';
import { LEVEL_1 } from '../js/levels.js';

// --- local helpers -----------------------------------------------------------

const NONE = { up: false, down: false, left: false, right: false };
const TOLERANCE = 1e-9;
const STEP_PX = MOVE_SPEED * TICK_SECONDS;
const DIAGONAL_PX = STEP_PX * Math.SQRT1_2;

// Inner faces of the play area (24 px thick perimeter walls).
const WEST_FACE = 24;
const SOUTH_FACE = 576;
const PILLAR = LEVEL_1.walls.find((wall) => wall.x > WEST_FACE && wall.y > 24 && wall.y + wall.h < SOUTH_FACE);

const playerAt = (x, y) => ({ x, y, r: PLAYER_RADIUS });

const overlapsAnyWall = (player) =>
  LEVEL_1.walls.some((wall) => circleOverlapsRect(player.x, player.y, player.r, wall));

const insideArea = (player) =>
  player.x - player.r >= 0 &&
  player.y - player.r >= 0 &&
  player.x + player.r <= LEVEL_1.area.width &&
  player.y + player.r <= LEVEL_1.area.height;

/** Runs `ticks` steps with the same input, checking invariants on every tick. */
const runTicks = (state, input, ticks, onTick) => {
  let next = state;
  for (let i = 0; i < ticks; i += 1) {
    next = step(next, input);
    if (onTick) onTick(next, i);
  }
  return next;
};

const assertNoWallPenetration = (player, where) => {
  assert.ok(!overlapsAnyWall(player), `${where}: the body overlaps a wall (${player.x}, ${player.y})`);
  assert.ok(insideArea(player), `${where}: the body left the play area (${player.x}, ${player.y})`);
};

// --- tests -------------------------------------------------------------------

test('RF-12: diagonal against the west wall keeps the vertical advance', () => {
  // From x = 120 the body needs ~33 ticks to reach the west face (36 px).
  const start = { level: LEVEL_1, player: playerAt(120, 40) };
  const sliding = runTicks(start, { ...NONE, left: true, down: true }, 40, (next, tick) =>
    assertNoWallPenetration(next.player, `tick ${tick}`),
  );

  assert.equal(sliding.player.x, WEST_FACE + PLAYER_RADIUS, 'the body must rest exactly tangent to the west wall');
  assert.ok(
    Math.abs(sliding.player.y - (40 + 40 * DIAGONAL_PX)) < TOLERANCE,
    `vertical advance must be kept while sliding, got y = ${sliding.player.y}`,
  );

  // Once pinned, ten more ticks still advance vertically at the diagonal rate.
  const pinned = runTicks(sliding, { ...NONE, left: true, down: true }, 10);
  assert.equal(pinned.player.x, WEST_FACE + PLAYER_RADIUS, 'X must stay pinned to the wall');
  assert.ok(
    Math.abs(pinned.player.y - (sliding.player.y + 10 * DIAGONAL_PX)) < TOLERANCE,
    'the free axis must keep moving at the diagonal rate',
  );
});

test('RF-12: diagonal against the interior pillar slides along its west face', () => {
  const start = { level: LEVEL_1, player: playerAt(420, 200) };
  const pillarFace = PILLAR.x - PLAYER_RADIUS; // 456 - 12 = 444

  const sliding = runTicks(start, { ...NONE, right: true, down: true }, 20, (next, tick) =>
    assertNoWallPenetration(next.player, `tick ${tick}`),
  );

  assert.equal(sliding.player.x, pillarFace, 'the body must rest exactly tangent to the pillar');
  assert.ok(
    Math.abs(sliding.player.y - (200 + 20 * DIAGONAL_PX)) < TOLERANCE,
    `vertical advance must survive the pillar, got y = ${sliding.player.y}`,
  );
});

test('RF-12: diagonal against the pillar top-left corner slides down its west face', () => {
  // Approaching the pillar corner starting exactly tangent to its top face.
  const start = { level: LEVEL_1, player: playerAt(430, 84) };
  const pillarFace = PILLAR.x - PLAYER_RADIUS; // 456 - 12 = 444

  const sliding = runTicks(start, { ...NONE, right: true, down: true }, 20, (next, tick) =>
    assertNoWallPenetration(next.player, `tick ${tick}`),
  );

  assert.equal(sliding.player.x, pillarFace, 'the corner must block X at the pillar face');
  assert.ok(
    Math.abs(sliding.player.y - (84 + 20 * DIAGONAL_PX)) < TOLERANCE,
    `the free axis must keep the full advance, got y = ${sliding.player.y}`,
  );
});

test('RF-12/RF-13: rounding the pillar corner never penetrates nor gets expelled past contact', () => {
  // From above-left the body rounds the corner: X keeps moving forward while the
  // Y push-out only ever lands on the pillar top tangent line (96 - 12 = 84).
  const start = { level: LEVEL_1, player: playerAt(420, 60) };
  const tangentY = PILLAR.y - PLAYER_RADIUS; // 84

  let previousX = start.player.x;
  let previousY = start.player.y;
  const finalState = runTicks(start, { ...NONE, right: true, down: true }, 40, (next, tick) => {
    assertNoWallPenetration(next.player, `tick ${tick}`);
    assert.ok(
      next.player.x >= previousX,
      `tick ${tick}: the free axis went backwards (${next.player.x} < ${previousX})`,
    );
    if (next.player.y < previousY - TOLERANCE) {
      // The only legal backward move is the push-out that lands on the contact line.
      assert.equal(
        next.player.y,
        tangentY,
        `tick ${tick}: the body was expelled above the contact line (y = ${next.player.y})`,
      );
    }
    previousX = next.player.x;
    previousY = next.player.y;
  });

  assert.ok(finalState.player.x > PILLAR.x + PILLAR.w, 'the body must clear the pillar on the free axis');
  assert.ok(finalState.player.y > PILLAR.y, 'the body must end below the pillar top edge');
});

test('CL-2: the bottom-left corner stops both axes and stays put for 100 ticks', () => {
  const corner = { x: WEST_FACE + PLAYER_RADIUS, y: SOUTH_FACE - PLAYER_RADIUS };
  const input = { ...NONE, left: true, down: true };
  const start = createInitialState(LEVEL_1);

  const settled = runTicks(start, input, 200, (next, tick) =>
    assertNoWallPenetration(next.player, `tick ${tick}`),
  );
  assert.deepEqual({ x: settled.player.x, y: settled.player.y }, corner, 'the body must wedge into the corner');

  let previous = settled;
  for (let tick = 0; tick < 100; tick += 1) {
    const next = step(previous, input);
    assert.equal(next.player.x, corner.x, `tick ${tick}: X vibrated or drifted`);
    assert.equal(next.player.y, corner.y, `tick ${tick}: Y vibrated or drifted`);
    previous = next;
  }
});

test('RF-11/RF-13: 300 diagonal ticks against a wall never enter an AABB', () => {
  const start = createInitialState(LEVEL_1);
  const input = { ...NONE, left: true, down: true };

  runTicks(start, input, 300, (next, tick) => {
    for (const wall of LEVEL_1.walls) {
      assert.ok(
        !circleOverlapsRect(next.player.x, next.player.y, next.player.r, wall),
        `tick ${tick}: body inside wall ${JSON.stringify(wall)}`,
      );
    }
    assert.ok(insideArea(next.player), `tick ${tick}: body left the play area`);
  });
});

test('RF-13: sliding does not accumulate penetration at the corner', () => {
  const corner = { x: WEST_FACE + PLAYER_RADIUS, y: SOUTH_FACE - PLAYER_RADIUS };
  const input = { ...NONE, left: true, down: true };
  const settled = runTicks(createInitialState(LEVEL_1), input, 200);

  assert.equal(settled.player.x, corner.x);
  assert.equal(settled.player.y, corner.y);

  // 100 further ticks of pushing must not change either coordinate.
  const after = runTicks(settled, input, 100);
  assert.equal(after.player.x, corner.x, 'no X penetration may accumulate');
  assert.equal(after.player.y, corner.y, 'no Y penetration may accumulate');
  assertNoWallPenetration(after.player, 'after 300 ticks');

  // The body is exactly tangent to both walls: distance to each AABB face is the radius.
  const west = LEVEL_1.walls.find((wall) => wall.x === 0 && wall.h === LEVEL_1.area.height);
  const south = LEVEL_1.walls.find((wall) => wall.y + wall.h === LEVEL_1.area.height && wall.w === LEVEL_1.area.width);
  assert.ok(Math.abs(after.player.x - (west.x + west.w) - PLAYER_RADIUS) < TOLERANCE);
  assert.ok(Math.abs(south.y - after.player.y - PLAYER_RADIUS) < TOLERANCE);
});

test('RF-12: sliding keeps the cardinal speed on the free axis', () => {
  // Sliding along a wall moves the same 220/60 px per tick as a free axis move.
  const start = { level: LEVEL_1, player: playerAt(60, 300) };
  const input = { ...NONE, left: true, up: true };

  const settled = runTicks(start, input, 20); // X is pinned well before tick 20
  assert.equal(settled.player.x, WEST_FACE + PLAYER_RADIUS);

  const before = settled.player;
  const after = step(settled, input).player;
  assert.equal(after.x, WEST_FACE + PLAYER_RADIUS, 'the blocked axis must not move');
  assert.ok(
    Math.abs(before.y - after.y - DIAGONAL_PX) < TOLERANCE,
    `the free axis must advance ${DIAGONAL_PX} px, got ${before.y - after.y}`,
  );
});
