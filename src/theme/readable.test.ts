import { describe, expect, it } from 'vitest';
import { contrastRatio } from './contrast';
import { ensureContrast, readableText, MIN_TEXT_CONTRAST } from './readable';

// Backgrounds chosen to include the awkward mid-luminance ones where neither black nor white is easy.
const backgrounds = [
  '#ffffff', '#000000', '#767676', '#808080', '#777777', '#2b6cb0', '#e53e3e',
  '#f6e05e', '#38a169', '#9f7aea', '#ed8936', '#4fd1c5', '#ff69b4', '#1a202c',
];

describe('readableText', () => {
  it('is black on white and white on black', () => {
    expect(readableText('#ffffff')).toBe('#000000');
    expect(readableText('#000000')).toBe('#ffffff');
  });

  it.each(backgrounds)('reaches 4.5:1 on %s', (bg) => {
    expect(contrastRatio(readableText(bg), bg)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });
});

describe('ensureContrast', () => {
  it('leaves a color alone when it already passes', () => {
    expect(ensureContrast('#222222', '#ffffff')).toBe('#222222');
  });

  it('nudges a failing color until it passes, keeping its hue family', () => {
    // Pale yellow on white fails badly; the nudge darkens it rather than swapping to black.
    const nudged = ensureContrast('#f6e05e', '#ffffff');
    expect(contrastRatio(nudged, '#ffffff')).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    expect(nudged).not.toBe('#000000');
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(nudged.slice(i, i + 2), 16)) as [number, number, number];
    expect(r).toBeGreaterThan(b); // still yellowish, not grey
    expect(g).toBeGreaterThan(b);
  });

  it('nudges toward white on a dark background', () => {
    const nudged = ensureContrast('#2b6cb0', '#101010');
    expect(contrastRatio(nudged, '#101010')).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  it.each(backgrounds)('guarantees 4.5:1 for any starting color on %s', (bg) => {
    for (const fg of backgrounds) {
      expect(contrastRatio(ensureContrast(fg, bg), bg)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    }
  });
});

describe('ensureContrast against several backgrounds at once', () => {
  it('reaches 4.5:1 on every one of them', () => {
    const bgs = ['#ffffff', '#e8e8e8', '#d0d0d0'];
    const nudged = ensureContrast('#f6e05e', bgs);
    for (const bg of bgs) expect(contrastRatio(nudged, bg)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });
});
