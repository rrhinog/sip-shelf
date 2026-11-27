import type { Bottle, Catalog, PaletteSlot } from '../domain/types';
import { basePaletteForBottle, paletteForBottle } from '../theme/forBottle';
import type { ResolvedPalette } from '../theme/theme';

export interface BottleDescription {
  /** The nickname, or the colorway's name when there is none. */
  title: string;
  colorwayName: string;
  modelName: string;
  /** "FreeSip · 24 oz" */
  detail: string;
  /** One line for screen readers and tests: "Gym bottle, Plaid and Simple, FreeSip 24 oz". */
  summary: string;
  /** The Bottle's Palette with Overrides applied. */
  palette: ResolvedPalette;
  /** The Palette before Overrides: the Catalog colorway's (or the Custom colorway's own) colors. */
  basePalette: ResolvedPalette;
  /** Which colors the person has replaced with an Override. */
  overridden: Record<PaletteSlot, boolean>;
  /** True for a Custom colorway (colors the person defined), false for a Catalog colorway. */
  custom: boolean;
  /** False for a Catalog colorway whose colors were never sampled (it then shows the neutral palette). */
  sampled: boolean;
}

/** Everything the screens say about a Bottle, in one place. */
export function describeBottle(bottle: Bottle, catalog: Catalog): BottleDescription {
  const { colorway } = bottle;
  const entry = colorway.kind === 'catalog' ? catalog.colorways.find((c) => c.id === colorway.colorwayId) : undefined;
  const colorwayName = colorway.kind === 'custom' ? colorway.name : (entry?.name ?? 'Unknown colorway');
  const modelName = catalog.models.find((m) => m.id === bottle.modelId)?.name ?? bottle.modelId;
  const title = bottle.nickname || colorwayName;
  const summary = [bottle.nickname, colorwayName, `${modelName} ${bottle.sizeOz} oz`].filter(Boolean).join(', ');
  return {
    title,
    colorwayName,
    modelName,
    detail: `${modelName} · ${bottle.sizeOz} oz`,
    summary,
    palette: paletteForBottle(bottle, catalog),
    basePalette: basePaletteForBottle(bottle, catalog),
    overridden: { body: 'body' in bottle.overrides, lid: 'lid' in bottle.overrides, accent: 'accent' in bottle.overrides },
    custom: colorway.kind === 'custom',
    sampled: colorway.kind === 'custom' ? true : (entry?.sampled ?? false),
  };
}
