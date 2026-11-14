// Canvas drawing for the game room: background, walls, meta, player.
// Every DOM/context access happens inside render(); importing this module in
// Node touches nothing global, and there is no mutable module state.

import { CANVAS_WIDTH, CANVAS_HEIGHT, PLAYER_RADIUS, META_RADIUS } from './sim.js';

const COLORS = {
  background: '#14161a',
  wall: '#3a4048',
  meta: '#ffb703',
  metaRing: '#ffd166',
  metaEdge: '#3d2a00',
  player: '#ffffff',
  playerEdge: '#14161a',
};

const META_RING_RADIUS = META_RADIUS * 0.55;
const META_BORDER_WIDTH = 6;
const META_RING_WIDTH = 4;
const PLAYER_EDGE_WIDTH = 2;

// Padding of the victory panel around its text (used from the next task on).
const PANEL_PADDING_X = 32;
const PANEL_PADDING_Y = 24;

/**
 * Places a w x h box at the exact centre of an areaW x areaH area.
 * Pure: no canvas, no viewport size involved.
 * @param {number} areaW
 * @param {number} areaH
 * @param {number} w
 * @param {number} h
 * @returns {{ x: number, y: number, w: number, h: number }}
 */
export const centeredRect = (areaW, areaH, w, h) => ({
  x: (areaW - w) / 2,
  y: (areaH - h) / 2,
  w,
  h,
});

/**
 * Layout of the victory overlay: a panel centred in the play area and the text
 * centred inside it, with padding so the text never touches the panel border.
 * Pure: it only does arithmetic.
 * @param {number} areaW
 * @param {number} areaH
 * @param {number} textWidth
 * @param {number} textHeight
 * @returns {{ panel: { x: number, y: number, w: number, h: number }, textX: number, textY: number }}
 */
export const victoryLayout = (areaW, areaH, textWidth, textHeight) => {
  const panel = centeredRect(
    areaW,
    areaH,
    textWidth + PANEL_PADDING_X * 2,
    textHeight + PANEL_PADDING_Y * 2,
  );
  return {
    panel,
    textX: panel.x + panel.w / 2,
    textY: panel.y + panel.h / 2,
  };
};

const drawBackground = (ctx) => {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
};

const drawWalls = (ctx, walls) => {
  ctx.fillStyle = COLORS.wall;
  for (const wall of walls) {
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
  }
};

const drawMeta = (ctx, meta) => {
  // Solid base disc with a dark border: one path, filled and then stroked.
  ctx.fillStyle = COLORS.meta;
  ctx.strokeStyle = COLORS.metaEdge;
  ctx.lineWidth = META_BORDER_WIDTH;
  ctx.beginPath();
  ctx.arc(meta.x, meta.y, META_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Lighter inner ring: the goal reads by shape, not only by hue.
  ctx.strokeStyle = COLORS.metaRing;
  ctx.lineWidth = META_RING_WIDTH;
  ctx.beginPath();
  ctx.arc(meta.x, meta.y, META_RING_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
};

const drawPlayer = (ctx, player) => {
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(player.x, player.y, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = COLORS.playerEdge;
  ctx.lineWidth = PLAYER_EDGE_WIDTH;
  ctx.beginPath();
  ctx.arc(player.x, player.y, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
};

/**
 * Paints one frame of the room. Draw order matters: background, walls, meta,
 * player. The meta goes after the walls so it is never hidden by geometry
 * (RF-4b), and the player goes last so it is always visible.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ level: object, player: { x: number, y: number, r: number } }} state
 */
export const render = (ctx, state) => {
  drawBackground(ctx);
  drawWalls(ctx, state.level.walls);
  drawMeta(ctx, state.level.meta);
  drawPlayer(ctx, state.player);
};
