import { describe, expect, it } from 'vitest';
import type { Colorway } from '../domain/types';
import { searchColorways } from './search';

const cw = (id: string, name: string): Colorway => ({
  id,
  name,
  palette: { body: '#112233' },
  sampled: true,
  sources: [],
  offerings: [],
});

const list = [cw('a', 'Plaid and Simple'), cw('b', "Pinky's Promise"), cw('c', 'Read My Lips'), cw('d', '90s Kid')];

describe('searchColorways', () => {
  it('returns every colorway, in order, for an empty or blank search', () => {
    expect(searchColorways(list, '')).toEqual(list);
    expect(searchColorways(list, '   ')).toEqual(list);
  });

  it('matches part of a name, ignoring case', () => {
    expect(searchColorways(list, 'LIPS').map((c) => c.id)).toEqual(['c']);
    expect(searchColorways(list, 'pla').map((c) => c.id)).toEqual(['a']);
  });

  it('matches every word typed, in any order', () => {
    expect(searchColorways(list, 'simple plaid').map((c) => c.id)).toEqual(['a']);
    expect(searchColorways(list, 'plaid zebra')).toEqual([]);
  });

  it('ignores apostrophes and punctuation on both sides', () => {
    expect(searchColorways(list, 'pinkys').map((c) => c.id)).toEqual(['b']);
    expect(searchColorways(list, "pinky's").map((c) => c.id)).toEqual(['b']);
  });

  it('puts names that start with the search before names that only contain it', () => {
    const l = [cw('x', 'Sea Lips'), cw('y', 'Lips Gloss')];
    expect(searchColorways(l, 'lips').map((c) => c.id)).toEqual(['y', 'x']);
  });
});
