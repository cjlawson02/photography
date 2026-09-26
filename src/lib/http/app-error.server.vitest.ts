import { describe, expect, it } from 'vitest';

import { R2ConfigError } from '../dao/r2-dao.ts';
import { APP_ERROR_STATUS, AppError } from './app-error.ts';

describe('AppError', () => {
  it('maps codes to HTTP status', () => {
    expect(new AppError('BAD_REQUEST', 'nope').status).toBe(400);
    expect(new AppError('NOT_FOUND', 'missing').status).toBe(404);
    expect(new AppError('PRECONDITION_FAILED', 'put').status).toBe(412);
    expect(new AppError('INTERNAL_SERVER_ERROR', 'boom').status).toBe(500);
    expect(new AppError('SERVICE_UNAVAILABLE', 'r2').status).toBe(503);
    expect(new AppError('TOO_MANY_REQUESTS', 'slow down').status).toBe(429);
    expect(APP_ERROR_STATUS.FORBIDDEN).toBe(403);
  });

  it('toResponse is JSON { ok: false, error }', async () => {
    const response = new AppError('NOT_FOUND', 'Photo not found').toResponse();
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ ok: false, error: 'Photo not found' });
  });

  it('fromUnknown maps R2ConfigError to 503', () => {
    const mapped = AppError.fromUnknown(new R2ConfigError('R2 S3 secrets not configured'));
    expect(mapped.code).toBe('SERVICE_UNAVAILABLE');
    expect(mapped.status).toBe(503);
  });
});
