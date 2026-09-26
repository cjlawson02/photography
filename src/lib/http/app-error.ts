import { z } from 'zod/v4';

import { R2ConfigError } from '../dao/r2-dao.ts';

/** AppError codes → HTTP (public routes and plain handlers). Admin islands use tRPC + mapping in `src/lib/trpc/errors.ts`. */
export const APP_ERROR_STATUS = {
  BAD_REQUEST: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PRECONDITION_FAILED: 412,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type AppErrorCode = keyof typeof APP_ERROR_STATUS;

export type HttpErrorStatus = (typeof APP_ERROR_STATUS)[AppErrorCode];

export class AppError extends Error {
  override name = 'AppError';
  readonly code: AppErrorCode;
  readonly status: HttpErrorStatus;

  constructor(code: AppErrorCode, message: string) {
    super(message);
    this.code = code;
    this.status = APP_ERROR_STATUS[code];
  }

  toResponse(): Response {
    return Response.json({ ok: false, error: this.message }, { status: this.status });
  }

  static fromUnknown(error: unknown): AppError {
    if (error instanceof AppError) return error;
    if (error instanceof R2ConfigError) {
      return new AppError('SERVICE_UNAVAILABLE', error.message);
    }
    if (error instanceof z.ZodError) {
      return new AppError('BAD_REQUEST', formatZodIssues(error));
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new AppError('INTERNAL_SERVER_ERROR', message);
  }
}

export function formatZodIssues(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join('; ') || 'Invalid request body';
}

/** Wrap async service work so thrown values become `AppError` (plain HTTP, not tRPC). */
export async function ensureAppError<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw AppError.fromUnknown(error);
  }
}

export function toErrorResponse(error: unknown): Response {
  const appError = AppError.fromUnknown(error);
  if (appError.status >= 500) {
    console.error('[http]', appError);
  }
  return appError.toResponse();
}
