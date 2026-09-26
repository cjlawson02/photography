import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { legacyRedirectTarget } from './legacy-redirect.ts';

describe('legacyRedirectTarget', () => {
  it('redirects apex and www to canonical host preserving path and query', () => {
    assert.equal(
      legacyRedirectTarget(new URL('https://lawsonphotography.me/')),
      'https://photography.chrislawson.dev/',
    );
    assert.equal(
      legacyRedirectTarget(new URL('https://www.lawsonphotography.me/gallery?cat=1')),
      'https://photography.chrislawson.dev/gallery?cat=1',
    );
  });

  it('leaves canonical host unchanged', () => {
    assert.equal(
      legacyRedirectTarget(new URL('https://photography.chrislawson.dev/review/foo')),
      null,
    );
  });
});
