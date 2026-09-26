import { describe, expect, it } from 'vitest';

import { assertOkJsonResponse } from './assert-ok-json.ts';

describe('assertOkJsonResponse', () => {
  it('accepts 200 JSON with ok:true', async () => {
    const res = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
    await expect(assertOkJsonResponse(res, 'Could not save')).resolves.toBeUndefined();
  });

  it('uses server error on JSON 4xx', async () => {
    const res = new Response(JSON.stringify({ ok: false, error: 'Picks are locked' }), {
      status: 412,
      headers: { 'content-type': 'application/json' },
    });
    await expect(assertOkJsonResponse(res, 'Could not save')).rejects.toThrow('Picks are locked');
  });

  it('falls back on HTML 502 without parsing as JSON', async () => {
    const res = new Response('<html>error</html>', {
      status: 502,
      headers: { 'content-type': 'text/html' },
    });
    await expect(assertOkJsonResponse(res, 'Could not save selection')).rejects.toThrow(
      'Could not save selection',
    );
  });

  it('falls back when content-type is JSON but body is not', async () => {
    const res = new Response('<html>error</html>', {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
    await expect(assertOkJsonResponse(res, 'Could not submit picks')).rejects.toThrow(
      'Could not submit picks',
    );
  });
});
