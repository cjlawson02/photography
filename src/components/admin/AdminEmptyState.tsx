import type { ReactNode } from 'react';

const panelStyle = {
  background: 'color-mix(in oklab, var(--color-fg) 6%, transparent)',
  borderColor: 'var(--color-border)',
};

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
      className={`border border-dashed px-4 py-8 text-sm ${textAlign}`}
      style={{ ...panelStyle, color: 'var(--color-fg-muted)' }}
    >
      <p className="text-sm font-medium" style={{ color: 'var(--color-fg)' }}>
        {title}
      </p>
      <div
        className={`mt-2 max-w-md text-xs leading-relaxed ${align === 'center' ? 'mx-auto' : ''}`}
      >
        {children}
      </div>
    </div>
  );
}
