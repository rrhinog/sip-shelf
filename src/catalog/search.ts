import type { Colorway } from '../domain/types';

/** Lowercase, with apostrophes and other punctuation dropped, so "Pinky's" and "pinkys" match. */
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/**
 * The colorways whose name contains every word typed (any order, any case, punctuation ignored).
 * Names that start with the search come first; otherwise Catalog order is kept.
 * A blank search returns everything.
 */
export function searchColorways(colorways: Colorway[], query: string): Colorway[] {
  const q = normalise(query);
  if (q === '') return colorways;
  const words = q.split(' ');
  const hits: Colorway[] = [];
  const startsWith: Colorway[] = [];
  for (const c of colorways) {
    const name = normalise(c.name);
    if (!words.every((w) => name.includes(w))) continue;
    (name.startsWith(q) ? startsWith : hits).push(c);
  }
  return [...startsWith, ...hits];
}
