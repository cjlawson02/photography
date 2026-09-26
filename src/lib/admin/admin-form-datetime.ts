/** `datetime-local` input value ↔ epoch ms for admin forms. */

export function expiresAtToDatetimeLocal(ms: number | null | undefined): string {
  if (ms == null) return '';
  const date = new Date(ms);
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function parseDatetimeLocalToMs(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const ms = new Date(trimmed).getTime();
  if (Number.isNaN(ms)) {
    throw new Error('Invalid expiry date.');
  }
  return ms;
}
