import { describe, expect, it } from 'vitest';

import { downloadPreviewNotice } from './download-preview.ts';

describe('downloadPreviewNotice', () => {
  it('explains the public link has not switched while editing', () => {
    expect(downloadPreviewNotice({ status: 'editing', expiresAt: null })).toMatch(
      /Not delivered yet/,
    );
  });

  it('says the client sees this page once delivered or closed', () => {
    expect(downloadPreviewNotice({ status: 'finals_delivered', expiresAt: null })).toMatch(
      /client sees on their link now/,
    );
    expect(downloadPreviewNotice({ status: 'closed', expiresAt: null })).toMatch(/now/);
  });

  it('warns when the link has expired', () => {
    expect(downloadPreviewNotice({ status: 'finals_delivered', expiresAt: 10, nowMs: 20 })).toMatch(
      /expired/,
    );
  });
});
