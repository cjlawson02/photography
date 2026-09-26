/** D1/SQLite unique index failures — avoid matching generic “constraint” strings. */
export function isSqliteUniqueViolation(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('unique constraint failed') ||
    message.includes('sqlite_constraint_unique') ||
    (message.includes('unique') && message.includes('failed'))
  );
}
