import { describe, expect, it } from 'vitest';
import { buildCatalog, NEUTRAL_PALETTE, parseCsv, serializeCatalog } from './build-catalog';

const COLORWAY_HEADER = 'name,models,sizes,status,body,lid,accent,straw_or_spout,released,source_urls,read_on,notes';
const PALETTE_HEADER = 'name,body_hex,lid_hex,accent_hex,method,source_image_urls,confidence,notes';

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v;
}
/** One colorways.csv row: only name, models, sizes and source_urls matter to the build. */
function cw(name: string, models: string, sizes: string, sources = 'https://owalalife.com/collections/all'): string {
  return [name, models, sizes, 'core', 'photo only', '', '', '', '', sources, '2026-11-27', 'a working note'].map(csvCell).join(',');
}
/** One palettes.csv row. */
function pal(name: string, body = '', lid = '', accent = '', confidence = ''): string {
  const method = body ? 'product-photo' : '';
  return [name, body, lid, accent, method, body ? 'https://cdn.example.com/a-picture.png' : '', confidence, 'a working note'].map(csvCell).join(',');
}
const csv = (header: string, ...rows: string[]) => [header, ...rows].join('\r\n') + '\r\n';

function build(colorwayRows: string[], paletteRows: string[]) {
  return buildCatalog(csv(COLORWAY_HEADER, ...colorwayRows), csv(PALETTE_HEADER, ...paletteRows));
}
const only = (colorwayRow: string, paletteRow: string) => {
  const { catalog, unmapped } = build([colorwayRow], [paletteRow]);
  return { colorway: catalog.colorways[0]!, catalog, unmapped };
};

describe('parseCsv', () => {
  it('reads quoted cells with commas, quotes and line breaks, and either kind of line ending', () => {
    const rows = parseCsv('a,b\r\n"x, y","say ""hi"""\n"two\nlines",z\n');
    expect(rows).toEqual([
      { a: 'x, y', b: 'say "hi"' },
      { a: 'two\nlines', b: 'z' },
    ]);
  });

  it('keeps empty cells as empty strings and ignores a blank last line', () => {
    expect(parseCsv('a,b,c\n1,,3\n\n')).toEqual([{ a: '1', b: '', c: '3' }]);
  });
});

describe('a sampled colorway', () => {
  const { colorway } = only(
    cw('Out of the Blue', 'FreeSip', '24oz, 32oz', 'https://owalalife.com/products/freesip https://owalalife.com/collections/all'),
    pal('Out of the Blue', '#9EB0E2', '#9EB0E2', '#BE044B', 'high'),
  );

  it('gets an id made from its name, its palette (lowercase hex), its confidence and its source pages', () => {
    expect(colorway).toMatchObject({
      id: 'out-of-the-blue',
      name: 'Out of the Blue',
      sampled: true,
      confidence: 'high',
      palette: { body: '#9eb0e2', lid: '#9eb0e2', accent: '#be044b' },
      sources: ['https://owalalife.com/products/freesip', 'https://owalalife.com/collections/all'],
    });
  });

  it('leaves out an accent that was not sampled, rather than inventing one', () => {
    const { colorway: c } = only(cw('Plain', 'FreeSip', '24oz'), pal('Plain', '#112233', '#445566', '', 'medium'));
    expect(c.palette).toEqual({ body: '#112233', lid: '#445566' });
  });

  it('never carries the image links or the working notes into the catalog', () => {
    const { catalog } = only(cw('Plain', 'FreeSip', '24oz'), pal('Plain', '#112233', '#445566', '', 'medium'));
    const text = serializeCatalog(catalog);
    expect(text).not.toContain('a-picture.png');
    expect(text).not.toContain('working note');
  });
});

