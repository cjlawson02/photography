import type { ReactNode } from 'react';

import { adminClass } from './admin-styles.ts';

type AdminTableProps = {
  children: ReactNode;
  className?: string;
};

export function AdminTable({ children, className = '' }: AdminTableProps) {
  const wrapClass = className ? `${adminClass.tableWrap} ${className}` : adminClass.tableWrap;
  return (
    <div className={wrapClass}>
      <table className={adminClass.table}>{children}</table>
    </div>
  );
}

type AdminTableHeadProps = {
  children: ReactNode;
};

export function AdminTableHead({ children }: AdminTableHeadProps) {
  return (
    <thead>
      <tr className={adminClass.tableHeadRow}>{children}</tr>
    </thead>
  );
}

type AdminTableHeaderCellProps = {
  children: ReactNode;
  className?: string;
};

export function AdminTableHeaderCell({ children, className = '' }: AdminTableHeaderCellProps) {
  const thClass = className ? `${adminClass.tableTh} ${className}` : adminClass.tableTh;
  return <th className={thClass}>{children}</th>;
}

type AdminTableRowProps = {
  children: ReactNode;
};

export function AdminTableRow({ children }: AdminTableRowProps) {
  return <tr className={adminClass.tableRow}>{children}</tr>;
}
