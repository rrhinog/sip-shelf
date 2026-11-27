import { useEffect, useState } from 'react';
import { CATALOG_URL, loadCatalog } from '../catalog/catalog';
import type { Catalog, NewBottle } from '../domain/types';
import { applyTheme, themeForBottle } from '../theme/forBottle';
import { About, DeviceOnlyNotice } from './about';
import { RegisterScreen } from './screens/RegisterScreen';
import { ShelfScreen } from './screens/ShelfScreen';
import { TabBar, type Tab } from './ui/TabBar';
import { useColorScheme } from './useColorScheme';
import { useShelf } from './useShelf';

/** Where the person is: one of the main tabs, or the Register flow (a focused task that hides the tabs). */
type View = Tab | 'register';

export function App() {
  const shelf = useShelf();
  const scheme = useColorScheme();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('shelf');

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

  if (error) return <main role="alert" className="plain-text">{error}</main>;
  if (!catalog || !shelf.loaded) return <main className="plain-text">Loading...</main>;

  async function register(bottle: NewBottle) {
    await shelf.add(bottle);
    setView('shelf');
  }

  return (
    <div className="app">
      <main>
        {view === 'register' ? (
          <RegisterScreen catalog={catalog} onSave={register} onLeave={() => setView('shelf')} />
        ) : view === 'about' ? (
          <About />
        ) : (
          <ShelfScreen
            catalog={catalog}
            bottles={shelf.bottles}
            active={shelf.active}
            onAdd={() => setView('register')}
            onSetActive={shelf.setActive}
            onRemove={shelf.remove}
          />
        )}
      </main>
      {view === 'register' ? null : <TabBar current={view} onSelect={setView} />}
      <DeviceOnlyNotice />
    </div>
  );
}
