import { TRPCError } from '@trpc/server';

import {
	AppError,
	type AppErrorCode,
	type HttpErrorStatus,
	toErrorResponse,
} from '../http/app-error.ts';

const APP_TO_TRPC: Record<AppErrorCode, TRPCError['code']> = {
	BAD_REQUEST: 'BAD_REQUEST',
	FORBIDDEN: 'FORBIDDEN',
	NOT_FOUND: 'NOT_FOUND',
	PRECONDITION_FAILED: 'PRECONDITION_FAILED',
	INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
	SERVICE_UNAVAILABLE: 'INTERNAL_SERVER_ERROR',
};

export function appErrorToTrpc(error: AppError): TRPCError {
	return new TRPCError({
		code: APP_TO_TRPC[error.code],
		message: error.message,
		cause: error,
	});
}

export async function runAppProcedure<T>(fn: () => Promise<T>): Promise<T> {
	try {
		return await fn();
	} catch (error) {
		if (error instanceof AppError) {
			throw appErrorToTrpc(error);
		}
		if (error instanceof TRPCError) {
			throw error;
		}
		throw appErrorToTrpc(AppError.fromUnknown(error));
	}
}

export function trpcErrorToHttpStatus(code: TRPCError['code']): HttpErrorStatus {
	switch (code) {
		case 'BAD_REQUEST':
		case 'PARSE_ERROR':
			return 400;
		case 'UNAUTHORIZED':
		case 'FORBIDDEN':
			return 403;
		case 'NOT_FOUND':
			return 404;
		case 'PRECONDITION_FAILED':
			return 412;
		case 'INTERNAL_SERVER_ERROR':
		case 'NOT_IMPLEMENTED':
			return 500;
		default:
			return 400;
	}
}

/** Map tRPC failures to legacy `{ ok: false, error }` admin REST responses. */
export function trpcErrorToResponse(error: unknown): Response {
	if (error instanceof TRPCError) {
		const status = trpcErrorToHttpStatus(error.code);
		if (status >= 500) {
			console.error('[trpc]', error);
		}
		return Response.json({ ok: false, error: error.message }, { status });
	}
	return toErrorResponse(error);
}
