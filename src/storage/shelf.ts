// The ONE storage module (ADR 0002). The rest of the app talks only to a Shelf from here;
// nothing else imports Dexie or touches IndexedDB (an ESLint rule enforces it).
// Swapping or syncing storage later means changing this file, not the app.
import Dexie, { type EntityTable } from 'dexie';
import type { Bottle, NewBottle } from '../domain/types';

export interface Shelf {
  /** Add a Bottle. The first Bottle added to an empty Shelf becomes the Active bottle. */
  addBottle(input: NewBottle): Promise<Bottle>;
  /** All Bottles, oldest first. */
  listBottles(): Promise<Bottle[]>;
  /** Remove a Bottle (no-op if absent). Removing the Active bottle hands the role to the oldest remaining one. */
  removeBottle(id: string): Promise<void>;
  /** Choose the Active bottle. Throws if that Bottle is not on the Shelf. */
  setActiveBottle(id: string): Promise<void>;
  /** The Active bottle, or null when the Shelf is empty. */
  getActiveBottle(): Promise<Bottle | null>;
  /** Close the database connection. */
  close(): void;
}

interface MetaRow {
  key: string;
  value: string;
}

class ShelfDatabase extends Dexie {
  bottles!: EntityTable<Bottle, 'id'>;
  meta!: EntityTable<MetaRow, 'key'>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({ bottles: 'id, addedAt', meta: 'key' });
  }
}

const ACTIVE_KEY = 'activeBottleId';

export const DEFAULT_DB_NAME = 'sip-shelf';

/** Open (creating if needed) the Shelf stored in the browser database `dbName`. */
export function openShelf(dbName: string = DEFAULT_DB_NAME): Shelf {
  const db = new ShelfDatabase(dbName);

  const oldestFirst = () => db.bottles.orderBy('addedAt').toArray();

  async function activeId(): Promise<string | null> {
    return (await db.meta.get(ACTIVE_KEY))?.value ?? null;
  }

  return {
    addBottle(input) {
      return db.transaction('rw', db.bottles, db.meta, async () => {
        // addedAt must strictly increase so "oldest first" is unambiguous even for rapid adds.
        const newest = await db.bottles.orderBy('addedAt').last();
        const addedAt = Math.max(Date.now(), (newest?.addedAt ?? 0) + 1);
        const nickname = input.nickname?.trim() || undefined;
        const bottle: Bottle = {
          id: crypto.randomUUID(),
          modelId: input.modelId,
          sizeOz: input.sizeOz,
          colorway: input.colorway,
          ...(nickname ? { nickname } : {}),
          overrides: input.overrides ?? {},
          addedAt,
        };
        await db.bottles.add(bottle);
        if ((await activeId()) === null) await db.meta.put({ key: ACTIVE_KEY, value: bottle.id });
        return bottle;
      });
    },

    listBottles: oldestFirst,

    removeBottle(id) {
      return db.transaction('rw', db.bottles, db.meta, async () => {
        await db.bottles.delete(id);
        if ((await activeId()) !== id) return;
        const next = (await oldestFirst())[0];
        if (next) await db.meta.put({ key: ACTIVE_KEY, value: next.id });
        else await db.meta.delete(ACTIVE_KEY);
      });
    },

    setActiveBottle(id) {
      return db.transaction('rw', db.bottles, db.meta, async () => {
        if (!(await db.bottles.get(id))) throw new Error(`Bottle ${id} is not on the shelf`);
        await db.meta.put({ key: ACTIVE_KEY, value: id });
      });
    },

    async getActiveBottle() {
      const id = await activeId();
      return (id && (await db.bottles.get(id))) || null;
    },

    close() {
      db.close();
    },
  };
}
