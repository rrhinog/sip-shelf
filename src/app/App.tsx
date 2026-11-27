import { useEffect, useState } from 'react';
import { CATALOG_URL, loadCatalog } from '../catalog/catalog';
import type { Bottle, Catalog } from '../domain/types';
import { applyTheme, themeForBottle } from '../theme/forBottle';
import { RegisterBottle } from './RegisterBottle';
import { useColorScheme } from './useColorScheme';
import { useShelf } from './useShelf';

function label(bottle: Bottle, catalog: Catalog): string {
  const { colorway } = bottle;
  const colorwayName =
    colorway.kind === 'custom'
      ? colorway.name
      : (catalog.colorways.find((c) => c.id === colorway.colorwayId)?.name ?? 'Unknown colorway');
  const modelName = catalog.models.find((m) => m.id === bottle.modelId)?.name ?? bottle.modelId;
  const base = `${colorwayName}, ${modelName} ${bottle.sizeOz} oz`;
  return bottle.nickname ? `${bottle.nickname} (${base})` : base;
}

export function App() {
  const shelf = useShelf();
  const scheme = useColorScheme();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCatalog(CATALOG_URL)
      .then(setCatalog)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  // Theme the whole app from the Active bottle, re-applied when it or the phone's light/dark setting changes.
  useEffect(() => {
    if (!catalog || !shelf.loaded) return;
    applyTheme(document.documentElement, themeForBottle(shelf.active, catalog, scheme));
  }, [catalog, shelf.loaded, shelf.active, scheme]);

  if (error) return <main role="alert">{error}</main>;
  if (!catalog || !shelf.loaded) return <main>Loading...</main>;

  return (
    <main>
      <h1>Sip Shelf</h1>
      <section aria-labelledby="shelf-heading">
        <h2 id="shelf-heading">Shelf</h2>
        {shelf.bottles.length === 0 ? (
          <p>No bottles yet. Register one below.</p>
        ) : (
          <ul>
            {shelf.bottles.map((bottle) => {
              const isActive = shelf.active?.id === bottle.id;
              return (
                <li key={bottle.id} aria-current={isActive ? 'true' : undefined}>
                  {label(bottle, catalog)} {isActive ? <strong>Active</strong> : null}{' '}
                  {isActive ? null : (
                    <button type="button" onClick={() => void shelf.setActive(bottle.id)}>
                      Make active
                    </button>
                  )}{' '}
                  <button type="button" onClick={() => void shelf.remove(bottle.id)}>
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <RegisterBottle catalog={catalog} onAdd={shelf.add} />
      <footer>
        <p>
          <small>Sip Shelf is not affiliated with Owala. {catalog.source}</small>
        </p>
      </footer>
    </main>
  );
}
