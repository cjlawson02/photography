import type { ReactNode } from 'react';

import { adminClass } from './admin-styles.ts';

type AdminSectionHeadingProps = {
  children: ReactNode;
};

export default function AdminSectionHeading({ children }: AdminSectionHeadingProps) {
  return <h2 className={adminClass.sectionHeading}>{children}</h2>;
}
