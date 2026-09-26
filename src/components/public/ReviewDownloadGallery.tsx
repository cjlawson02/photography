import type { PublicReviewDownloadPhoto } from '../../lib/services/review-service.ts';

type Props = {
  photos: PublicReviewDownloadPhoto[];
};

export default function ReviewDownloadGallery({ photos }: Props) {
  if (photos.length === 0) {
    return (
      <p
        className="public-wrap mt-8 text-center text-sm"
        style={{ color: 'var(--color-fg-muted)' }}
      >
        Finals are still processing — check back shortly.
      </p>
    );
  }

  return (
    <section className="public-wrap mt-10" aria-label="Download your photos">
      <ul className="review-download-grid">
        {photos.map((photo) => (
          <li key={photo.id} className="review-download-card">
            <img
              src={photo.thumbUrl}
              alt=""
              width={400}
              height={300}
              className="review-download-card__thumb"
              loading="lazy"
            />
            <a className="review-download-card__btn" href={photo.downloadUrl} download>
              Download{photo.originalFilename ? ` — ${photo.originalFilename}` : ''}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
