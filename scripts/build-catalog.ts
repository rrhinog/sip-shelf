// Builds the shipped Catalog (public/catalog.json) from the two research files in data/.
// Run it with `npm run build:catalog`. It is deterministic: the same CSVs give the same bytes.
// Node runs this file directly (type stripping), so imports of our own files are type-only.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Catalog, Colorway, Confidence, Model, Offering, Palette } from '../src/domain/types.ts';

/** The placeholder palette for a colorway with no sampled colors (the same neutral blue-grey the app defaults to). */
export const NEUTRAL_PALETTE: Palette = { body: '#4a6572' };

/**
 * Researched colorways the Catalog leaves out on purpose. The research files keep them; the
 * shipped Catalog does not. Each one says why.
 */
export const EXCLUDED_COLORWAYS: ReadonlyArray<{ name: string; reason: string }> = [
  { name: 'Salt Spray', reason: 'a bag (the Sun-Day Collapsible Tote), not a bottle; bags are out of v1 (ADR 0004)' },
];

/**
 * Kids bottles are out of v1 (maintainer, 2026-11-27). These model lines are still recognised, so their
 * sizes are read correctly, then dropped: a colorway sold only as a kids bottle is left out, and one
 * also sold as an adult bottle keeps only its adult offerings. "kids" is the bare "Kids" some rows give.
 */
export const KIDS_MODEL_IDS: ReadonlySet<string> = new Set(['kids-freesip', 'kids-tumbler', 'kids']);
const KIDS_REASON = 'sold only as a kids bottle; kids bottles are out of v1';

/** A researched colorway the shipped Catalog leaves out, and why. */
export interface LeftOut {
  colorway: string;
  reason: string;
}

/** Something in colorways.csv this script could not map onto a Model or size. */
export interface Unmapped {
  colorway: string;
  field: 'models' | 'sizes';
  value: string;
  reason: string;
}

export interface BuildResult {
  catalog: Catalog;
  unmapped: Unmapped[];
  leftOut: LeftOut[];
}

// ---------------------------------------------------------------------------------------------
// CSV

/** Parse CSV text (quoted cells, "" escapes, LF or CRLF) into one record per row, keyed by the header row. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((r) => !(r.length === 1 && r[0] === ''));
  if (!header) return [];
  return body.map((r) => Object.fromEntries(header.map((name, i) => [name, r[i] ?? ''])));
}

// ---------------------------------------------------------------------------------------------
// Models and sizes

/** The Owala bottle lines we recognise, in the order the app lists them. */
const MODEL_LINES: { id: string; name: string }[] = [
  { id: 'freesip', name: 'FreeSip' },
  { id: 'freesip-sway', name: 'FreeSip Sway' },
  { id: 'freesip-twist', name: 'FreeSip Twist' },
  { id: 'freesip-tumbler', name: 'FreeSip Tumbler' },
  { id: 'smoothsip-slider', name: 'SmoothSip Slider' },
  { id: 'smoothsip-slider-with-handle', name: 'SmoothSip Slider with Handle' },
  { id: 'smoothsip', name: 'SmoothSip' },
  { id: 'kids-freesip', name: "Kids' FreeSip" },
  { id: 'kids-tumbler', name: "Kids' Tumbler" },
  { id: 'kids', name: 'Kids' },
  { id: 'straw-tumbler', name: 'Straw Tumbler' },
  { id: 'bucket-handle-tumbler', name: 'Bucket Handle Tumbler' },
];

type Line = (typeof MODEL_LINES)[number];

const canon = (s: string) => s.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
const withoutBrackets = (s: string) => s.replace(/\([^)]*\)/g, ' ');
const lineByName = (name: string): Line | undefined => MODEL_LINES.find((m) => canon(m.name) === canon(withoutBrackets(name)));

/** The models cell: names separated by ; or , (a collection name in brackets is ignored). `line` is undefined for a name we cannot map. */
function modelTokens(cell: string): { text: string; line: Line | undefined }[] {
  return withoutBrackets(cell)
    .split(/[;,]/)
    .map((t) => t.trim())
    .filter((t) => t !== '')
    .map((text) => ({ text, line: lineByName(text) }));
}

