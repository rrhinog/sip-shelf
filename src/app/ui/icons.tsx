import type { ReactNode } from 'react';

/** Small line icons. Always decorative: the button that holds one carries the accessible name. */
function Icon({ children, size = 22, stroke = 2.2 }: { children: ReactNode; size?: number; stroke?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const ShelfIcon = () => (
  <Icon>
    <path d="M3 20h18M3 11h18M6 11V5h3v6M13 11V7h3v4M6 20v-6h3v6M14 20v-5h3v5" />
  </Icon>
);

export const InfoIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.6v.1" />
  </Icon>
);

export const PlusIcon = () => (
  <Icon size={20} stroke={2.6}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const BackIcon = () => (
  <Icon size={20} stroke={2.6}>
    <path d="M15 5l-7 7 7 7" />
  </Icon>
);

export const CloseIcon = () => (
  <Icon size={20} stroke={2.6}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);

export const CheckIcon = ({ size = 16 }: { size?: number }) => (
  <Icon size={size} stroke={3.2}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
);
