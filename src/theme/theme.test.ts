import { describe, expect, it } from 'vitest';
import type { Palette } from '../domain/types';
import { contrastRatio, luminance } from './contrast';
import { MIN_TEXT_CONTRAST } from './readable';
import { buildTheme, resolvePalette, type Scheme } from './theme';

const palettes: Palette[] = [
  { body: '#2b6cb0', lid: '#f6e05e', accent: '#e53e3e' },
  { body: '#f6e05e', lid: '#ffffff', accent: '#fefcbf' }, // pale on pale: the hard case
  { body: '#1a202c', lid: '#2d3748', accent: '#4a5568' }, // dark on dark
  { body: '#808080' }, // lid and accent missing
  { body: '#ff69b4', lid: '#4fd1c5', accent: '#9f7aea' },
];
const schemes: Scheme[] = ['light', 'dark'];

describe('resolvePalette', () => {
  it('fills a missing lid from the body and a missing accent from the lid', () => {
    expect(resolvePalette({ body: '#112233' })).toEqual({ body: '#112233', lid: '#112233', accent: '#112233' });
    expect(resolvePalette({ body: '#112233', lid: '#445566' }).accent).toBe('#445566');
  });

  it('replaces only the slots a person overrode', () => {
    const resolved = resolvePalette({ body: '#112233', lid: '#445566', accent: '#778899' }, { lid: '#ABCDEF' });
    expect(resolved).toEqual({ body: '#112233', lid: '#abcdef', accent: '#778899' });
  });

  it('normalises 3-digit hex to lowercase 6-digit', () => {
    expect(resolvePalette({ body: '#FA0' }).body).toBe('#ffaa00');
  });

  it('rejects an override that is not a color', () => {
    expect(() => resolvePalette({ body: '#112233' }, { lid: 'red' })).toThrow();
  });
});

describe('buildTheme', () => {
  it('uses the body color as primary, the lid as secondary, the accent as accent', () => {
    const vars = buildTheme({ body: '#2b6cb0', lid: '#f6e05e', accent: '#e53e3e' }, 'light');
    expect(vars['--color-primary']).toBe('#2b6cb0');
    expect(vars['--color-secondary']).toBe('#f6e05e');
    expect(vars['--color-accent']).toBe('#e53e3e');
  });

  it.each(palettes.flatMap((p) => schemes.map((s) => [JSON.stringify(p), p, s] as const)))(
    'every text color reads at 4.5:1 or better: %s in %s',
    (_name, palette, scheme) => {
      const v = buildTheme(palette, scheme);
      const pairs: [string, string][] = [
        ['--color-text', '--color-bg'],
        ['--color-text', '--color-surface'],
        ['--color-text', '--color-paper'],
        ['--color-link', '--color-paper'],
        ['--color-link', '--color-bg'],
        ['--color-link', '--color-surface'],
        ['--color-on-primary', '--color-primary'],
        ['--color-on-secondary', '--color-secondary'],
        ['--color-on-accent', '--color-accent'],
      ];
      for (const [fg, bg] of pairs) {
        expect(contrastRatio(v[fg] as string, v[bg] as string), `${fg} on ${bg}`).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
      }
    },
  );

  it('has a light page in light mode and a dark page in dark mode', () => {
    for (const p of palettes) {
      expect(luminance(buildTheme(p, 'light')['--color-bg'] as string)).toBeGreaterThan(0.6);
      expect(luminance(buildTheme(p, 'dark')['--color-bg'] as string)).toBeLessThan(0.1);
    }
  });

  it('gives cards and chips a paper color: white in light mode, the surface in dark mode', () => {
    expect(buildTheme({ body: '#123456' }, 'light')['--color-paper']).toBe('#ffffff');
    const dark = buildTheme({ body: '#123456' }, 'dark');
    expect(dark['--color-paper']).toBe(dark['--color-surface']);
  });

  it('tints the page with the body color', () => {
    const blue = buildTheme({ body: '#0000ff' }, 'light')['--color-bg'];
    const red = buildTheme({ body: '#ff0000' }, 'light')['--color-bg'];
    expect(blue).not.toBe(red);
  });

  it('declares which schemes the page supports so form controls follow', () => {
    expect(buildTheme({ body: '#123456' }, 'dark')['color-scheme']).toBe('dark');
    expect(buildTheme({ body: '#123456' }, 'light')['color-scheme']).toBe('light');
  });
});

describe('buildTheme across the whole color space', () => {
  it('never produces text below 4.5:1, for a grid of 4,096 body colors in both schemes', () => {
    const steps = [0, 17, 34, 51, 68, 85, 102, 119, 136, 153, 170, 187, 204, 221, 238, 255];
    const hex = (n: number) => n.toString(16).padStart(2, '0');
    let checked = 0;
    for (const r of steps) for (const g of steps) for (const b of steps) {
      const color = `#${hex(r)}${hex(g)}${hex(b)}`;
      for (const scheme of schemes) {
        const v = buildTheme({ body: color, lid: color, accent: color }, scheme);
        for (const bg of ['--color-bg', '--color-surface']) {
          expect(contrastRatio(v['--color-text'] as string, v[bg] as string)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
          expect(contrastRatio(v['--color-link'] as string, v[bg] as string)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
        }
        for (const fg of ['--color-text', '--color-link']) {
          expect(contrastRatio(v[fg] as string, v['--color-paper'] as string)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
        }
        expect(contrastRatio(v['--color-on-primary'] as string, color)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
        checked++;
      }
    }
    expect(checked).toBe(8192);
  });
});
