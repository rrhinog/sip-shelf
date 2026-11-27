import type { ReactNode } from 'react';
import { InfoIcon, ShelfIcon } from './icons';

export type Tab = 'shelf' | 'about';

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'shelf', label: 'Shelf', icon: <ShelfIcon /> },
  { id: 'about', label: 'About', icon: <InfoIcon /> },
];

/**
 * The app's main places, as icon tabs at the bottom (a left side menu on wide screens), per
 * Keystone's app-layout foundation: the current tab sits in a pill with its name under it,
 * the others show the icon alone. Every tab has an accessible name.
 */
export function TabBar({ current, onSelect }: { current: Tab; onSelect(tab: Tab): void }) {
  return (
    <nav aria-label="Main" className="tabbar">
      {TABS.map((tab) => {
        const isCurrent = tab.id === current;
        return (
          <button
            key={tab.id}
            type="button"
            className="tab"
            aria-label={tab.label}
            aria-current={isCurrent ? 'page' : undefined}
            onClick={() => onSelect(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            {isCurrent ? <span className="tab-name">{tab.label}</span> : null}
          </button>
        );
      })}
    </nav>
  );
}
