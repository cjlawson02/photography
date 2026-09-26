import type { ReactNode } from 'react';

import { adminFgStyle } from './admin-styles.ts';

type AdminFieldLabelProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

export default function AdminFieldLabel({
  label,
  children,
  className = 'block text-sm',
}: AdminFieldLabelProps) {
  return (
    <label className={className} style={adminFgStyle}>
      {label}
      {children}
    </label>
  );
}
