import type { HexColor } from '../domain/types';
import { contrastRatio, parseHex, toHex, type Rgb } from './contrast';

/** WCAG AA for normal-size text. */
export const MIN_TEXT_CONTRAST = 4.5;

const BLACK = '#000000';
const WHITE = '#ffffff';

/** Black or white, whichever reads better on `background`. Always reaches 4.5:1 (the worst case is 4.58). */
export function readableText(background: HexColor): HexColor {
  return contrastRatio(WHITE, background) >= contrastRatio(BLACK, background) ? WHITE : BLACK;
}

function mix(from: Rgb, to: Rgb, t: number): Rgb {
  return from.map((c, i) => c + ((to[i] as number) - c) * t) as Rgb;
}

/**
 * Return `color`, nudged toward black or white (whichever is further from `background`'s
 * brightness) in 2% steps until it reaches `min` contrast with `background`.
 * A color that already passes is returned unchanged. Pure black/white always pass, so it terminates.
 */
export function ensureContrast(
  color: HexColor,
  background: HexColor,
  min: number = MIN_TEXT_CONTRAST,
): HexColor {
  if (contrastRatio(color, background) >= min) return color;
  const target = readableText(background);
  const from = parseHex(color);
  const to = parseHex(target);
  for (let step = 1; step <= 50; step++) {
    const candidate = toHex(mix(from, to, step / 50));
    if (contrastRatio(candidate, background) >= min) return candidate;
  }
  return target;
}
