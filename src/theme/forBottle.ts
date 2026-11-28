import type { Bottle, Catalog, Palette } from '../domain/types';
import { buildTheme, resolvePalette, type ResolvedPalette, type Scheme, type ThemeVars } from './theme';

/** Used when there is no Active bottle yet (or its colorway left the Catalog). A neutral blue-grey. */
export const DEFAULT_PALETTE: Palette = { body: '#4a6572' };

function catalogPalette(bottle: Bottle, catalog: Catalog): Palette {
  const { colorway } = bottle;
  if (colorway.kind === 'custom') return colorway.palette;
  return catalog.colorways.find((c) => c.id === colorway.colorwayId)?.palette ?? DEFAULT_PALETTE;
}

/** A Bottle's Palette before Overrides: its Catalog colorway's (or its Custom colorway's own). */
export function basePaletteForBottle(bottle: Bottle, catalog: Catalog): ResolvedPalette {
  return resolvePalette(catalogPalette(bottle, catalog));
}

/** A Bottle's Palette: its Catalog colorway's (or its Custom colorway's own), with Overrides applied. */
export function paletteForBottle(bottle: Bottle, catalog: Catalog): ResolvedPalette {
  return resolvePalette(catalogPalette(bottle, catalog), bottle.overrides);
}

/** The CSS custom properties for the app, themed from the Active bottle (or the default). */
export function themeForBottle(active: Bottle | null, catalog: Catalog, scheme: Scheme): ThemeVars {
  return buildTheme(active ? paletteForBottle(active, catalog) : DEFAULT_PALETTE, scheme);
}

/** Set theme variables on an element (the document root in the app). */
export function applyTheme(element: HTMLElement, vars: ThemeVars): void {
  for (const [name, value] of Object.entries(vars)) element.style.setProperty(name, value);
}

/** Point every theme-color tag (the phone's status and browser bar) at the app's primary color. */
export function applyThemeColor(doc: Document, vars: ThemeVars): void {
  const color = vars['--color-primary'];
  if (!color) return;
  let tags = [...doc.querySelectorAll('meta[name="theme-color"]')];
  if (tags.length === 0) {
    const tag = doc.createElement('meta');
    tag.name = 'theme-color';
    doc.head.appendChild(tag);
    tags = [tag];
  }
  for (const tag of tags) tag.setAttribute('content', color);
}
