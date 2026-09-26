import type { ReactNode } from 'react';

import { adminFgMutedStyle } from './admin-styles.ts';

type AdminSectionHeadingProps = {
  children: ReactNode;
};

export default function AdminSectionHeading({ children }: AdminSectionHeadingProps) {
  return (
    <h2 className="text-sm font-medium uppercase tracking-wide" style={adminFgMutedStyle}>
      {children}
    </h2>
  );
}
