import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const htmlPath = new URL('../index.html', import.meta.url);
const cssPath = new URL('../style.css', import.meta.url);

const readHtml = () => readFileSync(htmlPath, 'utf8');
const readCss = () => readFileSync(cssPath, 'utf8');

/** Returns the declaration block of a simple CSS rule, without braces. */
const ruleBlock = (css, selector) => {
  const pattern = new RegExp(`(?:^|\\n)\\s*${selector}\\s*\\{([^}]*)\\}`, 'i');
  const match = css.match(pattern);
  return match ? match[1] : null;
};

test('RNF-2: index.html declares a fixed 960x600 game canvas', () => {
  const html = readHtml();
  const canvasTag = html.match(/<canvas\b[^>]*\bid="game"[^>]*>/i);
  assert.ok(canvasTag, 'index.html must contain <canvas id="game" ...>');
  assert.match(canvasTag[0], /\bwidth="960"/, 'canvas must declare width="960"');
  assert.match(canvasTag[0], /\bheight="600"/, 'canvas must declare height="600"');
});

test('RNF-5: index.html declares Spanish as the document language', () => {
  const html = readHtml();
  assert.match(html, /<html\b[^>]*\blang="es"/i, '<html> must declare lang="es"');
});

test('RNF-8: index.html keeps markup free of inline styles', () => {
  const html = readHtml();
  assert.doesNotMatch(html, /\bstyle="/i, 'no inline style="" attributes allowed');
  assert.doesNotMatch(html, /<style\b/i, 'no inline <style> blocks allowed');
});

test('RNF-2: style.css fixes the canvas to 960px by 600px', () => {
  const css = readCss();
  const canvasBlock = ruleBlock(css, 'canvas');
  assert.ok(canvasBlock, 'style.css must contain a canvas rule');
  assert.match(canvasBlock, /width:\s*960px/, 'canvas must be 960px wide');
  assert.match(canvasBlock, /height:\s*600px/, 'canvas must be 600px tall');
});

test('RNF-2: style.css does not scale or stretch the canvas', () => {
  const css = readCss();
  const canvasBlock = ruleBlock(css, 'canvas');
  assert.ok(canvasBlock, 'style.css must contain a canvas rule');
  assert.doesNotMatch(canvasBlock, /scale\(/i, 'canvas must not use scale()');
  assert.doesNotMatch(canvasBlock, /transform\s*:/i, 'canvas must not use transform');
});

test('RNF-2: style.css centers the canvas with flexbox', () => {
  const css = readCss();
  const bodyBlock = ruleBlock(css, 'body');
  assert.ok(bodyBlock, 'style.css must contain a body rule');
  assert.match(bodyBlock, /display:\s*flex/i, 'body must use display: flex');
  assert.match(bodyBlock, /justify-content:\s*center/i, 'body must use justify-content: center');
  assert.match(bodyBlock, /align-items:\s*center/i, 'body must use align-items: center');
  assert.match(bodyBlock, /margin:\s*0/i, 'body must reset its margin');
});

test('RNF-8: index.html loads style.css through a stylesheet link', () => {
  const html = readHtml();
  const linkTag = html.match(/<link\b[^>]*\brel="stylesheet"[^>]*>/i);
  assert.ok(linkTag, 'index.html must contain <link rel="stylesheet">');
  assert.match(linkTag[0], /href="[^"]*style\.css"/i, 'stylesheet must point to style.css');
});
