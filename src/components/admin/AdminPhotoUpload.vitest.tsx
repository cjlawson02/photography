import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import AdminPhotoUpload from './AdminPhotoUpload.tsx';

const uploadPhoto = vi.hoisted(() => vi.fn());

vi.mock('../../lib/ingest/browser-upload.ts', () => ({
  uploadPhoto,
}));

function imageFile(name: string): File {
  return new File([`bytes-${name}`], name, { type: 'image/jpeg' });
}

describe('AdminPhotoUpload', () => {
  it('uploads multiple portfolio files sequentially and reports a summary', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    uploadPhoto.mockReset();
    uploadPhoto.mockImplementation(async ({ file }: { file: File }) => ({
      id: file.name,
      bucket: 'portfolio',
      status: 'ready',
      variants: ['sm'],
    }));

    const { container } = render(<AdminPhotoUpload bucket="portfolio" onSuccess={onSuccess} />);

    const input = screen.getByLabelText('Photos');
    await user.upload(input, [imageFile('a.jpg'), imageFile('b.jpg')]);
    expect((input as HTMLInputElement).files).toHaveLength(2);

    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => expect(uploadPhoto).toHaveBeenCalledTimes(2));
    expect(uploadPhoto.mock.calls.map((call) => call[0].file.name)).toEqual(['a.jpg', 'b.jpg']);
    expect(uploadPhoto.mock.calls.every((call) => call[0].bucket === 'portfolio')).toBe(true);
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('2 uploads complete.')).toBeInTheDocument();
  });

  it('continues after a failure and still refreshes when some uploads succeed', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    uploadPhoto.mockReset();
    uploadPhoto.mockRejectedValueOnce(new Error('R2 put failed')).mockResolvedValueOnce({
      id: 'ok',
      bucket: 'portfolio',
      status: 'ready',
      variants: ['sm'],
    });

    const { container } = render(<AdminPhotoUpload bucket="portfolio" onSuccess={onSuccess} />);

    const input = screen.getByLabelText('Photos');
    await user.upload(input, [imageFile('bad.jpg'), imageFile('good.jpg')]);
    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => expect(uploadPhoto).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(
      await screen.findByText('1 uploaded, 1 failed. First error: bad.jpg: R2 put failed'),
    ).toBeInTheDocument();
  });
});
