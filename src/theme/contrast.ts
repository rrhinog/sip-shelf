import type { HexColor } from '../domain/types';

export type Rgb = [number, number, number];

/** Parse "#rgb" or "#rrggbb" (any case) to 0-255 channels. Throws on anything else. */
export function parseHex(hex: string): Rgb {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) throw new Error(`Not a hex color: ${JSON.stringify(hex)}`);
  let digits = match[1] as string;
  if (digits.length === 3) digits = [...digits].map((d) => d + d).join('');
  return [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16)) as Rgb;
}

export function isHexColor(value: unknown): value is HexColor {
  return typeof value === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

/** Format channels (0-255, rounded and clamped) as lowercase "#rrggbb". */
export function toHex([r, g, b]: Rgb): HexColor {
  return (
    '#' +
    [r, g, b]
      .map((c) => Math.min(255, Math.max(0, Math.round(c))).toString(16).padStart(2, '0'))
      .join('')
  );
}

/** WCAG 2.x relative luminance. */
export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio between two colors, 1 to 21, order does not matter. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
