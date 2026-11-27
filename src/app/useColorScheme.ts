import { useEffect, useState } from 'react';
import type { Scheme } from '../theme/theme';

const QUERY = '(prefers-color-scheme: dark)';

/** The phone's light/dark setting, updating live if it changes. */
export function useColorScheme(): Scheme {
  const [scheme, setScheme] = useState<Scheme>(() => (window.matchMedia(QUERY).matches ? 'dark' : 'light'));
  useEffect(() => {
    const query = window.matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent) => setScheme(e.matches ? 'dark' : 'light');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return scheme;
}
