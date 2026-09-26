export type AdminListCursor = {
  updatedAt: number;
  id: string;
};

export function encodeAdminListCursor(cursor: AdminListCursor): string {
  return btoa(JSON.stringify(cursor));
}

export function decodeAdminListCursor(encoded: string): AdminListCursor | null {
  try {
    const parsed: unknown = JSON.parse(atob(encoded));
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'updatedAt' in parsed &&
      'id' in parsed &&
      typeof (parsed as AdminListCursor).updatedAt === 'number' &&
      typeof (parsed as AdminListCursor).id === 'string'
    ) {
      return parsed as AdminListCursor;
    }
  } catch {
    /* invalid cursor */
  }
  return null;
}
