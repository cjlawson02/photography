/**
 * Review (Picu-style) domain schema module.
 *
 * Owns proofing assets that point at the REVIEW R2 bucket.
 * Collections / selections land later — minimal photo rows only for now.
 *
 * Separate table set from portfolio — no shared photos table across domains.
 */
export { ReviewPhotos } from './photos.ts';
