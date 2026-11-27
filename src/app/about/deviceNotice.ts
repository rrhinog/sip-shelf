// Remembers that the person has dismissed the one-time "your Shelf lives only on this device" notice (ADR 0002).
// A tiny localStorage flag; the Shelf itself stays behind src/storage/shelf.ts.
const KEY = 'sip-shelf:device-notice-seen';

/** True once the notice was dismissed. If storage is unavailable the dismissal could never stick, so report it as seen rather than nag on every visit. */
export function hasSeenDeviceNotice(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return true;
  }
}

export function markDeviceNoticeSeen(): void {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    // Nothing to do: hasSeenDeviceNotice() already reports true when storage is blocked.
  }
}
