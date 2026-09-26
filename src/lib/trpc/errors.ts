import { TRPCError } from '@trpc/server';
import { getHTTPStatusCodeFromError } from '@trpc/server/http';

import { AppError, type AppErrorCode, type HttpErrorStatus } from '../http/app-error.ts';

const APP_TO_TRPC: Record<AppErrorCode, TRPCError['code']> = {
  BAD_REQUEST: 'BAD_REQUEST',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  PRECONDITION_FAILED: 'PRECONDITION_FAILED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
};

export function appErrorToTrpc(error: AppError): TRPCError {
  return new TRPCError({
    code: APP_TO_TRPC[error.code],
    message: error.message,
    cause: error,
  });
}

export function trpcErrorToHttpStatus(code: TRPCError['code']): HttpErrorStatus {
  const err = new TRPCError({ code, message: 'status probe' });
  return getHTTPStatusCodeFromError(err) as HttpErrorStatus;
}
