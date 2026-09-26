import type { AppEnv } from '../env.ts';
import type { ReviewJobStatus } from '../../db/schema/review/job-status.ts';
import { jobStepLabel } from '../review/job-steps.ts';

const ACTIVE_STATUSES: ReviewJobStatus[] = [
  'setup',
  'proofs_uploaded',
  'shared',
  'picks_submitted',
  'editing',
  'finals_delivered',
];

export type DashboardShootCard = {
  id: string;
  slug: string;
  title: string | null;
  personName: string | null;
  status: ReviewJobStatus;
  statusLabel: string;
  attention: string | null;
  href: string;
};

export type DashboardSummary = {
  activeShoots: DashboardShootCard[];
  frontPageCount: number;
};

export class DashboardService {
  constructor(private readonly app: AppEnv) {}

  static from(app: AppEnv): DashboardService {
    return new DashboardService(app);
  }

  async getSummary(): Promise<DashboardSummary> {
    const collections = await this.app.d1.reviewCollections.listRecent();
    const frontPage = await this.app.d1.portfolioPhotos.listFrontPageForAdmin();
    const now = Date.now();
    const soonMs = 7 * 24 * 60 * 60 * 1000;

    const activeShoots = collections
      .filter((row) => ACTIVE_STATUSES.includes(row.status))
      .map((row) => {
        let attention: string | null = null;
        if (row.status === 'picks_submitted') {
          attention = 'Picks in — copy filenames for Lightroom';
        } else if (row.expiresAt != null && row.expiresAt > now && row.expiresAt - now < soonMs) {
          attention = 'Link expiring soon';
        }
        return {
          id: row.id,
          slug: row.slug,
          title: row.title,
          personName: row.personName,
          status: row.status,
          statusLabel: jobStepLabel(row.status),
          attention,
          href: `/admin/shoots/${encodeURIComponent(row.id)}`,
        };
      });

    return {
      activeShoots,
      frontPageCount: frontPage.length,
    };
  }
}
