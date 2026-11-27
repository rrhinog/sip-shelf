import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { NewBottle } from '../domain/types';
import { openShelf, type Shelf } from './shelf';

let counter = 0;
const freshName = () => `test-shelf-${++counter}`;

const lagoon: NewBottle = {
  modelId: 'fixture-freesip',
  sizeOz: 24,
  colorway: { kind: 'catalog', colorwayId: 'fixture-lagoon' },
};
const meadow: NewBottle = {
  modelId: 'fixture-twist',
  sizeOz: 32,
  colorway: { kind: 'catalog', colorwayId: 'fixture-meadow' },
  nickname: 'Gym bottle',
};

describe('the Shelf', () => {
  let name: string;
  let shelf: Shelf;
  beforeEach(() => {
    name = freshName();
    shelf = openShelf(name);
  });

  it('starts empty, with no Active bottle', async () => {
    expect(await shelf.listBottles()).toEqual([]);
    expect(await shelf.getActiveBottle()).toBeNull();
  });

  it('adds a Bottle and gives it an id, a date and empty Overrides', async () => {
    const bottle = await shelf.addBottle(lagoon);
    expect(bottle.id).toMatch(/\S+/);
    expect(bottle).toMatchObject({ modelId: 'fixture-freesip', sizeOz: 24, overrides: {} });
    expect(bottle.addedAt).toBeGreaterThan(0);
    expect(await shelf.listBottles()).toEqual([bottle]);
  });

  it('gives every Bottle its own id, even two identical bottles', async () => {
    const a = await shelf.addBottle(lagoon);
    const b = await shelf.addBottle(lagoon);
    expect(a.id).not.toBe(b.id);
  });

  it('keeps a Bottle’s nickname, Overrides and Custom colorway exactly as given', async () => {
    const custom = await shelf.addBottle({
      modelId: 'fixture-twist',
      sizeOz: 24,
      colorway: { kind: 'custom', name: 'My lake blue', palette: { body: '#123456', lid: '#abcdef' } },
      nickname: '  Desk  ',
      overrides: { accent: '#ff0000' },
    });
    const [stored] = await shelf.listBottles();
    expect(stored).toEqual(custom);
    expect(stored?.nickname).toBe('Desk');
    expect(stored?.overrides).toEqual({ accent: '#ff0000' });
    expect(stored?.colorway).toEqual({ kind: 'custom', name: 'My lake blue', palette: { body: '#123456', lid: '#abcdef' } });
  });

  it('drops a blank nickname', async () => {
    const bottle = await shelf.addBottle({ ...lagoon, nickname: '   ' });
    expect(bottle.nickname).toBeUndefined();
  });

  it('lists Bottles in the order they were added', async () => {
    const a = await shelf.addBottle(lagoon);
    const b = await shelf.addBottle(meadow);
    const c = await shelf.addBottle(lagoon);
    expect((await shelf.listBottles()).map((x) => x.id)).toEqual([a.id, b.id, c.id]);
  });

  it('makes the first Bottle added the Active bottle, and leaves it so when more are added', async () => {
    const a = await shelf.addBottle(lagoon);
    await shelf.addBottle(meadow);
    expect((await shelf.getActiveBottle())?.id).toBe(a.id);
  });

  it('lets the person choose a different Active bottle', async () => {
    await shelf.addBottle(lagoon);
    const b = await shelf.addBottle(meadow);
    await shelf.setActiveBottle(b.id);
    expect((await shelf.getActiveBottle())?.id).toBe(b.id);
  });

  it('refuses to make a Bottle that is not on the Shelf the Active bottle', async () => {
    const a = await shelf.addBottle(lagoon);
    await expect(shelf.setActiveBottle('ghost')).rejects.toThrow(/not on the shelf/i);
    expect((await shelf.getActiveBottle())?.id).toBe(a.id);
  });

  it('removes a Bottle', async () => {
    const a = await shelf.addBottle(lagoon);
    const b = await shelf.addBottle(meadow);
    await shelf.removeBottle(b.id);
    expect((await shelf.listBottles()).map((x) => x.id)).toEqual([a.id]);
  });

  it('removing a Bottle that is not there changes nothing', async () => {
    const a = await shelf.addBottle(lagoon);
    await shelf.removeBottle('ghost');
    expect((await shelf.listBottles()).map((x) => x.id)).toEqual([a.id]);
  });

  it('hands the Active bottle to the oldest remaining Bottle when the Active bottle is removed', async () => {
    const a = await shelf.addBottle(lagoon);
    const b = await shelf.addBottle(meadow);
    await shelf.addBottle(lagoon);
    await shelf.removeBottle(a.id);
    expect((await shelf.getActiveBottle())?.id).toBe(b.id);
  });

  it('has no Active bottle once the last Bottle is removed, and the next one added becomes Active', async () => {
    const a = await shelf.addBottle(lagoon);
    await shelf.removeBottle(a.id);
    expect(await shelf.getActiveBottle()).toBeNull();
    const b = await shelf.addBottle(meadow);
    expect((await shelf.getActiveBottle())?.id).toBe(b.id);
  });

  it('keeps the Active bottle when a different Bottle is removed', async () => {
    const a = await shelf.addBottle(lagoon);
    const b = await shelf.addBottle(meadow);
    await shelf.removeBottle(b.id);
    expect((await shelf.getActiveBottle())?.id).toBe(a.id);
  });

  it('remembers everything after the Shelf is closed and opened again, ids unchanged', async () => {
    const a = await shelf.addBottle(lagoon);
    const b = await shelf.addBottle(meadow);
    await shelf.setActiveBottle(b.id);
    shelf.close();
    const reopened = openShelf(name);
    expect((await reopened.listBottles()).map((x) => x.id)).toEqual([a.id, b.id]);
    expect((await reopened.getActiveBottle())?.id).toBe(b.id);
  });

  it('keeps separate Shelves separate', async () => {
    await shelf.addBottle(lagoon);
    expect(await openShelf(freshName()).listBottles()).toEqual([]);
  });
});
