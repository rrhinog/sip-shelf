import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { colorwaysFor, loadCatalog, parseCatalog, sizesFor } from './catalog';

const fixtureJson = JSON.parse(readFileSync('public/catalog.fixture.json', 'utf8')) as unknown;

const minimal = () => ({
  source: 'test',
  models: [{ id: 'm1', name: 'M1', sizesOz: [24, 32] }],
  colorways: [
    { id: 'c1', name: 'C1', palette: { body: '#112233' }, offerings: [{ modelId: 'm1', sizesOz: [24] }] },
  ],
});

describe('the fixture catalog', () => {
  const catalog = parseCatalog(fixtureJson);

  it('has five colorways, each plainly named as a fixture', () => {
    expect(catalog.colorways).toHaveLength(5);
    for (const c of catalog.colorways) expect(c.name).toMatch(/^Fixture /);
    expect(catalog.source).toMatch(/FIXTURE/);
  });

  it('sells one colorway on several models', () => {
    const lagoon = catalog.colorways.find((c) => c.id === 'fixture-lagoon');
    expect(lagoon?.offerings.map((o) => o.modelId)).toEqual(['fixture-freesip', 'fixture-twist']);
  });
});

describe('parseCatalog', () => {
  it('accepts a minimal valid catalog and normalises its hex colors', () => {
    const raw = minimal();
    raw.colorways[0]!.palette.body = '#ABC';
    expect(parseCatalog(raw).colorways[0]?.palette.body).toBe('#aabbcc');
  });

  it.each([
    ['not an object', 'nope'],
    ['no colorways list', { ...minimal(), colorways: undefined }],
    ['a palette without a body color', (() => { const c = minimal(); (c.colorways[0] as { palette: object }).palette = { lid: '#fff' }; return c; })()],
    ['a hex color that is not hex', (() => { const c = minimal(); c.colorways[0]!.palette.body = 'blue'; return c; })()],
    ['an offering for an unknown model', (() => { const c = minimal(); c.colorways[0]!.offerings[0]!.modelId = 'ghost'; return c; })()],
    ['an offering for a size the model is not sold in', (() => { const c = minimal(); c.colorways[0]!.offerings[0]!.sizesOz = [99]; return c; })()],
    ['two colorways with the same id', (() => { const c = minimal(); c.colorways.push({ ...c.colorways[0]! }); return c; })()],
    ['two models with the same id', (() => { const c = minimal(); c.models.push({ ...c.models[0]! }); return c; })()],
  ])('rejects %s', (_label, raw) => {
    expect(() => parseCatalog(raw)).toThrow(/catalog/i);
  });
});

describe('sampled and unsampled colorways', () => {
  it('keeps confidence and source links on a sampled colorway', () => {
    const raw = minimal();
    Object.assign(raw.colorways[0]!, { confidence: 'medium', sources: ['https://owalalife.com/products/freesip'] });
    const c = parseCatalog(raw).colorways[0]!;
    expect(c).toMatchObject({ sampled: true, confidence: 'medium', sources: ['https://owalalife.com/products/freesip'] });
  });

  it('treats a colorway with no sampled field as sampled, with no sources', () => {
    expect(parseCatalog(minimal()).colorways[0]).toMatchObject({ sampled: true, sources: [] });
  });

  it('keeps an explicitly unsampled colorway marked unsampled', () => {
    const raw = minimal();
    Object.assign(raw.colorways[0]!, { sampled: false });
    expect(parseCatalog(raw).colorways[0]?.sampled).toBe(false);
  });

  it.each([
    ['a confidence that is not high, medium or low', { confidence: 'certain' }],
    ['a sampled flag that is not true or false', { sampled: 'no' }],
    ['a source that is not a web link', { sources: ['owala'] }],
    ['sources that are not a list', { sources: 'https://owalalife.com' }],
  ])('rejects %s', (_label, extra) => {
    const raw = minimal();
    Object.assign(raw.colorways[0]!, extra);
    expect(() => parseCatalog(raw)).toThrow(/catalog/i);
  });
});

describe('colorways whose models or sizes are not confirmed', () => {
  const raw = () => ({
    source: 'test',
    models: [
      { id: 'a', name: 'A', sizesOz: [24, 32] },
      { id: 'b', name: 'B', sizesOz: [12, 20] },
    ],
    colorways: [
      { id: 'known', name: 'Known', palette: { body: '#112233' }, offerings: [{ modelId: 'a', sizesOz: [24] }] },
      // Sold on model A, but Owala's pages did not say in which sizes.
      { id: 'sizes-unknown', name: 'Sizes unknown', palette: { body: '#112233' }, offerings: [{ modelId: 'a', sizesOz: [] }] },
      // Owala's pages did not say which models at all.
      { id: 'models-unknown', name: 'Models unknown', palette: { body: '#112233' }, offerings: [] },
    ],
  });
  const catalog = parseCatalog(raw());

  it('is still a valid catalog', () => {
    expect(catalog.colorways.map((c) => c.id)).toEqual(['known', 'sizes-unknown', 'models-unknown']);
  });

  it('offers a colorway with unconfirmed sizes in every size of its model, and only that model', () => {
    expect(colorwaysFor(catalog, 'a', 32).map((c) => c.id)).toEqual(['sizes-unknown', 'models-unknown']);
    expect(colorwaysFor(catalog, 'b', 12).map((c) => c.id)).toEqual(['models-unknown']);
  });

  it('offers a colorway with unconfirmed models on every model and size', () => {
    expect(colorwaysFor(catalog, 'a', 24).map((c) => c.id)).toEqual(['known', 'sizes-unknown', 'models-unknown']);
    expect(colorwaysFor(catalog, 'b', 20).map((c) => c.id)).toContain('models-unknown');
  });
});

describe('browsing the catalog: Model, then Size, then Colorway', () => {
  const catalog = parseCatalog(fixtureJson);

  it('lists the sizes a model is sold in', () => {
    expect(sizesFor(catalog, 'fixture-twist')).toEqual([24, 32]);
    expect(sizesFor(catalog, 'nope')).toEqual([]);
  });

  it('lists only the colorways sold on that model in that size', () => {
    expect(colorwaysFor(catalog, 'fixture-freesip', 40).map((c) => c.id)).toEqual(['fixture-meadow', 'fixture-ember']);
    expect(colorwaysFor(catalog, 'fixture-twist', 24).map((c) => c.id)).toEqual(['fixture-lagoon', 'fixture-dusk']);
    expect(colorwaysFor(catalog, 'fixture-twist', 40)).toEqual([]);
  });
});

describe('loadCatalog', () => {
  it('fetches the JSON file from the given URL and parses it', async () => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify(fixtureJson)));
    const catalog = await loadCatalog('/sip-shelf/catalog.fixture.json', fetchStub);
    expect(fetchStub).toHaveBeenCalledWith('/sip-shelf/catalog.fixture.json');
    expect(catalog.colorways).toHaveLength(5);
  });

  it('fails clearly when the file cannot be fetched', async () => {
    const fetchStub = async () => new Response('missing', { status: 404 });
    await expect(loadCatalog('/x.json', fetchStub)).rejects.toThrow(/catalog.*404/i);
  });
});
