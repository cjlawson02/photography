type OkJsonBody = {
  ok?: boolean;
  error?: string;
};

function isJsonContentType(res: Response): boolean {
  const contentType = res.headers.get('content-type') ?? '';
  return contentType.toLowerCase().includes('application/json');
}

/**
 * Read a JSON `{ ok, error? }` response without parsing HTML/non-JSON error pages
 * (FIX-33). Throws with `json.error` when present, else `fallbackError`.
 */
export async function assertOkJsonResponse(res: Response, fallbackError: string): Promise<void> {
  if (!isJsonContentType(res)) {
    throw new Error(fallbackError);
  }

  let json: OkJsonBody;
  try {
    json = (await res.json()) as OkJsonBody;
  } catch {
    throw new Error(fallbackError);
  }

  if (!res.ok || !json.ok) {
    const message =
      typeof json.error === 'string' && json.error.trim() ? json.error : fallbackError;
    throw new Error(message);
  }
}
