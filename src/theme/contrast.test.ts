import { describe, expect, it } from 'vitest';
import { contrastRatio } from './contrast';

describe('contrastRatio', () => {
  it('is 21 for black on white, in either order', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5);
  });

  it('is 1 for a color against itself', () => {
    expect(contrastRatio('#2b6cb0', '#2b6cb0')).toBeCloseTo(1, 5);
  });

  it('matches the well-known grey-on-white boundary of 4.5:1', () => {
    // #767676 on white is the lightest grey that passes (4.54); #777777 just fails (4.48).
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  });

  it('accepts 3-digit hex and any letter case', () => {
    expect(contrastRatio('#FFF', '#000')).toBeCloseTo(21, 5);
  });

  it('rejects text that is not a hex color', () => {
    expect(() => contrastRatio('blue', '#fff')).toThrow();
  });
});
