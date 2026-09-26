import type { z } from 'zod/v4';

import { accessDeniedResponse, verifyAccessJwt, type AccessEnv } from '../access/verify-jwt.ts';
import { AppError, formatZodIssues, type HttpErrorStatus } from '../http/app-error.ts';

export { accessDeniedResponse };

/** Verify Access JWT; return identity or a 403 Response. */
export async function requireAdmin(
  request: Request,
  env: AccessEnv,
): Promise<{ email?: string } | Response> {
  try {
    const identity = await verifyAccessJwt(request, env);
    return { email: identity.email };
  } catch (error) {
    return accessDeniedResponse(error);
  }
}

export function jsonOk(data: unknown, init?: ResponseInit): Response {
  return Response.json({ ok: true, ...asObject(data) }, init);
}

export function jsonError(message: string, status: HttpErrorStatus): Response {
  return Response.json({ ok: false, error: message }, { status });
}

export function requireJsonContentType(request: Request): void {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new AppError('BAD_REQUEST', 'Content-Type must be application/json');
  }
}

/** Max JSON body for public review selection POST (slug + photoId + status). */
export const REVIEW_SELECTION_MAX_JSON_BYTES = 4 * 1024;

async function readJsonTextWithByteLimit(request: Request, maxBytes: number): Promise<string> {
  const contentLength = request.headers.get('content-length');
  if (contentLength !== null) {
    const declared = Number(contentLength);
    if (!Number.isFinite(declared) || declared < 0 || declared > maxBytes) {
      throw new AppError('BAD_REQUEST', 'Request body too large');
    }
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new AppError('BAD_REQUEST', 'Request body too large');
  }
  return text;
}

export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
  options?: { maxBytes?: number },
): Promise<T> {
  requireJsonContentType(request);
  let raw: unknown;
  try {
    if (options?.maxBytes !== undefined) {
      const text = await readJsonTextWithByteLimit(request, options.maxBytes);
      raw = JSON.parse(text) as unknown;
    } else {
      raw = await request.json();
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('BAD_REQUEST', 'Invalid JSON body');
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new AppError('BAD_REQUEST', formatZodIssues(parsed.error));
  }
  return parsed.data;
}

function asObject(data: unknown): Record<string, unknown> {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return { data };
}
