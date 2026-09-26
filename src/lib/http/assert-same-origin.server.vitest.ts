import { describe, expect, it } from 'vitest';

import { AppError } from './app-error.ts';
import { assertRequestSameOrigin } from './assert-same-origin.ts';

function request(url: string, headers?: HeadersInit): Request {
  return new Request(url, { method: 'POST', headers });
}

describe('assertRequestSameOrigin', () => {
  it('allows matching Origin', () => {
    expect(() =>
      assertRequestSameOrigin(
        request('https://photography.example/review/api/selection', {
          Origin: 'https://photography.example',
        }),
      ),
    ).not.toThrow();
  });

  it('rejects mismatched Origin', () => {
    expect(() =>
      assertRequestSameOrigin(
        request('https://photography.example/review/api/selection', {
          Origin: 'https://evil.example',
        }),
      ),
    ).toThrow(AppError);
    try {
      assertRequestSameOrigin(
        request('https://photography.example/review/api/selection', {
          Origin: 'https://evil.example',
        }),
      );
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe('FORBIDDEN');
    }
  });

  it('allows missing Origin with Sec-Fetch-Site same-origin', () => {
    expect(() =>
      assertRequestSameOrigin(
        request('https://photography.example/review/api/selection', {
          'Sec-Fetch-Site': 'same-origin',
        }),
      ),
    ).not.toThrow();
  });

  it('rejects missing Origin without Sec-Fetch-Site', () => {
    expect(() =>
      assertRequestSameOrigin(request('https://photography.example/review/api/selection')),
    ).toThrow(AppError);
  });
});
