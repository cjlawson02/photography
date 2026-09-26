import { describe, expect, it } from 'vitest';

import {
  PRIVATE_NO_STORE,
  PUBLIC_HOME_HTML,
  PUBLIC_ROBOTS,
  applyDefaultCacheControl,
} from './cache-control.ts';

describe('applyDefaultCacheControl', () => {
  it('does not override an existing Cache-Control', () => {
    const headers = new Headers({ 'Cache-Control': 'public, max-age=1' });
    applyDefaultCacheControl('/', headers);
    expect(headers.get('Cache-Control')).toBe('public, max-age=1');
  });

  it('sets private no-store for admin and review', () => {
    for (const path of ['/admin', '/admin/portfolio', '/review/abc', '/review/api/selection']) {
      const headers = new Headers();
      applyDefaultCacheControl(path, headers);
      expect(headers.get('Cache-Control')).toBe(PRIVATE_NO_STORE);
    }
  });

  it('sets short CDN TTL for the public home', () => {
    const headers = new Headers();
    applyDefaultCacheControl('/', headers);
    expect(headers.get('Cache-Control')).toBe(PUBLIC_HOME_HTML);
  });

  it('sets robots and health defaults', () => {
    const robots = new Headers();
    applyDefaultCacheControl('/robots.txt', robots);
    expect(robots.get('Cache-Control')).toBe(PUBLIC_ROBOTS);

    const health = new Headers();
    applyDefaultCacheControl('/health', health);
    expect(health.get('Cache-Control')).toBe(PRIVATE_NO_STORE);
  });
});
