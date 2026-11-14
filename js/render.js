// Canvas drawing for the game room: background, walls, meta, player.
// Every DOM/context access happens inside render(); importing this module in
// Node touches nothing global, and there is no mutable module state.

import { CANVAS_WIDTH, CANVAS_HEIGHT, PLAYER_RADIUS, META_RADIUS, isWon } from './sim.js';

const COLORS = {
  background: '#14161a',
  wall: '#3a4048',
  meta: '#ffb703',
  metaRing: '#ffd166',
  metaEdge: '#3d2a00',
  player: '#ffffff',
  playerEdge: '#14161a',
  veil: 'rgba(20, 22, 26, 0.72)',
  panel: '#22262c',
  panelEdge: '#8b93a1',
  text: '#ffffff',
};

const META_RING_RADIUS = META_RADIUS * 0.55;
const META_BORDER_WIDTH = 6;
const META_RING_WIDTH = 4;
const PLAYER_EDGE_WIDTH = 2;

// Padding of the victory panel around its text (used from the next task on).
const PANEL_PADDING_X = 32;
const PANEL_PADDING_Y = 24;

// Victory message: literal Spanish text, with both opening and closing marks.
const VICTORY_TEXT = '¡Nivel 1 completado!';
const VICTORY_FONT_SIZE = 36;
const VICTORY_FONT = `bold ${VICTORY_FONT_SIZE}px system-ui, sans-serif`;
const PANEL_EDGE_WIDTH = 3;

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

const drawVictory = (ctx) => {
  // Veil over the whole play area (not over the window): the room dims, the
  // message is the only thing that reads clearly.
  ctx.fillStyle = COLORS.veil;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // The text is measured here, never at module level.
  ctx.font = VICTORY_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const textWidth = ctx.measureText(VICTORY_TEXT).width;
  const { panel, textX, textY } = victoryLayout(CANVAS_WIDTH, CANVAS_HEIGHT, textWidth, VICTORY_FONT_SIZE);

  // Opaque panel with a light border so the text is legible on its own.
  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
  ctx.strokeStyle = COLORS.panelEdge;
  ctx.lineWidth = PANEL_EDGE_WIDTH;
  ctx.strokeRect(panel.x, panel.y, panel.w, panel.h);

  ctx.fillStyle = COLORS.text;
  ctx.fillText(VICTORY_TEXT, textX, textY);
};

/**
 * Paints one frame of the room. Draw order matters: background, walls, meta,
 * player, victory overlay. The meta goes after the walls so it is never hidden
 * by geometry (RF-4b), and the player goes last so it is always visible. The
 * overlay is derived from the state every frame: there is no "message shown"
 * flag, so a won level keeps painting the same message.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ level: object, player: { x: number, y: number, r: number } }} state
 */
export const render = (ctx, state) => {
  drawBackground(ctx);
  drawWalls(ctx, state.level.walls);
  drawMeta(ctx, state.level.meta);
  drawPlayer(ctx, state.player);
  if (isWon(state)) drawVictory(ctx);
};
