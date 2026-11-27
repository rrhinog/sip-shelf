import { useEffect, useRef, useState } from 'react';
import { hasSeenDeviceNotice, markDeviceNoticeSeen } from './deviceNotice';
import './about.css';

export type DeviceOnlyNoticeProps = {
  /** Called once, right after the person dismisses the notice. */
  onDismiss?: () => void;
};

/**
 * One-time notice (ADR 0002): the Shelf lives only on this device.
 * Shows until dismissed, then never again on this device.
 */
export function DeviceOnlyNotice({ onDismiss }: DeviceOnlyNoticeProps) {
  const [open, setOpen] = useState(() => !hasSeenDeviceNotice());
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) button.current?.focus();
  }, [open]);

  if (!open) return null;

  function dismiss() {
    markDeviceNoticeSeen();
    setOpen(false);
    onDismiss?.();
  }

  return (
    <div className="notice-scrim">
      <div className="notice-card" role="dialog" aria-modal="true" aria-labelledby="device-notice-title" aria-describedby="device-notice-body">
        <span className="notice-sticker" aria-hidden="true">
          Heads up
        </span>
        <h2 id="device-notice-title">Your Shelf lives only on this device</h2>
        <p id="device-notice-body">
          Sip Shelf has no accounts and no cloud. Your bottles are saved in this browser, on this phone. Clearing your
          browser data or switching phones loses your Shelf.
        </p>
        <button ref={button} type="button" className="about-button" onClick={dismiss}>
          Got it
        </button>
      </div>
    </div>
  );
}
