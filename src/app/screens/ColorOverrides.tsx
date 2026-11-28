import { useEffect, useRef } from 'react';
import type { Overrides, PaletteSlot } from '../../domain/types';
import type { ResolvedPalette } from '../../theme/theme';

const SLOTS: { slot: PaletteSlot; label: string }[] = [
  { slot: 'body', label: 'Body' },
  { slot: 'lid', label: 'Lid' },
  { slot: 'accent', label: 'Accent' },
];

/**
 * The color input sits invisibly over our round swatch, so a tap opens the phone's own picker.
 * `onPick` runs for every step while dragging (a live preview); `onCommit` once, when the picker closes
 * (the native `change` event), which is when the color is saved.
 */
function ColorInput({
  label,
  value,
  onPick,
  onCommit,
}: {
  label: string;
  value: string;
  onPick(color: string): void;
  onCommit(color: string): void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const commit = useRef(onCommit);
  useEffect(() => {
    commit.current = onCommit;
  });
  useEffect(() => {
    const el = input.current;
    if (!el) return;
    const onChange = () => commit.current(el.value);
    el.addEventListener('change', onChange);
    return () => el.removeEventListener('change', onChange);
  }, []);

  return (
    <span className="color-swatch" style={{ background: value }}>
      <input
        ref={input}
        type="color"
        aria-label={`${label} color`}
        value={value}
        onInput={(e) => onPick(e.currentTarget.value)}
        onChange={() => undefined}
      />
    </span>
  );
}

/**
 * One Bottle's Overrides: for each of body, lid and accent, the color it has now, where that color
 * comes from (the colorway's or the person's own), a picker to change it and a Reset to go back.
 */
export function ColorOverrides({
  palette,
  overrides,
  custom,
  onPick,
  onCommit,
  onReset,
}: {
  /** The colors shown now, Overrides included (a draft while one is being picked). */
  palette: ResolvedPalette;
  overrides: Overrides;
  /** True for a Custom colorway: its colors are the person's own colorway, not the Catalog's. */
  custom: boolean;
  onPick(slot: PaletteSlot, color: string): void;
  onCommit(slot: PaletteSlot, color: string): void;
  onReset(slot: PaletteSlot): void;
}) {
  return (
    <fieldset className="override-set">
      <legend>Colors</legend>
      {SLOTS.map(({ slot, label }) => {
        const overridden = slot in overrides;
        const source = overridden ? 'Your color' : custom ? 'Colorway color' : 'Catalog color';
        return (
          <div className="override-row" data-slot={slot} key={slot}>
            <ColorInput label={label} value={palette[slot]} onPick={(c) => onPick(slot, c)} onCommit={(c) => onCommit(slot, c)} />
            <span className="override-text">
              <span className="override-name">{label}</span>
              <span className="override-source">
                {source} · {palette[slot]}
              </span>
            </span>
            {overridden ? (
              <button type="button" className="dashed-button" aria-label={`Reset ${slot}`} onClick={() => onReset(slot)}>
                Reset
              </button>
            ) : null}
          </div>
        );
      })}
    </fieldset>
  );
}
