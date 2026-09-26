import { useQuery } from '@tanstack/react-query';

import { AdminTrpcProvider, useTRPC } from '../../lib/trpc/react.tsx';
import { AdminJobStatusBadge } from './AdminJobStepRail.tsx';
import { errorMessage } from './admin-format.ts';
import { adminClass } from './admin-styles.ts';
import AdminSectionHeading from './AdminSectionHeading.tsx';
import AdminStatusLine from './AdminStatusLine.tsx';

function AdminHomeInner() {
  const trpc = useTRPC();
  const summaryQuery = useQuery(trpc.dashboard.summary.queryOptions());
  const summary = summaryQuery.data;

  return (
    <>
      <AdminSectionHeading>Resume</AdminSectionHeading>
      <AdminStatusLine className="mt-4">
        {summaryQuery.isPending
          ? 'Loading…'
          : summaryQuery.isError
            ? errorMessage(summaryQuery.error)
            : null}
      </AdminStatusLine>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <a
          href="/admin/portfolio/front-page"
          className={`block rounded border p-4 ${adminClass.uploadSection}`}
        >
          <h3 className={`text-sm font-medium ${adminClass.fg}`}>Front page</h3>
          <p className={`mt-2 text-xs ${adminClass.fgMuted}`}>
            {summary ? `${summary.frontPageCount} photo(s) in the curated set` : '—'}
          </p>
        </a>
        <a
          href="/admin/portfolio/library"
          className={`block rounded border p-4 ${adminClass.uploadSection}`}
        >
          <h3 className={`text-sm font-medium ${adminClass.fg}`}>Portfolio library</h3>
          <p className={`mt-2 text-xs ${adminClass.fgMuted}`}>Upload and edit metadata</p>
        </a>
      </div>

      <div className="mt-10">
        <AdminSectionHeading>Active client shoots</AdminSectionHeading>
      </div>
      {summary && summary.activeShoots.length === 0 ? (
        <p className={`mt-4 text-sm ${adminClass.fgMuted}`}>
          No open shoots.{' '}
          <a className={adminClass.link} href="/admin/shoots">
            Create one
          </a>
          .
        </p>
      ) : null}
      <ul className="mt-4 space-y-3">
        {summary?.activeShoots.map((shoot) => (
          <li key={shoot.id}>
            <a href={shoot.href} className={`block rounded border p-4 ${adminClass.uploadSection}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-sm font-medium ${adminClass.fg}`}>
                  {shoot.personName?.trim() || shoot.title?.trim() || shoot.slug}
                </span>
                <AdminJobStatusBadge status={shoot.status} />
              </div>
              {shoot.attention ? (
                <p className={`mt-2 text-xs ${adminClass.accent}`}>{shoot.attention}</p>
              ) : (
                <p className={`mt-2 text-xs ${adminClass.fgMuted}`}>{shoot.statusLabel}</p>
              )}
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function AdminHome() {
  return (
    <AdminTrpcProvider>
      <AdminHomeInner />
    </AdminTrpcProvider>
  );
}
