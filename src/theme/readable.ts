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

/** Black or white, whichever has the better worst-case contrast across `backgrounds`. */
function bestTarget(backgrounds: HexColor[]): HexColor {
  const worst = (fg: HexColor) => Math.min(...backgrounds.map((bg) => contrastRatio(fg, bg)));
  return worst(WHITE) >= worst(BLACK) ? WHITE : BLACK;
}

/**
 * Return `color`, nudged toward black or white (whichever reads better on `background`)
 * in 2% steps until it reaches `min` contrast with it. Pass several backgrounds when the
 * text sits on more than one of them; it must reach `min` on all.
 * A color that already passes is returned unchanged.
 */
export function ensureContrast(
  color: HexColor,
  background: HexColor | HexColor[],
  min: number = MIN_TEXT_CONTRAST,
): HexColor {
  const backgrounds = Array.isArray(background) ? background : [background];
  const passes = (c: HexColor) => backgrounds.every((bg) => contrastRatio(c, bg) >= min);
  if (passes(color)) return color;
  const target = bestTarget(backgrounds);
  const from = parseHex(color);
  const to = parseHex(target);
  for (let step = 1; step <= 50; step++) {
    const candidate = toHex(mix(from, to, step / 50));
    if (passes(candidate)) return candidate;
  }
  return target;
}
