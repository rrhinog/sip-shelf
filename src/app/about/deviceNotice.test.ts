import { beforeEach, describe, expect, it } from 'vitest';
import { hasSeenDeviceNotice, markDeviceNoticeSeen } from './deviceNotice';

describe('device-only notice memory', () => {
  beforeEach(() => localStorage.clear());

  it('has not been seen on a fresh device', () => {
    expect(hasSeenDeviceNotice()).toBe(false);
  });

  it('is seen for good once marked, including after a reload of the module state', () => {
    markDeviceNoticeSeen();
    expect(hasSeenDeviceNotice()).toBe(true);
    expect(hasSeenDeviceNotice()).toBe(true);
  });

  it('stays quiet (treats it as seen) when storage is unavailable, so the notice never nags', () => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error('blocked');
    };
    try {
      expect(hasSeenDeviceNotice()).toBe(true);
    } finally {
      Storage.prototype.getItem = original;
    }
  });

  it('does not throw when storage refuses the write', () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error('quota');
    };
    try {
      expect(() => markDeviceNoticeSeen()).not.toThrow();
    } finally {
      Storage.prototype.setItem = original;
    }
  });
});
