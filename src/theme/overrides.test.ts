import { describe, expect, it } from 'vitest';
import { resetOverride, setOverride } from './overrides';

const base = { body: '#2f7fa8', lid: '#f2d16b', accent: '#e0645c' };

describe('setOverride', () => {
  it('sets one color and leaves the others as they were', () => {
    expect(setOverride({ lid: '#111111' }, 'body', '#223344', base)).toEqual({ lid: '#111111', body: '#223344' });
  });

  it('writes the color as lowercase #rrggbb', () => {
    expect(setOverride({}, 'accent', '#ABC', base)).toEqual({ accent: '#aabbcc' });
  });

  it('is no Override at all when the color is the Palette’s own, so the slot reads as the Catalog’s', () => {
    expect(setOverride({ lid: '#111111' }, 'lid', '#F2D16B', base)).toEqual({});
  });

  it('does not change the Overrides it was given', () => {
    const before = { lid: '#111111' };
    setOverride(before, 'body', '#223344', base);
    expect(before).toEqual({ lid: '#111111' });
  });

  it('rejects something that is not a color', () => {
    expect(() => setOverride({}, 'body', 'blue', base)).toThrow(/hex color/i);
  });
});

describe('resetOverride', () => {
  it('removes one Override and keeps the rest', () => {
    expect(resetOverride({ body: '#223344', lid: '#111111' }, 'body')).toEqual({ lid: '#111111' });
  });

  it('is fine when the slot was not overridden', () => {
    expect(resetOverride({ lid: '#111111' }, 'body')).toEqual({ lid: '#111111' });
  });
});
