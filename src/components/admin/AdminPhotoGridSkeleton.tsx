export default function AdminPhotoGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className="admin-photo-grid" aria-busy="true" aria-label="Loading photos">
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="admin-photo-grid__tile">
          <span className="admin-photo-grid__img admin-photo-grid__placeholder admin-skeleton" />
        </li>
      ))}
    </ul>
  );
}
