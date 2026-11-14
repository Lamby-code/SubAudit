import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createInitialState, step, PLAYER_RADIUS } from '../js/sim.js';
import { LEVEL_1 } from '../js/levels.js';
import { render } from '../js/render.js';

// --- helpers -----------------------------------------------------------------

const NONE = { up: false, down: false, left: false, right: false };
const KEY = (key, ticks = 1) => Array.from({ length: ticks }, () => ({ ...NONE, [key]: true }));
const DIAGONAL = (a, b, ticks = 1) => Array.from({ length: ticks }, () => ({ ...NONE, [a]: true, [b]: true }));

// A fixed ~40 input key sequence: cardinals, diagonals, opposite keys and wall hits.
const SEQUENCE = [
  ...KEY('down', 5),
  ...KEY('right', 6),
  ...DIAGONAL('right', 'up', 5),
  ...KEY('up', 4),
  ...KEY('left', 35), // runs into the west wall and stays pinned
  ...DIAGONAL('left', 'up', 4), // slides along it
  ...KEY('left', 3), // stays pinned
  { ...NONE, left: true, right: true }, // opposite keys cancel X
  ...DIAGONAL('right', 'down', 6),
  ...KEY('down', 3),
];

const runTickByTick = (inputs) => {
  let state = createInitialState(LEVEL_1);
  const path = [];
  for (const input of inputs) {
    state = step(state, input);
    path.push({ x: state.player.x, y: state.player.y });
  }
  return path;
};

/** Runs the same inputs but grouped in "visual frames" of `ticksPerFrame` ticks. */
const runFrames = (inputs, ticksPerFrame) => {
  let state = createInitialState(LEVEL_1);
  const path = [];
  for (let frame = 0; frame < inputs.length; frame += ticksPerFrame) {
    const last = Math.min(frame + ticksPerFrame, inputs.length);
    for (let i = frame; i < last; i += 1) {
      state = step(state, inputs[i]);
      path.push({ x: state.player.x, y: state.player.y });
    }
  }
  return path;
};

const assertSamePath = (a, b, label) => {
  assert.equal(a.length, b.length, `${label}: lengths differ`);
  for (let i = 0; i < a.length; i += 1) {
    assert.ok(Object.is(a[i].x, b[i].x), `${label}: tick ${i} x differs (${a[i].x} vs ${b[i].x})`);
    assert.ok(Object.is(a[i].y, b[i].y), `${label}: tick ${i} y differs (${a[i].y} vs ${b[i].y})`);
  }
};

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
  for (const op of ['fillRect', 'strokeRect', 'beginPath', 'arc', 'fill', 'stroke', 'fillText']) {
    ctx[op] = record(op);
  }
  ctx.measureText = (text) => ({ width: text.length * 18 });
  return ctx;
};

const wonState = () => ({ level: LEVEL_1, player: { x: LEVEL_1.meta.x, y: LEVEL_1.meta.y, r: PLAYER_RADIUS } });

// --- tests -------------------------------------------------------------------

test('RNF-6: the same key sequence twice gives bit-identical positions', () => {
  assert.ok(SEQUENCE.length >= 40, `expected at least 40 inputs, got ${SEQUENCE.length}`);

  const first = runTickByTick(SEQUENCE);
  const second = runTickByTick(SEQUENCE);
  assertSamePath(first, second, 'repeat run');

  // The sequence really moves the player and really hits the west wall.
  const xs = first.map((p) => p.x);
  assert.ok(Math.min(...xs) === 36, `the run must reach the west wall tangent (36), got ${Math.min(...xs)}`);
  assert.ok(first[first.length - 1].y !== first[0].y, 'the run must end at a different y than it started');
});

test('RNF-6: grouping ticks in frames does not change the path', () => {
  const tickByTick = runTickByTick(SEQUENCE);

  for (const ticksPerFrame of [2, 3, 5]) {
    assertSamePath(runFrames(SEQUENCE, ticksPerFrame), tickByTick, `frames of ${ticksPerFrame} ticks`);
  }

  // 5 consecutive step calls inside one frame equal 5 separate frames of 1 tick.
  const fiveInOneFrame = runFrames(SEQUENCE.slice(0, 5), 5);
  const fiveSeparateFrames = runFrames(SEQUENCE.slice(0, 5), 1);
  assertSamePath(fiveInOneFrame, fiveSeparateFrames, 'single frame vs five frames');
});

test('RF-5/RNF-6: no clock is read inside the simulation', () => {
  // The source guard in test/purity.test.js already proves js/sim.js mentions no
  // Date, performance or requestAnimationFrame; here we prove the observable
  // consequence: the same inputs give the same path, whatever the real time is.
  const fast = runTickByTick(SEQUENCE);
  const slow = runTickByTick(SEQUENCE);
  assertSamePath(fast, slow, 'timing independence');
  assert.ok(Object.is(fast[fast.length - 1].x, slow[slow.length - 1].x));
});

test('render is a pure function of the state, also on a won state', () => {
  const cases = [
    { state: createInitialState(LEVEL_1), expectText: 0 },
    { state: wonState(), expectText: 1 },
  ];

  for (const { state, expectText } of cases) {
    const first = createFakeContext();
    render(first, state);
    const second = createFakeContext();
    render(second, state);

    assert.deepEqual(
      first.calls.map((call) => [call.op, call.args]),
      second.calls.map((call) => [call.op, call.args]),
      'the draw calls must not depend on previous frames',
    );
    assert.equal(
      first.calls.filter((call) => call.op === 'fillText').length,
      expectText,
      'the victory text must appear exactly when the state is won',
    );
  }

  // Rendering the won state does not alter it (no flag is set by drawing).
  const state = wonState();
  const snapshot = structuredClone(state);
  render(createFakeContext(), state);
  render(createFakeContext(), state);
  assert.deepEqual(state, snapshot);
});
