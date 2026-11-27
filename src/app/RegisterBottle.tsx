import { useState, type FormEvent } from 'react';
import { colorwaysFor, sizesFor } from '../catalog/catalog';
import type { Catalog, NewBottle } from '../domain/types';

/** Register a Bottle: Model, then Size, then Colorway, then an optional nickname. */
export function RegisterBottle({ catalog, onAdd }: { catalog: Catalog; onAdd(bottle: NewBottle): Promise<void> }) {
  const [modelId, setModelId] = useState('');
  const [sizeOz, setSizeOz] = useState('');
  const [colorwayId, setColorwayId] = useState('');
  const [nickname, setNickname] = useState('');

  const sizes = modelId ? sizesFor(catalog, modelId) : [];
  const colorways = modelId && sizeOz ? colorwaysFor(catalog, modelId, Number(sizeOz)) : [];

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!modelId || !sizeOz || !colorwayId) return;
    const bottle: NewBottle = {
      modelId,
      sizeOz: Number(sizeOz),
      colorway: { kind: 'catalog', colorwayId },
      ...(nickname.trim() ? { nickname } : {}),
    };
    // Clear the form first, so anything typed while the save finishes is not wiped afterwards.
    setModelId('');
    setSizeOz('');
    setColorwayId('');
    setNickname('');
    await onAdd(bottle);
  }

  return (
    <form onSubmit={submit} aria-label="Register a bottle">
      <h2>Register a bottle</h2>
      <p>
        <label>
          Model{' '}
          <select
            value={modelId}
            onChange={(e) => {
              setModelId(e.target.value);
              setSizeOz('');
              setColorwayId('');
            }}
          >
            <option value="">Choose a model</option>
            {catalog.models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      </p>
      <p>
        <label>
          Size{' '}
          <select
            value={sizeOz}
            disabled={!modelId}
            onChange={(e) => {
              setSizeOz(e.target.value);
              setColorwayId('');
            }}
          >
            <option value="">Choose a size</option>
            {sizes.map((s) => (
              <option key={s} value={s}>
                {s} oz
              </option>
            ))}
          </select>
        </label>
      </p>
      <p>
        <label>
          Colorway{' '}
          <select value={colorwayId} disabled={!sizeOz} onChange={(e) => setColorwayId(e.target.value)}>
            <option value="">Choose a colorway</option>
            {colorways.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </p>
      <p>
        <label>
          Nickname (optional) <input value={nickname} onChange={(e) => setNickname(e.target.value)} />
        </label>
      </p>
      <button type="submit" className="primary" disabled={!colorwayId}>
        Add to shelf
      </button>
    </form>
  );
}
