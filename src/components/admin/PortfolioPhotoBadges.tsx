import type { AdminPortfolioPhoto } from '../../lib/admin/trpc-types.ts';
import { portfolioPhotoBadges } from './portfolio-library-model.ts';

export default function PortfolioPhotoBadges({ photo }: { photo: AdminPortfolioPhoto }) {
  return (
    <span className="flex flex-wrap gap-1">
      {portfolioPhotoBadges(photo).map((badge) => (
        <span
          key={badge.label}
          className={`admin-photo-badge ${badge.attention ? 'admin-photo-badge--attention' : ''}`}
          title={badge.title}
        >
          {badge.label}
        </span>
      ))}
    </span>
  );
}
