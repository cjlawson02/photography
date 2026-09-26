import type { ReactNode } from 'react';

import { adminClass } from './admin-styles.ts';

type AdminEmptyStateProps = {
  title: string;
  children: ReactNode;
  /** Default `center` for table empty states; use `start` for multi-paragraph guidance. */
  align?: 'center' | 'start';
};

/** Centered empty / guidance panel for admin tables and forms. */
export default function AdminEmptyState({
  title,
  children,
  align = 'center',
}: AdminEmptyStateProps) {
  const textAlign = align === 'start' ? 'text-left' : 'text-center';
  return (
    <div
      className={`${adminClass.panelDashed} px-4 py-8 text-sm ${textAlign} ${adminClass.fgMuted}`}
    >
      <p className={`text-sm font-medium ${adminClass.fg}`}>{title}</p>
      <div
        className={`mt-2 max-w-md text-xs leading-relaxed ${align === 'center' ? 'mx-auto' : ''}`}
      >
        {children}
      </div>
    </div>
  );
}
