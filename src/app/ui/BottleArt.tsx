import type { ResolvedPalette } from '../../theme/theme';

/** Colors in CSS terms, so a bottle can be drawn from a Palette or straight from the theme variables. */
export type BottleColors = Pick<ResolvedPalette, 'body' | 'lid' | 'accent'>;

/** Drawn from the app's own theme: used where no particular Bottle is meant. */
export const THEME_COLORS: BottleColors = {
  body: 'var(--color-primary)',
  lid: 'var(--color-secondary)',
  accent: 'var(--color-accent)',
};

/**
 * A bottle drawn as plain shapes (a handle, a lid with a drinking-spout button, a body), colored from a
 * Palette. No Owala artwork: the same silhouette stands for every Model.
 */
export function BottleArt({ colors, width = 56, height = 112 }: { colors: BottleColors; width?: number; height?: number }) {
  return (
    <svg viewBox="0 0 60 120" width={width} height={height} aria-hidden="true" focusable="false" className="bottle-art">
      <path d="M23 15 C23 3, 37 3, 37 15" fill="none" stroke={colors.lid} strokeWidth="5" strokeLinecap="round" />
      <path d="M23 15 C23 3, 37 3, 37 15" fill="none" stroke="var(--color-text)" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <rect x="12" y="13" width="36" height="21" rx="9" fill={colors.lid} stroke="var(--color-text)" strokeWidth="2" />
      <rect x="31" y="17" width="11" height="9" rx="4" fill={colors.accent} stroke="var(--color-text)" strokeWidth="1.5" />
      <rect x="10" y="35" width="40" height="82" rx="15" fill={colors.body} stroke="var(--color-text)" strokeWidth="2" />
      <path d="M17 48 V72" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}
