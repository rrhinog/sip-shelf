import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeviceOnlyNotice } from './DeviceOnlyNotice';
import { hasSeenDeviceNotice, markDeviceNoticeSeen } from './deviceNotice';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLElement;
let root: Root;

function mount(onDismiss?: () => void) {
  act(() => root.render(<DeviceOnlyNotice onDismiss={onDismiss} />));
}

beforeEach(() => {
  localStorage.clear();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('DeviceOnlyNotice', () => {
  it('tells a new person the Shelf lives only on this device and what loses it', () => {
    mount();
    const text = host.textContent ?? '';
    expect(text).toContain('only on this device');
    expect(text).toMatch(/clearing (your )?browser data/i);
    expect(text).toMatch(/switching phones/i);
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('is dismissed for good: the button hides it, remembers it, and a remount stays empty', () => {
    const onDismiss = vi.fn();
    mount(onDismiss);
    const button = host.querySelector('button');
    expect(button?.textContent).toMatch(/got it/i);
    act(() => button?.click());
    expect(host.textContent).toBe('');
    expect(hasSeenDeviceNotice()).toBe(true);
    expect(onDismiss).toHaveBeenCalledTimes(1);

    act(() => root.render(<span />));
    mount();
    expect(host.textContent).toBe('');
  });

  it('shows nothing to someone who already dismissed it', () => {
    markDeviceNoticeSeen();
    mount();
    expect(host.textContent).toBe('');
  });
});
