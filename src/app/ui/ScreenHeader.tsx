import type { ReactNode } from 'react';

/**
 * A screen's colored band in the Active bottle's body color, with an optional round button in each top
 * corner, the screen's title and a line under it, finished with a wavy edge.
 */
export function ScreenHeader({
  title,
  titleId,
  subtitle,
  left,
  right,
}: {
  title: string;
  titleId?: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <>
      <header className="band">
        {left || right ? (
          <div className="band-corners">
            <span>{left}</span>
            <span>{right}</span>
          </div>
        ) : null}
        <h1 id={titleId}>{title}</h1>
        {subtitle ? <p className="band-sub">{subtitle}</p> : null}
      </header>
      <svg className="wave" viewBox="0 0 390 30" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d="M0 0 H390 V12 C350 30 310 30 272 16 C232 2 196 4 160 18 C122 32 84 30 48 16 C30 9 14 8 0 12 Z" fill="currentColor" />
      </svg>
    </>
  );
}
