import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  PLAYER_RADIUS,
  META_RADIUS,
  META_TOUCH_DISTANCE,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  createInitialState,
} from '../js/sim.js';
import { LEVEL_1, LEVELS } from '../js/levels.js';

// --- local geometry helpers (kept in the test on purpose: sim.js gains the
// --- collision helpers only in later tasks) ----------------------------------

/** Distance from a point to the closest point of an AABB (0 when inside). */
const distanceToRect = (px, py, rect) => {
  const nearestX = Math.min(Math.max(px, rect.x), rect.x + rect.w);
  const nearestY = Math.min(Math.max(py, rect.y), rect.y + rect.h);
  return Math.hypot(px - nearestX, py - nearestY);
};

/** Circle-AABB overlap by distance to the closest point of the rectangle. */
const circleOverlapsRect = (cx, cy, r, rect) => distanceToRect(cx, cy, rect) < r;

/** Liang-Barsky: does the segment a->b intersect the AABB (edges included)? */
const segmentIntersectsRect = (a, b, rect) => {
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const bounds = [
    [-dx, a.x - rect.x],
    [dx, rect.x + rect.w - a.x],
    [-dy, a.y - rect.y],
    [dy, rect.y + rect.h - a.y],
  ];
  for (const [p, q] of bounds) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const t = q / p;
    if (p < 0) {
      if (t > t1) return false;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return false;
      if (t < t1) t1 = t;
    }
  }
  return true;
};

/** A wall belongs to the perimeter when it touches any outer edge of the room. */
const isPerimeterWall = (wall) =>
  wall.x === 0 ||
  wall.y === 0 ||
  wall.x + wall.w === CANVAS_WIDTH ||
  wall.y + wall.h === CANVAS_HEIGHT;

const interiorWalls = (level) => level.walls.filter((wall) => !isPerimeterWall(wall));

const perimeterWalls = (level) => level.walls.filter((wall) => isPerimeterWall(wall));

/**
 * Free rectangle of the room, derived from the perimeter walls (no hardcoded
 * numbers): the inner face of each border. Only walls that reach the middle of
 * the opposite axis count, so the side walls are not mistaken for the top or
 * bottom border.
 */
const playableBounds = (level) => {
  const midX = CANVAS_WIDTH / 2;
  const midY = CANVAS_HEIGHT / 2;
  const spansY = (wall) => wall.y <= midY && wall.y + wall.h >= midY;
  const spansX = (wall) => wall.x <= midX && wall.x + wall.w >= midX;
  const walls = perimeterWalls(level);

  const left = walls
    .filter((w) => w.x === 0 && spansY(w))
    .reduce((m, w) => Math.max(m, w.x + w.w), 0);
  const right = walls
    .filter((w) => w.x + w.w === CANVAS_WIDTH && spansY(w))
    .reduce((m, w) => Math.min(m, w.x), CANVAS_WIDTH);
  const top = walls
    .filter((w) => w.y === 0 && spansX(w))
    .reduce((m, w) => Math.max(m, w.y + w.h), 0);
  const bottom = walls
    .filter((w) => w.y + w.h === CANVAS_HEIGHT && spansX(w))
    .reduce((m, w) => Math.min(m, w.y), CANVAS_HEIGHT);
  return { left, right, top, bottom };
};

const insideAnyWall = (level, px, py) =>
  level.walls.some((wall) => px >= wall.x && px <= wall.x + wall.w && py >= wall.y && py <= wall.y + wall.h);

// --- tests ------------------------------------------------------------------

test('RF-3: perimeter walls close all four borders with no gap', () => {
  const { left, right, top, bottom } = playableBounds(LEVEL_1);
  assert.ok(left > 0 && right < CANVAS_WIDTH, 'west and east borders must be covered by walls');
  assert.ok(top > 0 && bottom < CANVAS_HEIGHT, 'north and south borders must be covered by walls');

  // Every sample of each border band must fall inside a perimeter wall.
  for (let x = 0.5; x < CANVAS_WIDTH; x += 1) {
    for (const y of [0.5, top / 2, top - 0.5]) {
      assert.ok(
        insideAnyWall(LEVEL_1, x, y),
        `north border gap at (${x}, ${y})`,
      );
    }
  }
  for (let x = 0.5; x < CANVAS_WIDTH; x += 1) {
    for (const y of [bottom + 0.5, (bottom + CANVAS_HEIGHT) / 2, CANVAS_HEIGHT - 0.5]) {
      assert.ok(
        insideAnyWall(LEVEL_1, x, y),
        `south border gap at (${x}, ${y})`,
      );
    }
  }
  for (let y = 0.5; y < CANVAS_HEIGHT; y += 1) {
    for (const x of [0.5, left / 2, left - 0.5]) {
      assert.ok(
        insideAnyWall(LEVEL_1, x, y),
        `west border gap at (${x}, ${y})`,
      );
    }
  }
  for (let y = 0.5; y < CANVAS_HEIGHT; y += 1) {
    for (const x of [right + 0.5, (right + CANVAS_WIDTH) / 2, CANVAS_WIDTH - 0.5]) {
      assert.ok(
        insideAnyWall(LEVEL_1, x, y),
        `east border gap at (${x}, ${y})`,
      );
    }
  }
});

