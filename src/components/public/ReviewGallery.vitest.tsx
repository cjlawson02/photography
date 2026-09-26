import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import ReviewGallery, { nextSelectStatus } from './ReviewGallery.tsx';

vi.mock('../../lib/gallery/lightbox.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/gallery/lightbox.ts')>();
  return {
    ...actual,
    openGalleryLightbox: vi.fn(),
  };
});

const photo = {
  id: 'photo_1',
  selectionStatus: 'approved' as const,
  thumbUrl: '/media/review/photo_1/thumb.webp',
  galleryUrl: '/media/review/photo_1/gallery.webp',
  width: 6000,
  height: 4000,
};

describe('nextSelectStatus', () => {
  it('does not wipe approved to none (FIX-34)', () => {
    expect(nextSelectStatus('none')).toBe('selected');
    expect(nextSelectStatus('selected')).toBe('none');
    expect(nextSelectStatus('approved')).toBe('selected');
  });
});

describe('ReviewGallery', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts selected (not none) when Select is clicked on an approved photo', async () => {
    const user = userEvent.setup();
    render(<ReviewGallery slug="client-slug" photos={[photo]} />);

    await user.click(screen.getByRole('button', { name: 'Approved' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/review/api/selection',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            slug: 'client-slug',
            photoId: 'photo_1',
            selectionStatus: 'selected',
          }),
        }),
      );
    });
  });

  it('shows a friendly error when selection returns HTML 502 (FIX-33)', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('<html>bad gateway</html>', {
            status: 502,
            headers: { 'content-type': 'text/html' },
          }),
      ),
    );

    render(<ReviewGallery slug="client-slug" photos={[{ ...photo, selectionStatus: 'none' }]} />);

    await user.click(screen.getByRole('button', { name: 'Select' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Could not save selection');
    });
    expect(screen.queryByText(/Unexpected token/)).not.toBeInTheDocument();
  });
});
