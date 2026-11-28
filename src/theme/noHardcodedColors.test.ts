import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Brand colors come from the theme variables (the Active bottle's Palette), never from the stylesheets.
// What may stay fixed: black shadows and scrims, and the red
// of the remove-bottle button (a warning, not a brand color).
const ALLOWED = new Set(['#b3261e', '#ffffff', '#000', '#000000']);

function cssFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? cssFiles(path) : path.endsWith('.css') ? [path] : [];
  });
}

/** Stylesheet text without comments and without the one `:root` block that holds the pre-theme defaults. */
function strip(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/:root\s*\{[^}]*\}/g, '');
}

describe('the stylesheets', () => {
  const files = cssFiles('src');

  it('finds the app stylesheets', () => {
    expect(files.length).toBeGreaterThanOrEqual(2);
  });

  it.each(files)('%s has no hard-coded brand color outside the theme variables', (file) => {
    const css = strip(readFileSync(file, 'utf8'));
    const literals = [...css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0].toLowerCase());
    expect(literals.filter((c) => !ALLOWED.has(c))).toEqual([]);
  });

  it.each(files)('%s gives every var(--color-*) no hard-coded fallback', (file) => {
    const css = strip(readFileSync(file, 'utf8'));
    expect(css).not.toMatch(/var\(--color-[a-z-]+\s*,/);
  });

  it.each(files)('%s uses only rgba(0, 0, 0, x) for shadows and scrims', (file) => {
    const css = strip(readFileSync(file, 'utf8'));
    const others = [...css.matchAll(/rgba?\(([^)]*)\)/g)].map((m) => m[1]!.replace(/\s/g, '')).filter((v) => !/^0,0,0,/.test(v));
    expect(others).toEqual([]);
  });
});
