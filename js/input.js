// Pure keyboard mapping: event.code -> game input.
// No DOM, no imports, no state: the caller owns the pressed-key Set and decides
// what to do with the result. Keeping this here is what makes RF-9/CL-7 testable.

export const KEY_BINDINGS = Object.freeze({
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
});

const ARROW_CODES = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

// Maps any iterable of event.code strings to the four input verbs.
// Unknown codes are ignored; opposite keys stay true (sim.js cancels them);
// the input is never mutated.
export const keysToInput = (codes) => {
  const input = { up: false, down: false, left: false, right: false };

  for (const code of codes) {
    if (typeof code !== 'string' || !Object.hasOwn(KEY_BINDINGS, code)) continue;
    const verb = KEY_BINDINGS[code];
    if (verb === 'up') input.up = true;
    else if (verb === 'down') input.down = true;
    else if (verb === 'left') input.left = true;
    else if (verb === 'right') input.right = true;
  }

  return input;
};

// Only arrow keys scroll the page, so only they need preventDefault.
export const isArrowCode = (code) => ARROW_CODES.has(code);
