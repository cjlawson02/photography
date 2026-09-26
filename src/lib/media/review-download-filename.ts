const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

/** `Content-Disposition` filename for a review original download. */
export function reviewDownloadFilename(photo: {
  id: string;
  originalFilename: string | null;
  mimeType: string | null;
}): string {
  const name = photo.originalFilename?.trim();
  if (name) return name;
  const ext = photo.mimeType ? EXTENSION_BY_MIME[photo.mimeType.toLowerCase()] : undefined;
  return ext ? `${photo.id}.${ext}` : photo.id;
}
