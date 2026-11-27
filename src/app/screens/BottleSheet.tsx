import { useEffect, useRef, useState } from 'react';
import type { BottleDescription } from '../describeBottle';
import { BottleArt } from '../ui/BottleArt';
import { CloseIcon } from '../ui/icons';

/**
 * A pull-up sheet for one Bottle on the Shelf: make it the Active bottle, or take it off the Shelf
 * (after asking). A native dialog, so it traps focus and closes on Escape.
 */
export function BottleSheet({
  description,
  isActive,
  nextActiveTitle,
  onMakeActive,
  onRemove,
  onClose,
}: {
  description: BottleDescription;
  isActive: boolean;
  /** Who inherits the Active role if this Bottle is removed (null when it is not Active or is the last one). */
  nextActiveTitle: string | null;
  onMakeActive(): void;
  onRemove(): void;
  onClose(): void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [confirming, setConfirming] = useState(false);

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
        <BottleArt colors={description.palette} width={84} height={168} />
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