const numbersIn = (s: string): number[] => (s.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);

/** What a size group says besides its numbers, such as the "Sway" of "30oz Sway" ("steel", "plastic" and "oz" do not count). */
function labelOf(group: string): string {
  return group
    .replace(/\d+(?:\.\d+)?/g, ' ')
    .replace(/\b(oz|steel|plastic)\b/gi, ' ')
    .replace(/[,:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The model(s) a size label names, such as "Sway", "Slider" or "Sway/Tumbler". The label's words are matched
 * against the models listed for the colorway first, then against all lines; if several lines fit, the plain
 * one wins only when it is the start of all the others ("Slider" means SmoothSip Slider, not "... with Handle").
 */
function resolveLabel(label: string, listed: Line[]): Line[] | undefined {
  const found: Line[] = [];
  for (const part of label.split('/').map(canon)) {
    const pick = (pool: Line[]): Line | undefined => {
      const exact = pool.find((m) => canon(m.name) === part);
      if (exact) return exact;
      const fits = pool.filter((m) => canon(m.name).includes(part));
      if (fits.length === 1) return fits[0];
      const shortest = [...fits].sort((a, b) => a.name.length - b.name.length)[0];
      if (shortest && fits.every((m) => canon(m.name).startsWith(canon(shortest.name)))) return shortest;
      return undefined;
    };
    const line = pick(listed) ?? pick(MODEL_LINES);
    if (!line) return undefined;
    found.push(line);
  }
  return found.length > 0 ? found : undefined;
}

interface Mapped {
  /** model id -> sizes in oz (an empty list means the sizes were not confirmed). In the order the models are listed. */
  sizes: Map<string, number[]>;
  unmapped: Omit<Unmapped, 'colorway'>[];
}

function addSizes(sizes: Map<string, number[]>, line: Line, oz: number[]) {
  const have = sizes.get(line.id) ?? [];
  sizes.set(line.id, [...new Set([...have, ...oz])].sort((a, b) => a - b));
}

/** Map one colorway's free-text models and sizes cells onto model ids and sizes, saying what could not be mapped. */
function mapModelsAndSizes(modelsCell: string, sizesCell: string): Mapped {
  const tokens = modelTokens(modelsCell);
  const result: Mapped = { sizes: new Map(), unmapped: [] };
  for (const t of tokens) {
    if (t.line) result.sizes.set(t.line.id, result.sizes.get(t.line.id) ?? []);
    else result.unmapped.push({ field: 'models', value: t.text, reason: 'does not name one bottle model this catalog knows' });
  }
  const sizes = sizesCell.trim();
  if (sizes === '') return result;

  const listed = tokens.flatMap((t) => (t.line ? [t.line] : []));
  const parts = sizes.split('|').map((p) => p.trim());

  // "FreeSip: 24oz, 32oz | FreeSip Sway: 30oz": every part names its model.
  if (parts.every((p) => /^[^:]+:/.test(p))) {
    for (const part of parts) {
      const colon = part.indexOf(':');
      const line = lineByName(part.slice(0, colon));
      if (line) addSizes(result.sizes, line, numbersIn(part.slice(colon + 1)));
      else result.unmapped.push({ field: 'sizes', value: part, reason: 'names a model this catalog does not know' });
    }
    return result;
  }

  // "24oz; 30oz Sway": groups separated by ;, matched to models by label, then by position.
  const groups = sizes.split(';').map((g) => g.trim()).filter((g) => g !== '');
  const claimed = new Set<string>();
  const unlabelled: string[] = [];
  const failed: string[] = [];
  for (const group of groups) {
    const label = labelOf(group);
    if (label === '') {
      unlabelled.push(group);
      continue;
    }
    const lines = resolveLabel(label, listed);
    if (!lines) {
      failed.push(group);
      continue;
    }
    for (const line of lines) {
      addSizes(result.sizes, line, numbersIn(group));
      claimed.add(line.id);
    }
  }
  const unclaimed = tokens.filter((t) => !t.line || !claimed.has(t.line.id));
  if (unlabelled.length > 0) {
    if (unlabelled.length === unclaimed.length) {
      unlabelled.forEach((group, i) => {
        const token = unclaimed[i]!;
        if (token.line) addSizes(result.sizes, token.line, numbersIn(group));
        else result.unmapped.push({ field: 'sizes', value: group, reason: `belongs to ${token.text}, which is not mapped` });
      });
    } else {
      failed.push(...unlabelled);
    }
  }
  if (failed.length > 0) {
    result.unmapped.push({
      field: 'sizes',
      value: failed.join('; '),
      reason: `could not tell which of ${tokens.map((t) => t.text).join(', ') || 'no listed models'} these sizes belong to`,
    });
  }
  return result;
}

// ---------------------------------------------------------------------------------------------
// The join

function slug(name: string): string {
  const s = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (s === '') throw new Error(`Cannot make an id from the colorway name ${JSON.stringify(name)}`);
  return s;
}

function hexOrNone(value: string | undefined, what: string): string | undefined {
  const v = (value ?? '').trim();
  if (v === '') return undefined;
  if (!/^#[0-9a-f]{6}$/i.test(v)) throw new Error(`${what}: ${JSON.stringify(v)} is not a #rrggbb hex color`);
  return v.toLowerCase();
}

function confidenceOf(value: string | undefined, name: string): Confidence {
  const v = (value ?? '').trim();
  if (v !== 'high' && v !== 'medium' && v !== 'low') throw new Error(`${name}: confidence ${JSON.stringify(v)} must be high, medium or low`);
  return v;
}

function linksOf(cell: string, name: string): string[] {
  const links = [...new Set(cell.split(/\s+/).filter((l) => l !== ''))];
  for (const l of links) if (!/^https?:\/\/\S+$/.test(l)) throw new Error(`${name}: ${JSON.stringify(l)} is not a web link`);
  return links;
}

/** Join colorways.csv and palettes.csv into the Catalog, and list what could not be mapped to a Model or size. */
export function buildCatalog(colorwaysCsv: string, palettesCsv: string): BuildResult {
  const colorwayRows = parseCsv(colorwaysCsv);
  const paletteRows = parseCsv(palettesCsv);

  const palettesByName = new Map<string, Record<string, string>>();
  for (const p of paletteRows) {
    const name = p.name ?? '';
    if (palettesByName.has(name)) throw new Error(`palettes.csv lists ${JSON.stringify(name)} twice`);
    palettesByName.set(name, p);
  }
  const names = new Set<string>();
  for (const c of colorwayRows) {
    const name = c.name ?? '';
    if (names.has(name)) throw new Error(`colorways.csv lists ${JSON.stringify(name)} twice`);
    names.add(name);
    if (!palettesByName.has(name)) throw new Error(`palettes.csv has no row for the colorway ${JSON.stringify(name)}`);
  }
  for (const name of palettesByName.keys()) {
    if (!names.has(name)) throw new Error(`palettes.csv has a row for ${JSON.stringify(name)}, which colorways.csv does not list`);
  }

  const unmapped: Unmapped[] = [];
  const leftOut: LeftOut[] = [];
  const modelSizes = new Map<string, Set<number>>();
  const usedIds = new Set<string>();
  const kept = colorwayRows.filter((row) => {
    const name = row.name ?? '';
    const excluded = EXCLUDED_COLORWAYS.find((e) => e.name === name);
    if (excluded) {
      leftOut.push({ colorway: name, reason: excluded.reason });
      return false;
    }
    const tokens = modelTokens(row.models ?? '');
    if (tokens.length > 0 && tokens.every((t) => t.line && KIDS_MODEL_IDS.has(t.line.id))) {
      leftOut.push({ colorway: name, reason: KIDS_REASON });
      return false;
    }
    return true;
  });
  const colorways: Colorway[] = kept.map((row) => {
    const name = row.name!;
    const palette = palettesByName.get(name)!;

    let id = slug(name);
    for (let n = 2; usedIds.has(id); n++) id = `${slug(name)}-${n}`;
    usedIds.add(id);

    const body = hexOrNone(palette.body_hex, `${name} body_hex`);
    const lid = hexOrNone(palette.lid_hex, `${name} lid_hex`);
    const accent = hexOrNone(palette.accent_hex, `${name} accent_hex`);
    if (!body && (lid || accent)) throw new Error(`${name} has a lid or accent hex but no body hex`);

    const mapped = mapModelsAndSizes(row.models ?? '', row.sizes ?? '');
    for (const u of mapped.unmapped) unmapped.push({ colorway: name, ...u });
    const offerings: Offering[] = [...mapped.sizes].filter(([modelId]) => !KIDS_MODEL_IDS.has(modelId)).map(([modelId, sizesOz]) => {
      const seen = modelSizes.get(modelId) ?? new Set<number>();
      for (const s of sizesOz) seen.add(s);
      modelSizes.set(modelId, seen);
      return { modelId, sizesOz };
    });

    const colorway: Colorway = body
      ? {
          id,
          name,
          palette: { body, ...(lid ? { lid } : {}), ...(accent ? { accent } : {}) },
          sampled: true,
          confidence: confidenceOf(palette.confidence, name),
          sources: linksOf(row.source_urls ?? '', name),
          offerings,
        }
      : { id, name, palette: { ...NEUTRAL_PALETTE }, sampled: false, sources: linksOf(row.source_urls ?? '', name), offerings };
    return colorway;
  });

  const models: Model[] = MODEL_LINES.filter((m) => modelSizes.has(m.id)).map((m) => ({
    id: m.id,
    name: m.name,
    sizesOz: [...modelSizes.get(m.id)!].sort((a, b) => a - b),
  }));

  const readOn = [...new Set(colorwayRows.map((r) => r.read_on ?? '').filter((d) => d !== ''))].sort().at(-1);
  const source =
    `Colorway names, models, sizes and source pages from Owala's public pages${readOn ? `, read ${readOn}` : ''}. ` +
    'Colors were sampled from Owala product photos; each colorway says how sure the sampling was, and colorways with no sampled colors are marked and shown in a neutral color.';

  return { catalog: { source, models, colorways }, unmapped, leftOut };
}

/** The Catalog as JSON text: one model or colorway per line, so a data change is a small diff. Ends with a newline. */
export function serializeCatalog(catalog: Catalog): string {
  const lines = (items: unknown[]) => items.map((item) => `    ${JSON.stringify(item)}`).join(',\n');
  return [
    '{',
    `  "source": ${JSON.stringify(catalog.source)},`,
    '  "models": [',
    lines(catalog.models),
    '  ],',
    '  "colorways": [',
    lines(catalog.colorways),
    '  ]',
    '}',
    '',
  ].join('\n');
}

// ---------------------------------------------------------------------------------------------
// Command line: npm run build:catalog

function main() {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const { catalog, unmapped, leftOut } = buildCatalog(
    readFileSync(`${root}data/colorways.csv`, 'utf8'),
    readFileSync(`${root}data/palettes.csv`, 'utf8'),
  );
  writeFileSync(`${root}public/catalog.json`, serializeCatalog(catalog));
  const sampled = catalog.colorways.filter((c) => c.sampled).length;
  console.log(
    `public/catalog.json: ${catalog.colorways.length} colorways (${sampled} sampled, ${catalog.colorways.length - sampled} unsampled), ${catalog.models.length} models`,
  );
  console.log(`Left out on purpose (${leftOut.length}):`);
  for (const l of leftOut) console.log(`  ${l.colorway} | ${l.reason}`);
  const noModels = catalog.colorways.filter((c) => c.offerings.length === 0).length;
  const noSizes = catalog.colorways.filter((c) => c.offerings.some((o) => o.sizesOz.length === 0)).length;
  console.log(`${noModels} colorways with no confirmed model, ${noSizes} with a model whose sizes are unconfirmed`);
  if (unmapped.length > 0) {
    console.log(`Not mapped (${unmapped.length}):`);
    for (const u of unmapped) console.log(`  ${u.colorway} | ${u.field}: ${u.value} | ${u.reason}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
