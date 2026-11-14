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
