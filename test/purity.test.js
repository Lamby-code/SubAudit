import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import * as sim from '../js/sim.js';
import {
  PLAYER_RADIUS,
  META_RADIUS,
  META_TOUCH_DISTANCE,
  TICK_RATE,
  TICK_SECONDS,
  MOVE_SPEED,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  createInitialState,
  isWon,
} from '../js/sim.js';
import { LEVEL_1 } from '../js/levels.js';

// --- helpers -----------------------------------------------------------------

const readSource = (name) => readFileSync(new URL(`../js/${name}`, import.meta.url), 'utf8');

const importSpecifiers = (source) =>
  [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);

// --- tests -------------------------------------------------------------------

test('constitution 3/RNF-3: sim.js contains no browser, clock or randomness API', () => {
  const source = readSource('sim.js');

  for (const forbidden of [
    'document',
    'window',
    'Math.random',
    'Date',
    'performance',
    'requestAnimationFrame',
    'localStorage',
  ]) {
    assert.ok(
      !source.includes(forbidden),
      `js/sim.js must not mention "${forbidden}" (comments included)`,
    );
  }
});

test('dependencies: levels.js, sim.js and render.js only import what they may', () => {
  const levels = readSource('levels.js');
  const simSource = readSource('sim.js');
  const render = readSource('render.js');

  assert.deepEqual(importSpecifiers(levels), [], 'levels.js must not import any module');
  assert.ok(!/\bimport\b/.test(levels), 'levels.js must stay plain data');

  assert.deepEqual(importSpecifiers(simSource), [], 'sim.js must be self-contained');
  assert.ok(!/\bimport\b/.test(simSource), 'sim.js must not import anything');

  assert.deepEqual(importSpecifiers(render), ['./sim.js'], 'render.js may only import ./sim.js from sim');
});

test('exports: sim.js exposes exactly the API decided in the plan', () => {
  const expected = [
    // constants
    'CANVAS_HEIGHT',
    'CANVAS_WIDTH',
    'META_RADIUS',
    'META_TOUCH_DISTANCE',
    'MOVE_SPEED',
    'PLAYER_RADIUS',
    'TICK_RATE',
    'TICK_SECONDS',
    // pure functions
    'circleOverlapsRect',
    'createInitialState',
    'directionFromInput',
    'distance',
    'isWon',
    'movePlayer',
    'normalizeDirection',
    'resolveAxis',
    'step',
    'touchesMeta',
  ].sort();

  assert.deepEqual(Object.keys(sim).sort(), expected);
});

test('RF-14/RNF-2: the numbers match the spec', () => {
  assert.equal(PLAYER_RADIUS, 12);
  assert.equal(META_RADIUS, 24);
  assert.equal(META_TOUCH_DISTANCE, 36);
  assert.equal(TICK_RATE, 60);
  assert.equal(TICK_SECONDS, 1 / 60);
  assert.equal(MOVE_SPEED, 220);
  assert.equal(CANVAS_WIDTH, 960);
  assert.equal(CANVAS_HEIGHT, 600);
  assert.deepEqual(LEVEL_1.area, { width: 960, height: 600 });
});

test('constitution 3: the state carries no hidden flags, only geometry', () => {
  const initial = createInitialState(LEVEL_1);
  assert.deepEqual(Object.keys(initial).sort(), ['level', 'player']);
  assert.deepEqual(Object.keys(initial.player).sort(), ['r', 'x', 'y']);

  const won = { level: LEVEL_1, player: { x: 816, y: 536, r: PLAYER_RADIUS } };
  assert.equal(isWon(won), true, 'the sample won state must really be won');
  assert.deepEqual(Object.keys(won).sort(), ['level', 'player']);
  assert.deepEqual(Object.keys(won.player).sort(), ['r', 'x', 'y']);
});
