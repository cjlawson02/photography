import type { ReactNode } from 'react';

import { adminFgStyle, adminTableHeadRowStyle, adminTableRowStyle } from './admin-styles.ts';

type AdminTableProps = {
  children: ReactNode;
  className?: string;
};

export function AdminTable({ children, className = 'mt-6' }: AdminTableProps) {
  return (
    <div className={`${className} overflow-x-auto`}>
      <table className="w-full text-left text-sm" style={adminFgStyle}>
        {children}
      </table>
    </div>
  );
}

type AdminTableHeadProps = {
  children: ReactNode;
};

export function AdminTableHead({ children }: AdminTableHeadProps) {
  return (
    <thead>
      <tr style={adminTableHeadRowStyle}>{children}</tr>
    </thead>
  );
}

type AdminTableHeaderCellProps = {
  children: ReactNode;
  className?: string;
};

export function AdminTableHeaderCell({
  children,
  className = 'py-2 pr-4',
}: AdminTableHeaderCellProps) {
  return <th className={`${className} font-normal`}>{children}</th>;
}

type AdminTableRowProps = {
  children: ReactNode;
};

export function AdminTableRow({ children }: AdminTableRowProps) {
  return <tr style={adminTableRowStyle}>{children}</tr>;
}
