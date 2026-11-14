import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  PLAYER_RADIUS,
  META_RADIUS,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  createInitialState,
  isWon,
} from '../js/sim.js';
import { LEVEL_1 } from '../js/levels.js';
import { centeredRect, victoryLayout, render } from '../js/render.js';

// --- fake canvas 2d context --------------------------------------------------

/**
 * Records every drawing call together with the style in effect at that moment,
 * so the tests can assert the order of the layers, not just that nothing threw.
 */
const createFakeContext = () => {
  const ctx = {
    calls: [],
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
  };
  const record = (op) => (...args) => {
    ctx.calls.push({
      op,
      args,
      fillStyle: ctx.fillStyle,
      strokeStyle: ctx.strokeStyle,
      lineWidth: ctx.lineWidth,
      font: ctx.font,
      textAlign: ctx.textAlign,
      textBaseline: ctx.textBaseline,
    });
  };
  for (const op of [
    'fillRect',
    'strokeRect',
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
  // Deterministic text metrics: 18 px per character.
  ctx.measureText = (text) => ({ width: text.length * 18 });
  return ctx;
};

const DRAW_OPS = new Set(['fillRect', 'strokeRect', 'arc', 'fill', 'stroke', 'fillText']);

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

// --- victory overlay ---------------------------------------------------------

const VICTORY_MESSAGE = '¡Nivel 1 completado!';
const VEIL_FILL = 'rgba(20, 22, 26, 0.72)';

const wonState = () => ({ level: LEVEL_1, player: { x: LEVEL_1.meta.x, y: LEVEL_1.meta.y, r: PLAYER_RADIUS } });

const textCalls = (calls) => calls.filter((call) => call.op === 'fillText');

test('RF-15: a won state draws the victory message exactly once', () => {
  const state = wonState();
  assert.equal(isWon(state), true, 'the helper state must really be won');

  const ctx = createFakeContext();
  render(ctx, state);

  const texts = textCalls(ctx.calls);
  assert.equal(texts.length, 1, 'the message must be drawn once, not duplicated');
  assert.equal(texts[0].args[0], VICTORY_MESSAGE);
});

test('RNF-5/CL-12: the message is the literal Spanish string with both marks', () => {
  const ctx = createFakeContext();
  render(ctx, wonState());

  const [text] = textCalls(ctx.calls);
  assert.ok(text, 'the victory text must be drawn');
  assert.equal(text.args[0], '¡Nivel 1 completado!');
  assert.ok(text.args[0].startsWith('¡'), 'the opening mark must be present');
  assert.ok(text.args[0].endsWith('!'), 'the closing mark must be present');
  assert.ok(text.args[0].includes('Nivel 1'), 'the level number must be present');
  assert.equal(text.args.length, 3, 'the message must be one single full call (text, x, y)');
});

test('RF-15: the message uses bold 36px white, centred, at the play-area centre', () => {
  const ctx = createFakeContext();
  render(ctx, wonState());

  const [text] = textCalls(ctx.calls);
  assert.equal(text.args[1], CANVAS_WIDTH / 2, 'the message must be centred at x = 480');
  assert.equal(text.args[2], CANVAS_HEIGHT / 2, 'the message must be centred at y = 300');
  assert.equal(text.textAlign, 'center');
  assert.equal(text.textBaseline, 'middle');
  assert.equal(text.fillStyle, '#ffffff');
  assert.match(text.font, /bold/, 'the font must be bold');
  assert.match(text.font, /36px/, 'the font must be 36 px');
});

test('RF-15: the message is drawn after the player and after the veil', () => {
  const ctx = createFakeContext();
  render(ctx, wonState());
  const { calls } = ctx;

  const textIndex = calls.findIndex((call) => call.op === 'fillText');
  const playerArc = lastIndexOf(calls, (call) => call.op === 'arc' && call.args[2] === PLAYER_RADIUS);
  const veilIndex = calls.findIndex(
    (call) => call.op === 'fillRect' && call.fillStyle === VEIL_FILL,
  );

  assert.ok(veilIndex > playerArc, 'the veil must cover the player (drawn after it)');
  assert.ok(textIndex > playerArc, 'the message must be drawn after the player');
  assert.ok(textIndex > veilIndex, 'the message must be drawn after the veil');
});

test('RF-15: the veil covers the whole play area and the text sits inside the panel', () => {
  const ctx = createFakeContext();
  render(ctx, wonState());
  const { calls } = ctx;

  const veils = calls.filter((call) => call.op === 'fillRect' && call.fillStyle === VEIL_FILL);
  assert.equal(veils.length, 1, 'the veil must be painted once');
  assert.deepEqual(veils[0].args, [0, 0, CANVAS_WIDTH, CANVAS_HEIGHT]);

  // The text width comes from the fake measureText, so the expected panel is known.
  const expected = victoryLayout(CANVAS_WIDTH, CANVAS_HEIGHT, VICTORY_MESSAGE.length * 18, 36);
  const [text] = textCalls(calls);
  const panel = calls.find(
    (call) => call.op === 'fillRect' && call.fillStyle !== VEIL_FILL && call.fillStyle !== '#14161a' && call.fillStyle !== '#3a4048',
  );
  assert.ok(panel, 'the panel must be painted');
  assert.deepEqual(panel.args, [expected.panel.x, expected.panel.y, expected.panel.w, expected.panel.h]);
  assert.notEqual(panel.fillStyle, VEIL_FILL, 'the panel must be opaque, not the veil colour');

  const halfTextWidth = (VICTORY_MESSAGE.length * 18) / 2;
  assert.ok(text.args[1] - halfTextWidth >= panel.args[0], 'the text must not overflow the panel (left)');
  assert.ok(text.args[1] + halfTextWidth <= panel.args[0] + panel.args[2], 'the text must not overflow the panel (right)');
  assert.ok(text.args[2] - 36 / 2 >= panel.args[1], 'the text must not overflow the panel (top)');
  assert.ok(text.args[2] + 36 / 2 <= panel.args[1] + panel.args[3], 'the text must not overflow the panel (bottom)');

  // The panel has a light border so it reads without relying on colour alone.
  const border = calls.find((call) => call.op === 'strokeRect');
  assert.ok(border, 'the panel must have a visible border');
  assert.deepEqual(border.args, panel.args);
});

test('RF-16/CL-6/RF-19: no message before winning and the overlay never gets consumed', () => {
  const idle = createFakeContext();
  render(idle, createInitialState(LEVEL_1));
  assert.equal(textCalls(idle.calls).length, 0, 'a live level must not show the message');
  assert.equal(
    idle.calls.filter((call) => call.fillStyle === VEIL_FILL).length,
    0,
    'a live level must not be veiled',
  );

  const first = createFakeContext();
  render(first, wonState());
  const second = createFakeContext();
  render(second, wonState());
  assert.deepEqual(
    first.calls.map((call) => [call.op, call.args]),
    second.calls.map((call) => [call.op, call.args]),
    'rendering a won state twice must paint the same message twice (no consumed flag)',
  );
  assert.equal(textCalls(first.calls).length, 1);
  assert.equal(
    textCalls(first.calls)[0].args[0],
    textCalls(second.calls)[0].args[0],
    'the message must not change between frames',
  );
});

test('RF-19: main.js offers no restart, reset or level-change handler', () => {
  const source = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /restart/i, 'no restart handler is allowed');
  assert.doesNotMatch(source, /location\.reload/, 'no page reload is allowed');
  assert.doesNotMatch(source, /KeyR['"]/, 'KeyR must not be bound');
  assert.doesNotMatch(source, /Delete['"]/, 'Delete must not be bound');
  assert.doesNotMatch(source, /LEVELS\[/, 'no level switching is allowed');
});