describe('an unsampled colorway (no hex values)', () => {
  const { colorway } = only(cw('Target Only', 'FreeSip', '24oz'), pal('Target Only'));

  it('ships with the neutral palette, marked unsampled, with no confidence', () => {
    expect(colorway.sampled).toBe(false);
    expect(colorway.palette).toEqual(NEUTRAL_PALETTE);
    expect(colorway.confidence).toBeUndefined();
  });

  it('still keeps its source links and offerings', () => {
    expect(colorway.sources).toEqual(['https://owalalife.com/collections/all']);
    expect(colorway.offerings).toEqual([{ modelId: 'freesip', sizesOz: [24] }]);
  });
});

describe('ids', () => {
  it('make names with punctuation and accents safe, and keep two names that collide apart', () => {
    const names = ['Can You See Me?', "That's a Gimme", 'Gimme', 'Gimme!', 'Café'];
    const { catalog } = build(
      names.map((n) => cw(n, 'FreeSip', '24oz')),
      names.map((n) => pal(n)),
    );
    expect(catalog.colorways.map((c) => c.id)).toEqual(['can-you-see-me', 'thats-a-gimme', 'gimme', 'gimme-2', 'cafe']);
  });
});

describe('mapping models and sizes', () => {
  it('reads "Model: sizes | Model: sizes", and a model with no sizes listed keeps its place with unconfirmed sizes', () => {
    const { colorway } = only(
      cw('Multi', 'FreeSip; FreeSip Sway; FreeSip Tumbler; SmoothSip Slider', 'FreeSip: 24oz, 32oz | FreeSip Sway: 30oz | SmoothSip Slider: 12oz, 20oz'),
      pal('Multi'),
    );
    expect(colorway.offerings).toEqual([
      { modelId: 'freesip', sizesOz: [24, 32] },
      { modelId: 'freesip-sway', sizesOz: [30] },
      { modelId: 'freesip-tumbler', sizesOz: [] },
      { modelId: 'smoothsip-slider', sizesOz: [12, 20] },
    ]);
  });

  it('reads sizes with a material word after them, such as "12oz steel"', () => {
    const { colorway } = only(cw('Kid', "Kids' Tumbler", '12oz steel, 15oz plastic'), pal('Kid'));
    expect(colorway.offerings).toEqual([{ modelId: 'kids-tumbler', sizesOz: [12, 15] }]);
  });

  it('reads models separated by commas, and ignores a collection name in brackets', () => {
    const { colorway } = only(cw('Holiday', 'FreeSip, FreeSip Sway (Holiday)', '24oz; 30oz'), pal('Holiday'));
    expect(colorway.offerings).toEqual([
      { modelId: 'freesip', sizesOz: [24] },
      { modelId: 'freesip-sway', sizesOz: [30] },
    ]);
  });

  it('matches size groups to models by position when the counts agree', () => {
    const { colorway, unmapped } = only(cw('Trio', 'FreeSip, FreeSip Sway, SmoothSip Slider', '24, 32, 40oz; 30, 40oz; 12, 20oz'), pal('Trio'));
    expect(colorway.offerings).toEqual([
      { modelId: 'freesip', sizesOz: [24, 32, 40] },
      { modelId: 'freesip-sway', sizesOz: [30, 40] },
      { modelId: 'smoothsip-slider', sizesOz: [12, 20] },
    ]);
    expect(unmapped).toEqual([]);
  });

  it('matches a size group to the model its label names, even when the models cell does not list it', () => {
    const { colorway } = only(cw('Labelled', 'FreeSip', '24oz; 30oz Sway'), pal('Labelled'));
    expect(colorway.offerings).toEqual([
      { modelId: 'freesip', sizesOz: [24] },
      { modelId: 'freesip-sway', sizesOz: [30] },
    ]);
  });

  it('lets one label name several models, and leaves the others with unconfirmed sizes', () => {
    const { colorway } = only(
      cw('Cherry', 'FreeSip, FreeSip Sway, FreeSip Tumbler, FreeSip Twist, SmoothSip Slider', '32oz FreeSip; 40oz Sway/Tumbler'),
      pal('Cherry'),
    );
    expect(colorway.offerings).toEqual([
      { modelId: 'freesip', sizesOz: [32] },
      { modelId: 'freesip-sway', sizesOz: [40] },
      { modelId: 'freesip-tumbler', sizesOz: [40] },
      { modelId: 'freesip-twist', sizesOz: [] },
      { modelId: 'smoothsip-slider', sizesOz: [] },
    ]);
  });

  it('does not guess when sizes cannot be matched to models: it keeps the models with unconfirmed sizes and says so', () => {
    const { colorway, unmapped } = only(cw('Vague', 'FreeSip, FreeSip Twist', '24oz'), pal('Vague'));
    expect(colorway.offerings).toEqual([
      { modelId: 'freesip', sizesOz: [] },
      { modelId: 'freesip-twist', sizesOz: [] },
    ]);
    expect(unmapped).toEqual([{ colorway: 'Vague', field: 'sizes', value: '24oz', reason: expect.any(String) }]);
  });

  it('keeps a colorway with no models, and one whose model is not a bottle or is ambiguous, as unconfirmed, and says so', () => {
    const { catalog, unmapped } = build(
      [cw('Nowhere', '', ''), cw('Tote', 'Sun-Day Collapsible Tote (bag, not a bottle)', ''), cw('Kidsy', 'Kids', '16oz')],
      [pal('Nowhere'), pal('Tote'), pal('Kidsy')],
    );
    expect(catalog.colorways.map((c) => c.offerings)).toEqual([[], [], []]);
    expect(unmapped.map((u) => [u.colorway, u.field, u.value])).toEqual([
      ['Tote', 'models', 'Sun-Day Collapsible Tote'],
      ['Kidsy', 'models', 'Kids'],
      ['Kidsy', 'sizes', '16oz'],
    ]);
  });

  it('lists only models that some colorway is sold on, in a fixed order, with the sizes seen for each', () => {
    const { catalog } = build(
      [cw('One', 'SmoothSip Slider', '20oz'), cw('Two', 'FreeSip', '32oz, 24oz'), cw('Three', 'FreeSip', '40oz')],
      [pal('One'), pal('Two'), pal('Three')],
    );
    expect(catalog.models).toEqual([
      { id: 'freesip', name: 'FreeSip', sizesOz: [24, 32, 40] },
      { id: 'smoothsip-slider', name: 'SmoothSip Slider', sizesOz: [20] },
    ]);
  });
});

