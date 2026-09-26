import type { ReactNode } from 'react';

import { adminClass } from './admin-styles.ts';

type AdminStatusLineProps = {
  children: ReactNode;
  className?: string;
};

/** Muted aria-live status for loading, counts, and mutation feedback. */
export default function AdminStatusLine({ children, className = 'mt-4' }: AdminStatusLineProps) {
  return (
    <p className={`${className} ${adminClass.status}`} aria-live="polite">
      {children}
    </p>
  );
}
