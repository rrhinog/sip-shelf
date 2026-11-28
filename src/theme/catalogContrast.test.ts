import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadCatalog } from '../catalog/catalog';
import type { Bottle } from '../domain/types';
import { contrastRatio } from './contrast';
import { themeForBottle } from './forBottle';
import { MIN_TEXT_CONTRAST } from './readable';
import type { Scheme } from './theme';

// Every Palette in the Catalog that ships in the app, put through the whole theme in both schemes.
const catalog = await loadCatalog('/sip-shelf/catalog.json', async () => new Response(readFileSync('public/catalog.json', 'utf8')));

const TEXT_ON: [string, string][] = [
  ['--color-text', '--color-bg'],
  ['--color-text', '--color-surface'],
  ['--color-text', '--color-paper'],
  ['--color-link', '--color-paper'],
  ['--color-link', '--color-bg'],
  ['--color-link', '--color-surface'],
  ['--color-on-primary', '--color-primary'],
  ['--color-on-secondary', '--color-secondary'],
  ['--color-on-accent', '--color-accent'],
];

function bottleOf(colorwayId: string): Bottle {
  return { id: colorwayId, modelId: 'freesip', sizeOz: 24, colorway: { kind: 'catalog', colorwayId }, overrides: {}, addedAt: 0 };
}

describe.each<Scheme>(['light', 'dark'])('every Catalog palette, themed in %s', (scheme) => {
  it('has every text color at 4.5:1 or better on the color it sits on', () => {
    expect(catalog.colorways.length).toBeGreaterThan(100);
    const failures: string[] = [];
    for (const colorway of catalog.colorways) {
      const vars = themeForBottle(bottleOf(colorway.id), catalog, scheme);
      for (const [fg, bg] of TEXT_ON) {
        const ratio = contrastRatio(vars[fg] as string, vars[bg] as string);
        if (ratio < MIN_TEXT_CONTRAST) failures.push(`${colorway.name}: ${fg} on ${bg} is ${ratio.toFixed(2)}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('sets color-scheme and a full set of colors for each one', () => {
    for (const colorway of catalog.colorways) {
      const vars = themeForBottle(bottleOf(colorway.id), catalog, scheme);
      expect(vars['color-scheme'], colorway.name).toBe(scheme);
      for (const [fg, bg] of TEXT_ON) expect(vars[fg] && vars[bg], `${colorway.name} ${fg}/${bg}`).toMatch(/\S/);
    }
  });
});
