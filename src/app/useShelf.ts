import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Bottle, NewBottle } from '../domain/types';
import { openShelf } from '../storage/shelf';

export interface ShelfState {
  loaded: boolean;
  bottles: Bottle[];
  active: Bottle | null;
  add(input: NewBottle): Promise<void>;
  remove(id: string): Promise<void>;
  setActive(id: string): Promise<void>;
}

/** The Shelf as React state. Every change goes through the storage module, then re-reads it. */
export function useShelf(): ShelfState {
  const shelf = useMemo(() => openShelf(), []);
  const [loaded, setLoaded] = useState(false);
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [active, setActiveBottle] = useState<Bottle | null>(null);

  const refresh = useCallback(async () => {
    const [list, current] = await Promise.all([shelf.listBottles(), shelf.getActiveBottle()]);
    setBottles(list);
    setActiveBottle(current);
    setLoaded(true);
  }, [shelf]);

  useEffect(() => {
    // Initial read from IndexedDB; state is only set after the read resolves, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  return {
    loaded,
    bottles,
    active,
    add: async (input) => {
      await shelf.addBottle(input);
      await refresh();
    },
    remove: async (id) => {
      await shelf.removeBottle(id);
      await refresh();
    },
    setActive: async (id) => {
      await shelf.setActiveBottle(id);
      await refresh();
    },
  };
}