describe('checks on the two files', () => {
  it('stops if the two files do not list the same colorways', () => {
    expect(() => build([cw('A', 'FreeSip', '24oz')], [pal('B')])).toThrow(/A/);
  });

  it('stops if a colorway has a lid color but no body color', () => {
    expect(() => build([cw('A', 'FreeSip', '24oz')], [pal('A', '', '#112233')])).toThrow(/body/i);
  });

  it('stops on a hex value that is not hex', () => {
    expect(() => build([cw('A', 'FreeSip', '24oz')], [pal('A', 'blue', '', '', 'high')])).toThrow(/hex/i);
  });

  it('stops on a sampled colorway with a confidence that is not high, medium or low', () => {
    expect(() => build([cw('A', 'FreeSip', '24oz')], [pal('A', '#112233', '', '', 'sure')])).toThrow(/confidence/i);
  });
});

describe('serializeCatalog', () => {
  it('is deterministic, round-trips, and puts each colorway on its own line, so a data change is a small diff', () => {
    const { catalog } = build([cw('A', 'FreeSip', '24oz'), cw('B', 'FreeSip', '32oz')], [pal('A', '#112233', '', '', 'high'), pal('B')]);
    const text = serializeCatalog(catalog);
    expect(serializeCatalog(catalog)).toBe(text);
    expect(JSON.parse(text)).toEqual(catalog);
    expect(text.split('\n').filter((l) => l.includes('"id":"a"'))).toHaveLength(1);
    expect(text.endsWith('\n')).toBe(true);
  });
});
