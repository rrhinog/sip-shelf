import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildCatalog, EXCLUDED_COLORWAYS, NEUTRAL_PALETTE, parseCsv, serializeCatalog } from '../../scripts/build-catalog';
import type { Bottle } from '../domain/types';
import { paletteForBottle } from '../theme/forBottle';
import { colorwaysFor, loadCatalog } from './catalog';

// The real Catalog that ships in the app, checked against the research files it was built from.
const catalogText = readFileSync('public/catalog.json', 'utf8');
const colorwaysCsv = readFileSync('data/colorways.csv', 'utf8');
const palettesCsv = readFileSync('data/palettes.csv', 'utf8');
const built = buildCatalog(colorwaysCsv, palettesCsv);
const excluded = new Set(built.leftOut.map((l) => l.colorway));

const catalog = await loadCatalog('/sip-shelf/catalog.json', async () => new Response(catalogText));

describe('the real catalog file', () => {
  it('passes the loader (every id, model, size and hex color is valid)', () => {
    expect(catalog.models.length).toBeGreaterThan(0);
    expect(catalog.colorways.length).toBeGreaterThan(0);
  });

  it('is exactly what the build script makes from data/*.csv (so it is not stale or hand-edited)', () => {
    expect(catalogText).toBe(serializeCatalog(buildCatalog(colorwaysCsv, palettesCsv).catalog));
  });

  it('ships every researched colorway, sampled or not, except the excluded ones', () => {
    const researched = parseCsv(colorwaysCsv).map((r) => r.name).filter((n) => !excluded.has(n!));
    expect(catalog.colorways.map((c) => c.name)).toEqual(researched);
  });

  it('only excludes colorways that are really in the research (no stale exclusions)', () => {
    const researched = new Set(parseCsv(colorwaysCsv).map((r) => r.name));
    for (const { name } of EXCLUDED_COLORWAYS) expect(researched.has(name), name).toBe(true);
    for (const name of excluded) expect(catalog.colorways.some((c) => c.name === name), name).toBe(false);
  });

  it('has no kids bottles: no Kids model, and every colorway sold only as a kids bottle is left out', () => {
    expect(catalog.models.filter((m) => /kid/i.test(m.id + m.name))).toEqual([]);
    const kidsOnly = parseCsv(colorwaysCsv)
      .filter((r) => {
        const models = (r.models ?? '').replace(/\([^)]*\)/g, ' ').split(/[;,]/).map((t) => t.trim()).filter((t) => t !== '');
        return models.length > 0 && models.every((t) => /^kids/i.test(t));
      })
      .map((r) => r.name);
    expect(kidsOnly.length).toBeGreaterThan(0);
    for (const name of kidsOnly) expect(excluded.has(name!), name).toBe(true);
  });

  it('counts as many sampled colorways as the palettes file has hex values for, and the rest as unsampled', () => {
    const withHex = parseCsv(palettesCsv).filter((r) => !excluded.has(r.name!) && (r.body_hex ?? '').trim() !== '').length;
    const total = parseCsv(colorwaysCsv).filter((r) => !excluded.has(r.name!)).length;
    const sampled = catalog.colorways.filter((c) => c.sampled);
    const unsampled = catalog.colorways.filter((c) => !c.sampled);
    expect(catalog.colorways).toHaveLength(total);
    expect(sampled).toHaveLength(withHex);
    expect(unsampled).toHaveLength(total - withHex);
    expect(unsampled.length).toBeGreaterThan(0);
  });

  it('keeps a source page on every colorway, never an image link, and none of the working notes', () => {
    for (const c of catalog.colorways) expect(c.sources.length, c.name).toBeGreaterThan(0);
    expect(catalogText).not.toMatch(/cdn\.shopify|\.(png|jpe?g|webp|gif|avif)\b/i);
    expect(catalogText).not.toMatch(/inferred|name from image filename|Owala flags/i);
  });

  it('keeps every colorway available in the Model and Size picker, even when its models or sizes are unconfirmed', () => {
    const reachable = new Set<string>();
    for (const m of catalog.models) for (const size of m.sizesOz) for (const c of colorwaysFor(catalog, m.id, size)) reachable.add(c.id);
    expect(reachable.size).toBe(catalog.colorways.length);
  });
});

describe('a sampled colorway from the real catalog', () => {
  const colorway = catalog.colorways.find((c) => c.name === 'Out of the Blue')!;

  it('keeps its sampled colors, its confidence and its source pages', () => {
    expect(colorway.sampled).toBe(true);
    expect(colorway.confidence).toBe('high');
    expect(colorway.palette.body).toBe('#9eb0e2');
    expect(colorway.sources).toContain('https://owalalife.com/products/freesip-sway');
  });

  it('is sold on FreeSip in 24 oz, and a bottle of it gets its sampled palette', () => {
    expect(colorwaysFor(catalog, 'freesip', 24).map((c) => c.name)).toContain('Out of the Blue');
    const bottle: Bottle = {
      id: 'b1',
      modelId: 'freesip',
      sizeOz: 24,
      colorway: { kind: 'catalog', colorwayId: colorway.id },
      overrides: {},
      addedAt: 0,
    };
    expect(paletteForBottle(bottle, catalog).body).toBe('#9eb0e2');
  });
});

describe('an unsampled colorway from the real catalog', () => {
  const colorway = catalog.colorways.find((c) => !c.sampled && c.offerings.some((o) => o.modelId === 'freesip' && o.sizesOz.includes(24)))!;

  it('is marked unsampled, has the neutral palette and no confidence, but keeps its source pages', () => {
    expect(colorway).toBeDefined();
    expect(colorway.sampled).toBe(false);
    expect(colorway.palette).toEqual(NEUTRAL_PALETTE);
    expect(colorway.confidence).toBeUndefined();
    expect(colorway.sources.length).toBeGreaterThan(0);
  });

  it('can still be registered on its model and size, and its bottle gets the neutral palette until the person sets colors', () => {
    expect(colorwaysFor(catalog, 'freesip', 24).map((c) => c.id)).toContain(colorway.id);
    const bottle: Bottle = {
      id: 'b2',
      modelId: 'freesip',
      sizeOz: 24,
      colorway: { kind: 'catalog', colorwayId: colorway.id },
      overrides: {},
      addedAt: 0,
    };
    expect(paletteForBottle(bottle, catalog).body).toBe(NEUTRAL_PALETTE.body);
    const overridden = paletteForBottle({ ...bottle, overrides: { body: '#ff0000' } }, catalog);
    expect(overridden.body).toBe('#ff0000');
  });
});

describe('a colorway whose models Owala did not confirm', () => {
  it('is offered on every model and size', () => {
    const unconfirmed = catalog.colorways.filter((c) => c.offerings.length === 0);
    expect(unconfirmed.length).toBeGreaterThan(0);
    const [first] = unconfirmed;
    for (const m of catalog.models) for (const size of m.sizesOz) expect(colorwaysFor(catalog, m.id, size).map((c) => c.id)).toContain(first!.id);
  });
});
