/** Shared display/format helpers for admin tables and inline edits. */

export function formatAdminTime(ms: number | null | undefined): string {
  if (!ms) return '—';
  return new Date(ms).toLocaleString();
}

export function formatAdminDimensions(
  width: number | null | undefined,
  height: number | null | undefined,
): string {
  if (width == null || height == null) return '—';
  return `${width}×${height}`;
}

export function normalizeNullableText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
