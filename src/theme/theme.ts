import type { HexColor, Overrides, Palette } from '../domain/types';
import { isHexColor, parseHex, toHex, type Rgb } from './contrast';
import { ensureContrast, readableText } from './readable';

export type Scheme = 'light' | 'dark';

/** CSS custom properties (plus color-scheme) ready to set on the document root. */
export type ThemeVars = Record<string, string>;

/** A palette with all three slots filled in. */
export type ResolvedPalette = Required<Palette>;

function normalise(color: string, what: string): HexColor {
  if (!isHexColor(color)) throw new Error(`${what} is not a hex color: ${JSON.stringify(color)}`);
  return toHex(parseHex(color));
}

/**
 * Apply a person's Overrides to a Palette and fill the gaps: a missing lid takes the body,
 * a missing accent takes the lid. All colors come back as lowercase #rrggbb.
 */
export function resolvePalette(palette: Palette, overrides: Overrides = {}): ResolvedPalette {
  const body = normalise(overrides.body ?? palette.body, 'body color');
  const lid = normalise(overrides.lid ?? palette.lid ?? body, 'lid color');
  const accent = normalise(overrides.accent ?? palette.accent ?? lid, 'accent color');
  return { body, lid, accent };
}

function mix(from: HexColor, to: HexColor, toShare: number): HexColor {
  const a = parseHex(from);
  const b = parseHex(to);
  return toHex(a.map((c, i) => c + ((b[i] as number) - c) * toShare) as Rgb);
}

const LIGHT_PAGE = '#ffffff';
const DARK_PAGE = '#101012';

/**
 * Turn a Palette (with Overrides already applied by resolvePalette) into CSS custom properties.
 * Every text color is guaranteed 4.5:1 against the background it sits on.
 * No visual design lives here beyond the mapping: body is primary, lid is secondary.
 */
export function buildTheme(palette: Palette, scheme: Scheme): ThemeVars {
  const { body, lid, accent } = resolvePalette(palette);
  const page = scheme === 'light' ? LIGHT_PAGE : DARK_PAGE;

  const bg = mix(page, body, scheme === 'light' ? 0.1 : 0.14);
  const surface = mix(page, body, scheme === 'light' ? 0.18 : 0.24);

  return {
    'color-scheme': scheme,
    '--color-bg': bg,
    '--color-surface': surface,
    // Text that must read on both the page and the surface.
    '--color-text': ensureContrast(readableText(bg), [bg, surface]),
    '--color-primary': body,
    '--color-on-primary': readableText(body),
    '--color-secondary': lid,
    '--color-on-secondary': readableText(lid),
    '--color-accent': accent,
    '--color-on-accent': readableText(accent),
    // The accent used as text (links) on the page or surface, nudged until it reads on both.
    '--color-link': ensureContrast(accent, [bg, surface]),
  };
}
