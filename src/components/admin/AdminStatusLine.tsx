import type { ReactNode } from 'react';

import { adminFgMutedStyle } from './admin-styles.ts';

type AdminStatusLineProps = {
  children: ReactNode;
  className?: string;
};

/** Muted aria-live status for loading, counts, and mutation feedback. */
export default function AdminStatusLine({ children, className = 'mt-4' }: AdminStatusLineProps) {
  return (
    <p className={`${className} text-xs`} style={adminFgMutedStyle} aria-live="polite">
      {children}
    </p>
  );
}
