import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseCatalog } from '../catalog/catalog';
import type { Bottle } from '../domain/types';
import { describeBottle } from './describeBottle';

const catalog = parseCatalog(JSON.parse(readFileSync('src/catalog/catalog.fixture.json', 'utf8')) as unknown);

const base: Bottle = {
  id: 'b1',
  modelId: 'fixture-freesip',
  sizeOz: 24,
  colorway: { kind: 'catalog', colorwayId: 'fixture-lagoon' },
  overrides: {},
  addedAt: 1,
};

describe('describeBottle', () => {
  it('names a Bottle by its nickname, then its colorway, model and size', () => {
    const d = describeBottle({ ...base, nickname: 'Gym bottle' }, catalog);
    expect(d.title).toBe('Gym bottle');
    expect(d.colorwayName).toBe('Fixture Lagoon');
    expect(d.detail).toBe('FreeSip (fixture) · 24 oz');
    expect(d.summary).toBe('Gym bottle, Fixture Lagoon, FreeSip (fixture) 24 oz');
  });

  it('uses the colorway name as the title when there is no nickname', () => {
    const d = describeBottle(base, catalog);
    expect(d.title).toBe('Fixture Lagoon');
    expect(d.summary).toBe('Fixture Lagoon, FreeSip (fixture) 24 oz');
  });

  it('reads a Custom colorway from the Bottle itself', () => {
    const d = describeBottle(
      { ...base, colorway: { kind: 'custom', name: 'Grandma blue', palette: { body: '#112233' } } },
      catalog,
    );
    expect(d.title).toBe('Grandma blue');
    expect(d.palette).toEqual({ body: '#112233', lid: '#112233', accent: '#112233' });
    expect(d.sampled).toBe(true);
  });

  it('gives the Palette with Overrides applied, all three colors filled in', () => {
    const d = describeBottle({ ...base, overrides: { lid: '#ffffff' } }, catalog);
    expect(d.palette).toEqual({ body: '#2f7fa8', lid: '#ffffff', accent: '#e0645c' });
  });

  it('says when a Catalog colorway has no sampled colors', () => {
    const unsampled = {
      ...catalog,
      colorways: [{ ...catalog.colorways[0]!, id: 'ghost', name: 'Ghost', sampled: false, palette: { body: '#4a6572' } }],
    };
    const d = describeBottle({ ...base, colorway: { kind: 'catalog', colorwayId: 'ghost' } }, unsampled);
    expect(d.sampled).toBe(false);
  });

  it('copes with a colorway or model that has left the Catalog', () => {
    const d = describeBottle(
      { ...base, modelId: 'gone', colorway: { kind: 'catalog', colorwayId: 'gone' } },
      catalog,
    );
    expect(d.colorwayName).toBe('Unknown colorway');
    expect(d.detail).toBe('gone · 24 oz');
  });
});

describe('describeBottle and Overrides', () => {
  it('keeps the Palette before Overrides, and says which colors were replaced', () => {
    const d = describeBottle({ ...base, overrides: { lid: '#ffffff' } }, catalog);
    expect(d.basePalette).toEqual({ body: '#2f7fa8', lid: '#f2d16b', accent: '#e0645c' });
    expect(d.palette.lid).toBe('#ffffff');
    expect(d.overridden).toEqual({ body: false, lid: true, accent: false });
  });

  it('says nothing is overridden for a Bottle without Overrides', () => {
    const d = describeBottle(base, catalog);
    expect(d.overridden).toEqual({ body: false, lid: false, accent: false });
    expect(d.basePalette).toEqual(d.palette);
  });
});
