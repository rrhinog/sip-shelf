import { useCallback, useEffect, useRef, useState } from 'react';
import type { Overrides, PaletteSlot } from '../../domain/types';
import { resetOverride, setOverride } from '../../theme/overrides';
import { resolvePalette } from '../../theme/theme';
import type { BottleDescription } from '../describeBottle';
import { BottleArt } from '../ui/BottleArt';
import { CloseIcon } from '../ui/icons';
import { ColorOverrides } from './ColorOverrides';

/** How long after the last step of a color being picked it is saved, if the picker sent no closing event. */
const SAVE_AFTER_MS = 600;

/**
 * A pull-up sheet for one Bottle on the Shelf: set or reset its colors (Overrides) with a live preview,
 * make it the Active bottle, or take it off the Shelf (after asking). A native dialog, so it traps focus and closes on Escape.
 */
export function BottleSheet({
  description,
  overrides: savedOverrides,
  isActive,
  nextActiveTitle,
  onMakeActive,
  onSetOverrides,
  onRemove,
  onClose,
}: {
  description: BottleDescription;
  /** The Bottle's saved Overrides; the sheet keeps its own copy while it is open. */
  overrides: Overrides;
  isActive: boolean;
  /** Who inherits the Active role if this Bottle is removed (null when it is not Active or is the last one). */
  nextActiveTitle: string | null;
  onMakeActive(): void;
  /** Save the Bottle's Overrides (all of them; {} resets every color). */
  onSetOverrides(overrides: Overrides): Promise<void>;
  onRemove(): void;
  onClose(): void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [confirming, setConfirming] = useState(false);
  // The sheet's own copy of the Overrides: it drives the preview while a color is being picked, then is saved.
  const [overrides, setOverrides] = useState(savedOverrides);
  const latest = useRef(overrides);
  // A color being dragged is saved when the picker closes (a change event), or soon after the last step
  // when a phone sends none, or when the sheet closes: whichever comes first.
  const unsaved = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const save = useRef(onSetOverrides);
  useEffect(() => {
    save.current = onSetOverrides;
  });
  const flush = useCallback(() => {
    clearTimeout(timer.current);
    if (!unsaved.current) return;
    unsaved.current = false;
    void save.current(latest.current);
  }, []);
  useEffect(() => flush, [flush]);
  const palette = resolvePalette(description.basePalette, overrides);

  function change(next: Overrides, save: boolean) {
    latest.current = next;
    setOverrides(next);
    unsaved.current = true;
    clearTimeout(timer.current);
    if (save) flush();
    else timer.current = setTimeout(flush, SAVE_AFTER_MS);
  }
  const pick = (slot: PaletteSlot, color: string, save: boolean) =>
    change(setOverride(latest.current, slot, color, description.basePalette), save);

  useEffect(() => {
    const el = dialog.current;
    if (el && !el.open) el.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      className="sheet"
      aria-labelledby="sheet-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
    >
      <div className="sheet-top">
        <button type="button" className="round-button" aria-label="Close" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>
      <div className="sheet-art">
        <BottleArt colors={palette} width={84} height={168} />
      </div>
      {confirming ? (
        <>
          <h2 id="sheet-title">Take {description.title} off your shelf?</h2>
          <p className="sheet-detail">
            This can&apos;t be undone.
            {isActive && nextActiveTitle ? ` ${nextActiveTitle} will become your Active bottle.` : ''}
          </p>
          <div className="sheet-actions">
            <button type="button" className="big-button" onClick={onClose}>
              Keep it
            </button>
            <button type="button" className="big-button danger" onClick={onRemove}>
              Yes, remove it
            </button>
          </div>
        </>
      ) : (
        <>
          <h2 id="sheet-title">{description.title}</h2>
          <p className="sheet-detail">
            {description.colorwayName !== description.title ? `${description.colorwayName} · ` : ''}
            {description.detail}
          </p>
          {!description.sampled ? (
            <p className="sheet-detail">Colors not sampled yet, so this bottle shows a neutral color.</p>
          ) : null}
          <ColorOverrides
            palette={palette}
            overrides={overrides}
            custom={description.custom}
            onPick={(slot, color) => pick(slot, color, false)}
            onCommit={(slot, color) => pick(slot, color, true)}
            onReset={(slot) => change(resetOverride(latest.current, slot), true)}
          />
          <div className="sheet-actions">
            {isActive ? (
              <p className="sheet-active-note">This is your Active bottle.</p>
            ) : (
              <button type="button" className="big-button primary" onClick={onMakeActive}>
                Make Active
              </button>
            )}
            <button type="button" className="big-button danger-outline" onClick={() => setConfirming(true)}>
              Remove from shelf
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}
