import type { APIRoute } from 'astro';

/** Public health/smoke — no binding inventory (see `/admin/api/health` for operators). */
export const GET: APIRoute = async () => {
  return Response.json({
    ok: true,
    service: 'lawson-photography',
  });
};
