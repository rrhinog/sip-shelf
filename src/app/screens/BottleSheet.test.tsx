import { readFileSync } from 'node:fs';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseCatalog } from '../../catalog/catalog';
import type { Bottle, Overrides } from '../../domain/types';
import { describeBottle } from '../describeBottle';
import { BottleSheet } from './BottleSheet';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom has no modal dialogs; the sheet only needs showModal to exist.
HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) {
  this.setAttribute('open', '');
};

const catalog = parseCatalog(JSON.parse(readFileSync('src/catalog/catalog.fixture.json', 'utf8')) as unknown);
const lagoon: Bottle = {
  id: 'b1',
  modelId: 'fixture-freesip',
  sizeOz: 24,
  colorway: { kind: 'catalog', colorwayId: 'fixture-lagoon' }, // body #2f7fa8, lid #f2d16b, accent #e0645c
  overrides: {},
  addedAt: 1,
};

let host: HTMLElement;
let root: Root;
const onSetOverrides = vi.fn<(o: Overrides) => Promise<void>>(async () => undefined);

function mount(bottle: Bottle = lagoon) {
  act(() =>
    root.render(
      <BottleSheet
        description={describeBottle(bottle, catalog)}
        overrides={bottle.overrides}
        isActive={false}
        nextActiveTitle={null}
        onMakeActive={() => undefined}
        onSetOverrides={onSetOverrides}
        onRemove={() => undefined}
        onClose={() => undefined}
      />,
    ),
  );
}

const row = (slot: 'body' | 'lid' | 'accent') => host.querySelector<HTMLElement>(`[data-slot="${slot}"]`)!;
const input = (slot: 'body' | 'lid' | 'accent') => row(slot).querySelector<HTMLInputElement>('input[type="color"]')!;
const reset = (slot: 'body' | 'lid' | 'accent') => host.querySelector<HTMLButtonElement>(`button[aria-label="Reset ${slot}"]`);
const previewColors = () =>
  [...host.querySelectorAll('.sheet-art svg *')].map((el) => el.getAttribute('fill')).filter((f) => f && f !== 'none');

/** What the phone's color picker does: input events while dragging, one change event when it closes. */
function pick(el: HTMLInputElement, color: string, { commit = true } = {}) {
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  act(() => {
    set.call(el, color);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  if (commit) act(() => el.dispatchEvent(new Event('change', { bubbles: true })));
}

beforeEach(() => {
  onSetOverrides.mockClear();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('the bottle sheet’s colors', () => {
  it('lists body, lid and accent with their current color, each marked as the Catalog’s', () => {
    mount();
    expect(input('body').value).toBe('#2f7fa8');
    expect(input('lid').value).toBe('#f2d16b');
    expect(input('accent').value).toBe('#e0645c');
    for (const slot of ['body', 'lid', 'accent'] as const) {
      expect(row(slot).textContent).toContain('Catalog color');
      expect(reset(slot)).toBeNull();
    }
  });

  it('labels each color input for screen readers', () => {
    mount();
    expect(input('body').getAttribute('aria-label')).toBe('Body color');
    expect(input('lid').getAttribute('aria-label')).toBe('Lid color');
    expect(input('accent').getAttribute('aria-label')).toBe('Accent color');
  });

  it('shows an Override as the person’s own color, with a Reset', () => {
    mount({ ...lagoon, overrides: { lid: '#112233' } });
    expect(input('lid').value).toBe('#112233');
    expect(row('lid').textContent).toContain('Your color');
    expect(reset('lid')).not.toBeNull();
    expect(row('body').textContent).toContain('Catalog color');
  });

  it('previews a color live while it is being picked, and saves nothing until the picker closes', () => {
    mount();
    pick(input('body'), '#00aa00', { commit: false });
    expect(previewColors()).toContain('#00aa00');
    expect(row('body').textContent).toContain('Your color');
    expect(onSetOverrides).not.toHaveBeenCalled();
  });

  it('saves the Overrides when the picker closes', () => {
    mount();
    pick(input('accent'), '#00aa00');
    expect(onSetOverrides).toHaveBeenCalledTimes(1);
    expect(onSetOverrides).toHaveBeenLastCalledWith({ accent: '#00aa00' });
    pick(input('body'), '#123456');
    expect(onSetOverrides).toHaveBeenLastCalledWith({ accent: '#00aa00', body: '#123456' });
  });

  it('also saves a moment after the last step if the phone sends no closing event', () => {
    vi.useFakeTimers();
    try {
      mount();
      pick(input('lid'), '#112233', { commit: false });
      pick(input('lid'), '#112244', { commit: false });
      expect(onSetOverrides).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(1000));
      expect(onSetOverrides).toHaveBeenCalledTimes(1);
      expect(onSetOverrides).toHaveBeenLastCalledWith({ lid: '#112244' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('saves a color still being picked when the sheet closes', () => {
    mount();
    pick(input('lid'), '#112233', { commit: false });
    act(() => root.render(<span />));
    expect(onSetOverrides).toHaveBeenLastCalledWith({ lid: '#112233' });
  });

  it('resets one color to the Catalog’s and saves, leaving the other Overrides', () => {
    mount({ ...lagoon, overrides: { lid: '#112233', body: '#223344' } });
    act(() => reset('lid')!.click());
    expect(onSetOverrides).toHaveBeenLastCalledWith({ body: '#223344' });
    expect(input('lid').value).toBe('#f2d16b');
    expect(row('lid').textContent).toContain('Catalog color');
    expect(reset('lid')).toBeNull();
    expect(reset('body')).not.toBeNull();
  });

  it('calls a Custom colorway’s colors its own, not the Catalog’s', () => {
    mount({ ...lagoon, colorway: { kind: 'custom', name: 'Mine', palette: { body: '#123456' } } });
    expect(row('body').textContent).toContain('Colorway color');
    expect(row('body').textContent).not.toContain('Catalog');
  });
});
