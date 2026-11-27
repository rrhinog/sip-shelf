import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseCatalog } from '../catalog/catalog';
import type { Bottle } from '../domain/types';
import { applyTheme, DEFAULT_PALETTE, paletteForBottle, themeForBottle } from './forBottle';

const catalog = parseCatalog(JSON.parse(readFileSync('public/catalog.fixture.json', 'utf8')));

const bottle = (over: Partial<Bottle>): Bottle => ({
  id: 'b1',
  modelId: 'fixture-freesip',
  sizeOz: 24,
  colorway: { kind: 'catalog', colorwayId: 'fixture-lagoon' },
  overrides: {},
  addedAt: 1,
  ...over,
});

describe('paletteForBottle', () => {
  it('takes the Palette from the Catalog colorway', () => {
    expect(paletteForBottle(bottle({}), catalog)).toEqual({ body: '#2f7fa8', lid: '#f2d16b', accent: '#e0645c' });
  });

  it('takes the Palette of a Custom colorway from the Bottle itself', () => {
    const custom = bottle({ colorway: { kind: 'custom', name: 'Mine', palette: { body: '#123456' } } });
    expect(paletteForBottle(custom, catalog)).toEqual({ body: '#123456', lid: '#123456', accent: '#123456' });
  });

  it('lets Overrides replace Palette colors', () => {
    expect(paletteForBottle(bottle({ overrides: { body: '#000000' } }), catalog).body).toBe('#000000');
  });

  it('falls back to the default Palette when the colorway is no longer in the Catalog', () => {
    const gone = bottle({ colorway: { kind: 'catalog', colorwayId: 'removed-colorway' } });
    expect(paletteForBottle(gone, catalog)).toEqual({ ...DEFAULT_PALETTE, lid: DEFAULT_PALETTE.body, accent: DEFAULT_PALETTE.body });
  });
});

describe('themeForBottle', () => {
  it('themes the app from the Active bottle, following the phone setting', () => {
    const light = themeForBottle(bottle({}), catalog, 'light');
    const dark = themeForBottle(bottle({}), catalog, 'dark');
    expect(light['--color-primary']).toBe('#2f7fa8');
    expect(dark['--color-primary']).toBe('#2f7fa8');
    expect(light['--color-bg']).not.toBe(dark['--color-bg']);
  });

  it('uses the default theme when there is no Active bottle', () => {
    expect(themeForBottle(null, catalog, 'light')['--color-primary']).toBe(DEFAULT_PALETTE.body);
  });
});

describe('applyTheme', () => {
  it('sets every custom property on the element', () => {
    const el = document.createElement('div');
    applyTheme(el, { 'color-scheme': 'dark', '--color-bg': '#101012', '--color-text': '#ffffff' });
    expect(el.style.getPropertyValue('--color-bg')).toBe('#101012');
    expect(el.style.getPropertyValue('--color-text')).toBe('#ffffff');
    expect(el.style.getPropertyValue('color-scheme')).toBe('dark');
  });
});