test('RF-2: spawn is clear of walls and meta and more than 36 px from the meta', () => {
  const { spawn } = LEVEL_1;
  assert.deepEqual({ x: spawn.x, y: spawn.y }, { x: 120, y: 300 }, 'spawn must be the fixed point (120, 300)');

  const { left, right, top, bottom } = playableBounds(LEVEL_1);
  assert.ok(spawn.x - left >= PLAYER_RADIUS, 'spawn body must clear the west wall');
  assert.ok(right - spawn.x >= PLAYER_RADIUS, 'spawn body must clear the east wall');
  assert.ok(spawn.y - top >= PLAYER_RADIUS, 'spawn body must clear the north wall');
  assert.ok(bottom - spawn.y >= PLAYER_RADIUS, 'spawn body must clear the south wall');

  for (const wall of LEVEL_1.walls) {
    assert.ok(
      distanceToRect(spawn.x, spawn.y, wall) >= PLAYER_RADIUS,
      `spawn body overlaps wall ${JSON.stringify(wall)}`,
    );
  }

  const distanceToMeta = Math.hypot(spawn.x - LEVEL_1.meta.x, spawn.y - LEVEL_1.meta.y);
  assert.ok(distanceToMeta > META_RADIUS, 'spawn must not sit inside the meta circle');
  assert.ok(
    distanceToMeta > META_TOUCH_DISTANCE,
    `spawn must be farther than ${META_TOUCH_DISTANCE} px from the meta, got ${distanceToMeta}`,
  );
});

test('RF-4b: the full meta circle lies inside the play area with a 1 px margin', () => {
  const { left, right, top, bottom } = playableBounds(LEVEL_1);
  const meta = LEVEL_1.meta;
  assert.deepEqual({ x: meta.x, y: meta.y }, { x: 816, y: 536 }, 'meta centre must be (816, 536)');
  assert.equal(META_RADIUS, 24);

  const bbox = {
    left: meta.x - META_RADIUS,
    right: meta.x + META_RADIUS,
    top: meta.y - META_RADIUS,
    bottom: meta.y + META_RADIUS,
  };
  assert.deepEqual(bbox, { left: 792, right: 840, top: 512, bottom: 560 });

  assert.ok(bbox.left - left >= 1, `meta must keep >= 1 px from the west wall (${bbox.left - left})`);
  assert.ok(right - bbox.right >= 1, `meta must keep >= 1 px from the east wall (${right - bbox.right})`);
  assert.ok(bbox.top - top >= 1, `meta must keep >= 1 px from the north wall (${bbox.top - top})`);
  assert.ok(bottom - bbox.bottom >= 1, `meta must keep >= 1 px from the south wall (${bottom - bbox.bottom})`);
});

test('RF-4b: no wall rectangle overlaps the meta circle', () => {
  for (const wall of LEVEL_1.walls) {
    assert.ok(
      !circleOverlapsRect(LEVEL_1.meta.x, LEVEL_1.meta.y, META_RADIUS, wall),
      `wall ${JSON.stringify(wall)} overlaps the meta circle`,
    );
  }
});

test('RF-4: the straight spawn-to-meta segment is blocked by the interior pillar', () => {
  const pillars = interiorWalls(LEVEL_1);
  assert.ok(pillars.length >= 1, 'the level needs at least one interior wall');

  const blockers = pillars.filter((wall) =>
    segmentIntersectsRect(LEVEL_1.spawn, LEVEL_1.meta, wall),
  );
  assert.ok(
    blockers.length >= 1,
    `no interior wall crosses the straight spawn->meta path; pillars: ${JSON.stringify(pillars)}`,
  );

  assert.deepEqual(pillars, [{ x: 456, y: 96, w: 24, h: 408 }], 'interior pillar must be {456, 96, 24, 408}');
});

test('RF-4c: the pillar blocks the straight line and the meta stays uncovered at once', () => {
  const pillars = interiorWalls(LEVEL_1);
  const blocked = pillars.some((wall) => segmentIntersectsRect(LEVEL_1.spawn, LEVEL_1.meta, wall));
  const uncovered = LEVEL_1.walls.every(
    (wall) => !circleOverlapsRect(LEVEL_1.meta.x, LEVEL_1.meta.y, META_RADIUS, wall),
  );
  const { left, right, top, bottom } = playableBounds(LEVEL_1);
  const inside =
    LEVEL_1.meta.x - META_RADIUS >= left + 1 &&
    LEVEL_1.meta.x + META_RADIUS <= right - 1 &&
    LEVEL_1.meta.y - META_RADIUS >= top + 1 &&
    LEVEL_1.meta.y + META_RADIUS <= bottom - 1;

  assert.ok(blocked, 'RF-4: the interior pillar must block the straight path');
  assert.ok(uncovered, 'RF-4b: no wall may overlap the meta circle');
  assert.ok(inside, 'RF-4b: the meta circle must sit inside the play area');
});

