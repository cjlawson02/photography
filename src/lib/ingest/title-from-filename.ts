/**
 * Seed a portfolio display title from an upload filename.
 * `IMG_0973.jpg` → `IMG_0973`; path segments and a trailing extension are dropped.
 */
export function titleFromUploadFilename(filename: string | null | undefined): string | null {
  const trimmed = filename?.trim();
  if (!trimmed) {
    return null;
  }
  const leaf = trimmed.split(/[/\\]/).pop()?.trim() || trimmed;
  const withoutExt = leaf.replace(/\.[^./\\]+$/, '');
  const title = (withoutExt.length > 0 ? withoutExt : leaf).trim();
  return title.length > 0 ? title : null;
}
