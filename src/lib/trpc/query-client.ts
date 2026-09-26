import { QueryClient } from '@tanstack/react-query';
import { TRPCClientError } from '@trpc/client';

const CLIENT_ERROR_CODES = new Set([
  'BAD_REQUEST',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'METHOD_NOT_SUPPORTED',
  'CONFLICT',
  'PRECONDITION_FAILED',
  'PAYLOAD_TOO_LARGE',
  'UNPROCESSABLE_CONTENT',
  'TOO_MANY_REQUESTS',
  'CLIENT_CLOSED_REQUEST',
]);

function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (error instanceof TRPCClientError) {
    if (CLIENT_ERROR_CODES.has(error.data?.code ?? '')) {
      return false;
    }
    const status = error.data?.httpStatus;
    if (typeof status === 'number' && status >= 400 && status < 500) {
      return false;
    }
  }
  return failureCount < 3;
}

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: shouldRetryQuery,
      },
      mutations: {
        retry: shouldRetryQuery,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/** Module-level singleton for admin React islands (each island mounts its own provider). */
export function getAdminQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