test('CL-9/CL-10: BFS on a 6 px grid from the spawn reaches the meta without crossing walls', () => {
  const GRID_STEP = 6;
  const SAFETY = 2; // extra margin so the path is not knife-edge
  const clearance = PLAYER_RADIUS + SAFETY;
  const { left, right, top, bottom } = playableBounds(LEVEL_1);

  const isFree = (x, y) => LEVEL_1.walls.every((wall) => distanceToRect(x, y, wall) >= clearance);

  const nodeX = [];
  for (let x = left; x <= right; x += GRID_STEP) nodeX.push(x);
  const nodeY = [];
  for (let y = top; y <= bottom; y += GRID_STEP) nodeY.push(y);

  const key = (ix, iy) => `${ix},${iy}`;
  const startIx = nodeX.indexOf(LEVEL_1.spawn.x);
  const startIy = nodeY.indexOf(LEVEL_1.spawn.y);
  assert.ok(startIx >= 0 && startIy >= 0, 'spawn must land on a grid node');
  assert.ok(isFree(LEVEL_1.spawn.x, LEVEL_1.spawn.y), 'spawn node must be free');

  const visited = new Set([key(startIx, startIy)]);
  const queue = [[startIx, startIy]];
  let reached = null;
  let processed = 0;

  while (queue.length > 0) {
    const [ix, iy] = queue.shift();
    processed += 1;
    const x = nodeX[ix];
    const y = nodeY[iy];
    if (Math.hypot(x - LEVEL_1.meta.x, y - LEVEL_1.meta.y) <= META_TOUCH_DISTANCE) {
      reached = { x, y };
      break;
    }
    const neighbours = [
      [ix + 1, iy],
      [ix - 1, iy],
      [ix, iy + 1],
      [ix, iy - 1],
    ];
    for (const [nx, ny] of neighbours) {
      if (nx < 0 || ny < 0 || nx >= nodeX.length || ny >= nodeY.length) continue;
      const nodeKey = key(nx, ny);
      if (visited.has(nodeKey)) continue;
      visited.add(nodeKey);
      if (!isFree(nodeX[nx], nodeY[ny])) continue;
      queue.push([nx, ny]);
    }
  }

  assert.ok(
    reached !== null,
    `BFS visited ${visited.size} free nodes (${processed} expanded) and never got within ${META_TOUCH_DISTANCE} px of the meta`,
  );
});

test('CL-10: both side passages are at least one player diameter wide and include the meta lane', () => {
  const [pillar] = interiorWalls(LEVEL_1);
  assert.ok(pillar, 'the level needs an interior pillar');

  const { top, bottom } = playableBounds(LEVEL_1);
  const pillarTop = pillar.y;
  const pillarBottom = pillar.y + pillar.h;

  // Bottom passage: between the pillar bottom and the south wall.
  const gapBottom = bottom - pillarBottom;
  assert.ok(gapBottom >= 2 * PLAYER_RADIUS, `bottom passage is ${gapBottom} px, needs >= ${2 * PLAYER_RADIUS}`);

  const corridorLow = pillarBottom + PLAYER_RADIUS;
  const corridorHigh = bottom - PLAYER_RADIUS;
  assert.deepEqual([corridorLow, corridorHigh], [516, 564]);
  assert.ok(corridorHigh - corridorLow >= 0, 'bottom corridor must not be inverted');
  assert.ok(
    LEVEL_1.meta.y >= corridorLow && LEVEL_1.meta.y <= corridorHigh,
    `bottom free-centre corridor ${corridorLow}..${corridorHigh} must contain y = ${LEVEL_1.meta.y}`,
  );

  // Top passage: between the north wall and the pillar top.
  const gapTop = pillarTop - top;
  assert.ok(gapTop >= 2 * PLAYER_RADIUS, `top passage is ${gapTop} px, needs >= ${2 * PLAYER_RADIUS}`);
  const topCorridorLow = top + PLAYER_RADIUS;
  const topCorridorHigh = pillarTop - PLAYER_RADIUS;
  assert.deepEqual([topCorridorLow, topCorridorHigh], [36, 84]);
  assert.ok(topCorridorHigh - topCorridorLow >= 0, 'top corridor must not be inverted');
});

test('RF-14: touch distance and radii match the spec constants', () => {
  assert.equal(PLAYER_RADIUS, 12, 'player radius must be 12 px');
  assert.equal(META_RADIUS, 24, 'meta radius must be 24 px');
  assert.equal(META_TOUCH_DISTANCE, 36, 'touch distance must be 36 px');
  assert.equal(CANVAS_WIDTH, 960);
  assert.equal(CANVAS_HEIGHT, 600);
});

test('RF-2: createInitialState puts the player on the level spawn with radius 12', () => {
  const state = createInitialState(LEVEL_1);
  assert.equal(state.level, LEVEL_1, 'state must keep the same level object');
  assert.deepEqual(state.player, { x: 120, y: 300, r: PLAYER_RADIUS });
  assert.ok(LEVELS.includes(LEVEL_1), 'LEVEL_1 must be part of the LEVELS list');
});
