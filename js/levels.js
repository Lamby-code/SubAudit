// Level data only: plain geometry, no collision logic, no game imports.

export const LEVEL_1 = {
  name: 'Nivel 1',
  area: { width: 960, height: 600 },
  spawn: { x: 120, y: 300 },
  meta: { x: 816, y: 536 },
  walls: [
    // Perimeter (24 px thick, corners overlap so no gap is left open).
    { x: 0, y: 0, w: 960, h: 24 }, // north
    { x: 0, y: 576, w: 960, h: 24 }, // south
    { x: 0, y: 0, w: 24, h: 600 }, // west
    { x: 936, y: 0, w: 24, h: 600 }, // east
    // Interior pillar: blocks the straight spawn-to-meta path, leaves a
    // 72 px passage above (y 24..96) and below (y 504..576).
    { x: 456, y: 96, w: 24, h: 408 },
  ],
};

export const LEVELS = [LEVEL_1];
