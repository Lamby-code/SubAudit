import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  PLAYER_RADIUS,
  META_RADIUS,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  createInitialState,
} from '../js/sim.js';
import { LEVEL_1 } from '../js/levels.js';
import { centeredRect, victoryLayout, render } from '../js/render.js';

// --- fake canvas 2d context --------------------------------------------------

/**
 * Records every drawing call together with the style in effect at that moment,
 * so the tests can assert the order of the layers, not just that nothing threw.
 */
const createFakeContext = () => {
  const ctx = { calls: [], fillStyle: '', strokeStyle: '', lineWidth: 1 };
  const record = (op) => (...args) => {
    ctx.calls.push({
      op,
      args,
      fillStyle: ctx.fillStyle,
      strokeStyle: ctx.strokeStyle,
      lineWidth: ctx.lineWidth,
    });
  };
  for (const op of [
    'fillRect',
    'beginPath',
    'arc',
    'fill',
    'stroke',
    'save',
    'restore',
    'fillText',
    'translate',
    'closePath',
  ]) {
    ctx[op] = record(op);
  }
  return ctx;
};

const DRAW_OPS = new Set(['fillRect', 'arc', 'fill', 'stroke', 'fillText']);

const drawingCalls = (calls) => calls.filter((call) => DRAW_OPS.has(call.op));

const lastIndexOf = (calls, predicate) => {
  let found = -1;
  calls.forEach((call, index) => {
    if (predicate(call)) found = index;
  });
  return found;
};

// --- tests -------------------------------------------------------------------

test('RF-1/RF-4b: render draws background, walls, meta and player in that order', () => {
  const state = createInitialState(LEVEL_1);
  const ctx = createFakeContext();

  render(ctx, state);

  const { calls } = ctx;
  assert.ok(calls.length > 0, 'render must draw something');

  // 1. Background: the whole canvas, first.
  assert.equal(calls[0].op, 'fillRect');
  assert.deepEqual(calls[0].args, [0, 0, CANVAS_WIDTH, CANVAS_HEIGHT]);
  assert.equal(calls[0].fillStyle, '#14161a', 'the background must be #14161a');

  // 2. Walls: one filled rectangle per level wall, in level order.
  const wallRects = calls.filter((call) => call.op === 'fillRect' && call.fillStyle === '#3a4048');
  assert.deepEqual(
    wallRects.map((call) => call.args),
    LEVEL_1.walls.map((wall) => [wall.x, wall.y, wall.w, wall.h]),
    'every wall must be filled with #3a4048 exactly once',
  );

  // 3. Meta after every wall.
  const metaArc = calls.findIndex(
    (call) => call.op === 'arc' && call.args[2] === META_RADIUS && call.fillStyle === '#ffb703',
  );
  assert.ok(metaArc > 0, 'the meta circle must be drawn');
  const lastWall = lastIndexOf(calls, (call) => call.op === 'fillRect' && call.fillStyle === '#3a4048');
  assert.ok(metaArc > lastWall, 'the meta must be drawn after the walls (RF-4b)');

  // 4. Player last: the final drawing op is the player outline.
  const lastArc = lastIndexOf(calls, (call) => call.op === 'arc');
  assert.deepEqual(
    calls[lastArc].args.slice(0, 3),
    [state.player.x, state.player.y, PLAYER_RADIUS],
    'the last circle drawn must be the player',
  );
  assert.ok(lastArc > metaArc, 'the player must be drawn after the meta');

  const lastDraw = lastIndexOf(calls, (call) => DRAW_OPS.has(call.op));
  assert.equal(lastDraw, calls.length - 1, 'nothing may be drawn after the player');
  assert.equal(calls[lastDraw].op, 'stroke', 'the player ends with its dark outline');

  // The player body is white and the outline is a different colour.
  const whiteFill = lastIndexOf(calls, (call) => call.op === 'fill' && call.fillStyle === '#ffffff');
  assert.ok(whiteFill > metaArc, 'the player body must be filled white after the meta');
  assert.notEqual(calls[lastDraw].strokeStyle, '#ffffff', 'the outline must not be white');
});

