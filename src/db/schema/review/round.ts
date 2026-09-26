/** Proof vs delivery round on the same collection (D2: round column on ReviewPhotos). */
export const REVIEW_PHOTO_ROUNDS = ['proof', 'final'] as const;

export type ReviewPhotoRound = (typeof REVIEW_PHOTO_ROUNDS)[number];
