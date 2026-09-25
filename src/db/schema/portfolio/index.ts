/**
 * Portfolio domain schema module.
 *
 * Owns public-site catalog metadata that points at the PORTFOLIO R2 bucket.
 * Exact product columns beyond the minimal photo row remain `_TBD_` in HLD.
 *
 * Do not import or join review-domain tables from here.
 */
export { PortfolioPhotos } from './photos.ts';
export { PORTFOLIO_CATEGORIES, type PortfolioCategory } from './categories.ts';