test('RF-4b: the meta is a single circle at (816, 536) with radius 24', () => {
  const ctx = createFakeContext();
  render(ctx, createInitialState(LEVEL_1));

  const metaArcs = ctx.calls.filter(
    (call) => call.op === 'arc' && call.args[0] === 816 && call.args[1] === 536 && call.args[2] === META_RADIUS,
  );
  assert.equal(metaArcs.length, 1, 'exactly one arc of radius 24 must sit on the meta centre');
  assert.equal(LEVEL_1.meta.x, 816);
  assert.equal(LEVEL_1.meta.y, 536);
  assert.equal(metaArcs[0].fillStyle, '#ffb703', 'the meta base colour must be #ffb703');

  // The meta is also stroked with an inner ring and a dark border (RNF-4:
  // recognisable by shape, not only by hue).
  const playerArc = lastIndexOf(ctx.calls, (call) => call.op === 'arc');
  const metaStrokes = ctx.calls.filter(
    (call, index) => call.op === 'stroke' && index < playerArc && call.strokeStyle !== '',
  );
  assert.ok(metaStrokes.length >= 2, 'the meta needs a lighter inner ring and a dark border');
});

test('RNF-2: centeredRect centres the panel in the fixed 960x600 area', () => {
  assert.deepEqual(centeredRect(CANVAS_WIDTH, CANVAS_HEIGHT, 400, 120), { x: 280, y: 240, w: 400, h: 120 });

  const odd = centeredRect(CANVAS_WIDTH, CANVAS_HEIGHT, 401, 121);
  assert.equal(odd.x, 279.5);
  assert.equal(odd.y, 239.5);
  assert.equal(odd.x + odd.w / 2, CANVAS_WIDTH / 2);
  assert.equal(odd.y + odd.h / 2, CANVAS_HEIGHT / 2);

  for (const [w, h] of [
    [300, 200],
    [640, 480],
    [100, 40],
  ]) {
    const rect = centeredRect(CANVAS_WIDTH, CANVAS_HEIGHT, w, h);
    assert.ok(Math.abs(rect.x + rect.w / 2 - CANVAS_WIDTH / 2) <= 0.5, `panel of ${w}x${h} is not centred horizontally`);
    assert.ok(Math.abs(rect.y + rect.h / 2 - CANVAS_HEIGHT / 2) <= 0.5, `panel of ${w}x${h} is not centred vertically`);
    assert.equal(rect.w, w);
    assert.equal(rect.h, h);
  }
});

test('RF-15: victoryLayout centres the panel and keeps the text inside it', () => {
  for (const [textWidth, textHeight] of [
    [420, 36],
    [300, 40],
    [200, 24],
  ]) {
    const { panel, textX, textY } = victoryLayout(CANVAS_WIDTH, CANVAS_HEIGHT, textWidth, textHeight);

    assert.equal(textX, CANVAS_WIDTH / 2, 'the text must be centred horizontally in the play area');
    assert.equal(textY, CANVAS_HEIGHT / 2, 'the text must be centred vertically in the play area');

    assert.ok(Math.abs(panel.x + panel.w / 2 - CANVAS_WIDTH / 2) <= 0.5, 'the panel must stay centred');
    assert.ok(Math.abs(panel.y + panel.h / 2 - CANVAS_HEIGHT / 2) <= 0.5, 'the panel must stay centred');

    assert.ok(panel.w >= textWidth, 'the panel must be at least as wide as the text');
    assert.ok(panel.h >= textHeight, 'the panel must be at least as tall as the text');

    const textLeft = textX - textWidth / 2;
    const textRight = textX + textWidth / 2;
    const textTop = textY - textHeight / 2;
    const textBottom = textY + textHeight / 2;
    assert.ok(textLeft >= panel.x, 'the text must not overflow the panel (left)');
    assert.ok(textRight <= panel.x + panel.w, 'the text must not overflow the panel (right)');
    assert.ok(textTop >= panel.y, 'the text must not overflow the panel (top)');
    assert.ok(textBottom <= panel.y + panel.h, 'the text must not overflow the panel (bottom)');
  }
});

test('RNF-2/constitution 3: importing render.js in Node never needs a DOM', () => {
  assert.equal(typeof globalThis.document, 'undefined', 'the tests must run without a document');
  assert.equal(typeof globalThis.window, 'undefined', 'the tests must run without a window');

  const rect = centeredRect(960, 600, 240, 80);
  assert.equal(rect.x, 360);
  const layout = victoryLayout(960, 600, 240, 80);
  assert.ok(layout.panel.w >= 240);

  // Rendering with an explicit fake context works and is repeatable (no global state).
  const first = createFakeContext();
  render(first, createInitialState(LEVEL_1));
  const second = createFakeContext();
  render(second, createInitialState(LEVEL_1));
  assert.deepEqual(
    first.calls.map((call) => [call.op, call.args]),
    second.calls.map((call) => [call.op, call.args]),
    'two renders of the same state must record identical draw calls',
  );
});
