import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import AdminPhotoUpload, { ADMIN_UPLOAD_CONCURRENCY } from './AdminPhotoUpload.tsx';

const uploadPhoto = vi.hoisted(() => vi.fn());

vi.mock('../../lib/ingest/browser-upload.ts', () => ({
  uploadPhoto,
}));

function imageFile(name: string): File {
  return new File([`bytes-${name}`], name, { type: 'image/jpeg' });
}

describe('AdminPhotoUpload', () => {
  it('uploads multiple portfolio files with bounded concurrency and reports a summary', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    let inFlight = 0;
    let maxInFlight = 0;
    uploadPhoto.mockReset();
    uploadPhoto.mockImplementation(async ({ file }: { file: File }) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await Promise.resolve();
      inFlight -= 1;
      return {
        id: file.name,
        bucket: 'portfolio',
        status: 'ready',
        variants: ['sm'],
      };
    });

    render(<AdminPhotoUpload bucket="portfolio" onSuccess={onSuccess} />);

    const files = Array.from({ length: 7 }, (_, index) => imageFile(`${index}.jpg`));
    const input = screen.getByLabelText('Photos');
    await user.upload(input, files);
    await user.click(screen.getByRole('button', { name: 'Upload' }));

    await waitFor(() => expect(uploadPhoto).toHaveBeenCalledTimes(7));
    expect(maxInFlight).toBeLessThanOrEqual(ADMIN_UPLOAD_CONCURRENCY);
    expect(maxInFlight).toBeGreaterThan(1);
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('7 uploads complete.')).toBeInTheDocument();
  });

  it('continues after a failure and still refreshes when some uploads succeed', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    uploadPhoto.mockReset();
    uploadPhoto.mockImplementation(async ({ file }: { file: File }) => {
      if (file.name === 'bad.jpg') {
        throw new Error('R2 put failed');
      }
      return {
        id: 'ok',
        bucket: 'portfolio',
        status: 'ready',
        variants: ['sm'],
      };
    });

    render(<AdminPhotoUpload bucket="portfolio" onSuccess={onSuccess} />);

    const input = screen.getByLabelText('Photos');
    await user.upload(input, [imageFile('bad.jpg'), imageFile('good.jpg')]);
    await user.click(screen.getByRole('button', { name: 'Upload' }));

    await waitFor(() => expect(uploadPhoto).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(
      await screen.findByText('1 uploaded, 1 failed. First error: bad.jpg: R2 put failed'),
    ).toBeInTheDocument();
  });

  it('shows a validation error when no files are chosen', async () => {
    const user = userEvent.setup();
    uploadPhoto.mockReset();

    render(<AdminPhotoUpload bucket="portfolio" />);
    await user.click(screen.getByRole('button', { name: 'Upload' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Choose one or more image files.');
    expect(uploadPhoto).not.toHaveBeenCalled();
  });
});
