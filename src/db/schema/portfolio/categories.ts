/** Live-site filter labels — stored on portfolio photo rows until albums exist in HLD. */
export const PORTFOLIO_CATEGORIES = ['Friends', 'Nature', 'Portraits', 'People', 'Beach'] as const;

export type PortfolioCategory = (typeof PORTFOLIO_CATEGORIES)[number];

export const PORTFOLIO_CATEGORY_LABELS = ['All', ...PORTFOLIO_CATEGORIES] as const;

export type PortfolioCategoryFilter = (typeof PORTFOLIO_CATEGORY_LABELS)[number];

export function isPortfolioCategory(value: string): value is PortfolioCategory {
  return (PORTFOLIO_CATEGORIES as readonly string[]).includes(value);
}
