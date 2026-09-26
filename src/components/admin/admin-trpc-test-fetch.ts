import { vi } from 'vitest';

type Handler = (input: unknown) => unknown;

export type TrpcCall = { path: string; input: unknown };

/**
 * Stub global `fetch` for the admin tRPC `httpBatchLink` (no transformer): routes each batched
 * procedure to `handlers[path]` and records calls. Call `vi.unstubAllGlobals()` in cleanup.
 */
export function stubAdminTrpcFetch(handlers: Record<string, Handler>) {
  const calls: TrpcCall[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const parsed = new URL(String(url), 'http://localhost');
      const paths = decodeURIComponent(parsed.pathname.replace(/^.*\/trpc\//, '')).split(',');
      const inputs = JSON.parse(
        init?.method === 'POST'
          ? String(init.body ?? '{}')
          : (parsed.searchParams.get('input') ?? '{}'),
      ) as Record<string, unknown>;
      const body = paths.map((path, index) => {
        const input = inputs[index];
        calls.push({ path, input });
        const handler = handlers[path];
        if (!handler) {
          return { error: { message: `No handler for ${path}`, code: -32603, data: {} } };
        }
        return { result: { data: handler(input) } };
      });
      return new Response(JSON.stringify(body), {
        headers: { 'content-type': 'application/json' },
      });
    }),
  );
  return { calls, callsTo: (path: string) => calls.filter((call) => call.path === path) };
}
