/**
 * Review (Picu-style) domain schema module.
 *
 * Owns proofing collections / photos / selections that point at the REVIEW R2 bucket.
 * Separate table set from portfolio — no shared photos table across domains.
 */
export { ReviewCollections } from './collections.ts';
export { ReviewPhotos } from './photos.ts';
export { reviewJobStatuses, type ReviewJobStatus } from './job-status.ts';
export { selectionStatuses, type SelectionStatus } from './selection-status.ts';
export { reviewCollectionsRelations, reviewPhotosRelations } from './relations.ts';
