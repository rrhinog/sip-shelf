import type { HexColor, Overrides, PaletteSlot } from '../domain/types';
import { isHexColor, parseHex, toHex } from './contrast';
import type { ResolvedPalette } from './theme';

/**
 * The Overrides after the person sets one slot to `color`. `base` is the Palette without Overrides:
 * choosing the Palette's own color is the same as having no Override, so it is dropped.
 */
export function setOverride(overrides: Overrides, slot: PaletteSlot, color: HexColor, base: ResolvedPalette): Overrides {
  if (!isHexColor(color)) throw new Error(`Not a hex color: ${JSON.stringify(color)}`);
  const hex = toHex(parseHex(color));
  if (hex === base[slot]) return resetOverride(overrides, slot);
  return { ...overrides, [slot]: hex };
}

/** The Overrides with one slot back to the Palette's own color. */
export function resetOverride(overrides: Overrides, slot: PaletteSlot): Overrides {
  const rest = { ...overrides };
  delete rest[slot];
  return rest;
}
