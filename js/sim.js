// Pure simulation module: constants and initial state.
// No DOM, no randomness, no clocks; input and state enter as plain data.

export const TICK_RATE = 60;
export const TICK_SECONDS = 1 / TICK_RATE;
export const MOVE_SPEED = 220;
export const PLAYER_RADIUS = 12;
export const META_RADIUS = 24;
export const META_TOUCH_DISTANCE = PLAYER_RADIUS + META_RADIUS;
export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 600;

/**
 * Builds the starting state of a level.
 * @param {{ spawn: { x: number, y: number } }} level
 * @returns {{ level: object, player: { x: number, y: number, r: number } }}
 */
export const createInitialState = (level) => ({
  level,
  player: { x: level.spawn.x, y: level.spawn.y, r: PLAYER_RADIUS },
});

/**
 * Turns key booleans into a direction vector with components in -1, 0, 1.
 * Opposite keys on the same axis cancel out. The vector is not normalised:
 * a diagonal is (1, -1), normalisation is a later concern.
 * @param {{ up?: boolean, down?: boolean, left?: boolean, right?: boolean }} input
 * @returns {{ x: number, y: number }}
 */
export const directionFromInput = (input = {}) => ({
  x: (input.right ? 1 : 0) - (input.left ? 1 : 0),
  y: (input.down ? 1 : 0) - (input.up ? 1 : 0),
});

/**
 * Circle-AABB overlap: true when the circle's edge crosses the rectangle.
 * Uses the distance to the closest point of the rectangle, so it also covers
 * the case where the circle's centre is inside the rectangle (distance 0).
 * @param {number} cx
 * @param {number} cy
 * @param {number} r
 * @param {{ x: number, y: number, w: number, h: number }} rect
 * @returns {boolean}
 */
export const circleOverlapsRect = (cx, cy, r, rect) => {
  const nearestX = Math.min(Math.max(cx, rect.x), rect.x + rect.w);
  const nearestY = Math.min(Math.max(cy, rect.y), rect.y + rect.h);
  return Math.hypot(cx - nearestX, cy - nearestY) < r;
};

/**
 * Applies a displacement on a single axis and pushes the player out of every
 * wall it overlaps, using the sign of that displacement. The push-out leaves
 * the body exactly tangent to the wall face, so contact is stable and never
 * accumulates penetration. One pass per axis for now: the second pass and the
 * inner-corner handling belong to a later task.
 * @param {{ x: number, y: number, r: number }} player
 * @param {Array<{ x: number, y: number, w: number, h: number }>} walls
 * @param {number} dx
 * @param {number} dy
 * @returns {{ x: number, y: number, r: number }}
 */
export const resolveAxis = (player, walls, dx, dy) => {
  const next = { x: player.x + dx, y: player.y + dy, r: player.r };

  for (const wall of walls) {
    if (!circleOverlapsRect(next.x, next.y, next.r, wall)) continue;
    if (dx > 0) next.x = wall.x - next.r;
    else if (dx < 0) next.x = wall.x + wall.w + next.r;
    else if (dy > 0) next.y = wall.y - next.r;
    else if (dy < 0) next.y = wall.y + wall.h + next.r;
  }

  return next;
};

/**
 * Moves the player against the level walls, resolving X first and Y second.
 * Solving each axis on its own is what produces sliding along a wall.
 * @param {{ x: number, y: number, r: number }} player
 * @param {Array<{ x: number, y: number, w: number, h: number }>} walls
 * @param {number} dx
 * @param {number} dy
 * @returns {{ x: number, y: number, r: number }}
 */
export const movePlayer = (player, walls, dx, dy) => {
  const afterX = resolveAxis(player, walls, dx, 0);
  return resolveAxis(afterX, walls, 0, dy);
};

/**
 * Advances the simulation one fixed tick. Pure: it never mutates the state it
 * receives. With no direction the player stays still (no inertia).
 * @param {{ level: object, player: { x: number, y: number, r: number } }} state
 * @param {{ up?: boolean, down?: boolean, left?: boolean, right?: boolean }} input
 * @returns {{ level: object, player: { x: number, y: number, r: number } }}
 */
export const step = (state, input) => {
  const dir = directionFromInput(input);
  if (dir.x === 0 && dir.y === 0) {
    return { level: state.level, player: { ...state.player } };
  }

  const stepPx = MOVE_SPEED * TICK_SECONDS;
  const player = movePlayer(state.player, state.level.walls, dir.x * stepPx, dir.y * stepPx);
  return { level: state.level, player };
};
