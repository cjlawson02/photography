/**
 * Portfolio domain schema module.
 *
 * Owns public-site catalog metadata that points at the PORTFOLIO R2 bucket.
 * Column definitions in this module are canonical (HLD points here).
 *
 * Do not import or join review-domain tables from here.
 */
export { PortfolioPhotos } from './photos.ts';
export { PORTFOLIO_CATEGORIES, type PortfolioCategory } from './categories.ts';
