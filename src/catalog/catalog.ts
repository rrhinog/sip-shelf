import type { Catalog, Colorway, Model, Offering, Palette } from '../domain/types';
import { isHexColor, parseHex, toHex } from '../theme/contrast';

/** Where the app loads its Catalog from (relative to the deployed base path). */
export const CATALOG_URL = `${import.meta.env.BASE_URL}catalog.fixture.json`;

function fail(message: string): never {
  throw new Error(`Invalid catalog: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function str(value: unknown, what: string): string {
  if (typeof value !== 'string' || value.trim() === '') fail(`${what} must be a non-empty string`);
  return value;
}

function hex(value: unknown, what: string): string {
  if (!isHexColor(value)) fail(`${what} must be a hex color, got ${JSON.stringify(value)}`);
  return toHex(parseHex(value));
}

function sizes(value: unknown, what: string): number[] {
  if (!Array.isArray(value) || value.length === 0) fail(`${what} must be a non-empty list of sizes`);
  return value.map((s) => {
    if (typeof s !== 'number' || !Number.isFinite(s) || s <= 0) fail(`${what} has a bad size ${JSON.stringify(s)}`);
    return s;
  });
}

function list(value: unknown, what: string): unknown[] {
  if (!Array.isArray(value)) fail(`${what} must be a list`);
  return value;
}

/** Validate untrusted JSON into a Catalog, or throw an "Invalid catalog" error saying what is wrong. */
export function parseCatalog(raw: unknown): Catalog {
  if (!isRecord(raw)) fail('the file must be a JSON object');
  const source = str(raw.source, 'source');

  const models: Model[] = list(raw.models, 'models').map((m, i) => {
    if (!isRecord(m)) fail(`models[${i}] must be an object`);
    return { id: str(m.id, `models[${i}].id`), name: str(m.name, `models[${i}].name`), sizesOz: sizes(m.sizesOz, `models[${i}].sizesOz`) };
  });
  const modelsById = new Map<string, Model>();
  for (const m of models) {
    if (modelsById.has(m.id)) fail(`two models share the id ${m.id}`);
    modelsById.set(m.id, m);
  }

  const colorways: Colorway[] = list(raw.colorways, 'colorways').map((c, i) => {
    if (!isRecord(c)) fail(`colorways[${i}] must be an object`);
    const id = str(c.id, `colorways[${i}].id`);
    if (!isRecord(c.palette)) fail(`${id}: palette must be an object`);
    const palette: Palette = { body: hex(c.palette.body, `${id}: palette.body`) };
    if (c.palette.lid !== undefined) palette.lid = hex(c.palette.lid, `${id}: palette.lid`);
    if (c.palette.accent !== undefined) palette.accent = hex(c.palette.accent, `${id}: palette.accent`);
    const offerings: Offering[] = list(c.offerings, `${id}: offerings`).map((o, j) => {
      if (!isRecord(o)) fail(`${id}: offerings[${j}] must be an object`);
      const modelId = str(o.modelId, `${id}: offerings[${j}].modelId`);
      const model = modelsById.get(modelId);
      if (!model) fail(`${id} is offered on unknown model ${modelId}`);
      const offered = sizes(o.sizesOz, `${id}: offerings[${j}].sizesOz`);
      for (const s of offered) if (!model.sizesOz.includes(s)) fail(`${id} is offered on ${modelId} in ${s} oz, which that model is not sold in`);
      return { modelId, sizesOz: offered };
    });
    return { id, name: str(c.name, `${id}: name`), palette, offerings };
  });
  const seen = new Set<string>();
  for (const c of colorways) {
    if (seen.has(c.id)) fail(`two colorways share the id ${c.id}`);
    seen.add(c.id);
  }

  return { source, models, colorways };
}

/** The sizes (oz) a Model is sold in; empty for an unknown Model. */
export function sizesFor(catalog: Catalog, modelId: string): number[] {
  return catalog.models.find((m) => m.id === modelId)?.sizesOz ?? [];
}

/** The Catalog colorways sold on this Model in this size, in Catalog order. */
export function colorwaysFor(catalog: Catalog, modelId: string, sizeOz: number): Colorway[] {
  return catalog.colorways.filter((c) =>
    c.offerings.some((o) => o.modelId === modelId && o.sizesOz.includes(sizeOz)),
  );
}

/** Fetch and validate a Catalog JSON file. `fetchImpl` is injectable for tests. */
export async function loadCatalog(
  url: string = CATALOG_URL,
  fetchImpl: (input: string) => Promise<Response> = (u) => fetch(u),
): Promise<Catalog> {
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`Could not load the catalog from ${url} (HTTP ${response.status})`);
  return parseCatalog(await response.json());
}
