import { useState } from 'react';
import type { Bottle, Catalog } from '../../domain/types';
import { describeBottle } from '../describeBottle';
import { BottleArt } from '../ui/BottleArt';
import { PlusIcon } from '../ui/icons';
import { ScreenHeader } from '../ui/ScreenHeader';
import { BottleSheet } from './BottleSheet';

const PER_ROW = 3;

type Slot = { kind: 'bottle'; bottle: Bottle } | { kind: 'add' };

function rowsOf(slots: Slot[]): Slot[][] {
  const rows: Slot[][] = [];
  for (let i = 0; i < slots.length; i += PER_ROW) rows.push(slots.slice(i, i + PER_ROW));
  return rows;
}

function subtitle(bottles: Bottle[], active: Bottle | null, catalog: Catalog): string {
  if (bottles.length === 0) return 'No bottles yet';
  const count = `${bottles.length} ${bottles.length === 1 ? 'bottle' : 'bottles'}`;
  return active ? `${count} · ${describeBottle(active, catalog).title} is Active` : count;
}

/** The Shelf: every registered Bottle standing on a plank, the Active one wearing a sticker, and an empty slot to add more. */
export function ShelfScreen({
  catalog,
  bottles,
  active,
  onAdd,
  onSetActive,
  onRemove,
}: {
  catalog: Catalog;
  bottles: Bottle[];
  active: Bottle | null;
  onAdd(): void;
  onSetActive(id: string): Promise<void>;
  onRemove(id: string): Promise<void>;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const opened = bottles.find((b) => b.id === openId) ?? null;
  const slots: Slot[] = [...bottles.map((bottle): Slot => ({ kind: 'bottle', bottle })), { kind: 'add' }];

  async function run(action: () => Promise<void>) {
    setOpenId(null);
    await action();
  }

  const nextActive = opened ? bottles.find((b) => b.id !== opened.id) : undefined;

  return (
    <section className="screen" aria-labelledby="shelf-heading">
      <ScreenHeader
        title="My Shelf"
        titleId="shelf-heading"
        subtitle={subtitle(bottles, active, catalog)}
        right={
          <button type="button" className="round-button" aria-label="Add a bottle" onClick={onAdd}>
            <PlusIcon />
          </button>
        }
      />

      {bottles.length === 0 ? (
        <p className="empty-shelf">Your shelf is empty. Stand your first bottle here.</p>
      ) : null}

      <div className="shelves">
        {rowsOf(slots).map((row, r) => (
          <div className="shelf-row" key={r}>
            <div className="plank" aria-hidden="true" />
            <div className="shelf-grid">
              {row.map((slot) => {
                if (slot.kind === 'add') {
                  return (
                    <button type="button" className="slot slot-add" key="add" onClick={onAdd}>
                      <span className="slot-art">
                        <span className="add-outline">
                          <PlusIcon />
                        </span>
                      </span>
                      <span className="slot-name plain">Add bottle</span>
                    </button>
                  );
                }
                const { bottle } = slot;
                const isActive = active?.id === bottle.id;
                const description = describeBottle(bottle, catalog);
                return (
                  <button
                    type="button"
                    className="slot"
                    key={bottle.id}
                    aria-label={isActive ? `${description.summary}, Active` : description.summary}
                    aria-haspopup="dialog"
                    onClick={() => setOpenId(bottle.id)}
                  >
                    <span className="slot-art">
                      <BottleArt colors={description.palette} width={isActive ? 64 : 56} height={isActive ? 128 : 112} />
                    </span>
                    {isActive ? <span className="sticker">Active</span> : null}
                    <span className="slot-name">{description.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="fine-print">
        Sip Shelf is not affiliated with Owala. Colors are our own measurements, not Owala&apos;s.
      </p>

      {opened ? (
        <BottleSheet
          description={describeBottle(opened, catalog)}
          isActive={active?.id === opened.id}
          nextActiveTitle={nextActive ? describeBottle(nextActive, catalog).title : null}
          onMakeActive={() => void run(() => onSetActive(opened.id))}
          onRemove={() => void run(() => onRemove(opened.id))}
          onClose={() => setOpenId(null)}
        />
      ) : null}
    </section>
  );
}
