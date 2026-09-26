import { describe, expect, it } from 'vitest';

import { finalFilenameMatchKeys, normalizeReviewFilename } from './filename-match.ts';
import { findMatchedPickId, type ReviewPhotoPickCandidate } from './match-final-to-pick.ts';

function pick(id: string, originalFilename: string | null): ReviewPhotoPickCandidate {
  return { id, round: 'proof', selectionStatus: 'selected', originalFilename };
}

describe('normalizeReviewFilename', () => {
  it('lowercases and drops the extension', () => {
    expect(normalizeReviewFilename(' DSC_1234.CR3 ')).toBe('dsc_1234');
    expect(normalizeReviewFilename('IMG_0042.JPG')).toBe('img_0042');
    expect(normalizeReviewFilename('   ')).toBeNull();
    expect(normalizeReviewFilename(null)).toBeNull();
  });
});

describe('finalFilenameMatchKeys', () => {
  it('peels Lightroom / Photoshop export suffixes most specific first', () => {
    expect(finalFilenameMatchKeys('DSC_1234-Edit-2.jpg')).toEqual([
      'dsc_1234-edit-2',
      'dsc_1234-edit',
      'dsc_1234',
    ]);
    expect(finalFilenameMatchKeys('DSC_1234 copy 2.jpg')).toEqual(['dsc_1234 copy 2', 'dsc_1234']);
    expect(finalFilenameMatchKeys('DSC_1234_edit.tif')).toEqual(['dsc_1234_edit', 'dsc_1234']);
    expect(finalFilenameMatchKeys('IMG_0042-2.jpg')).toEqual(['img_0042-2', 'img_0042']);
  });

  it('does not peel camera frame numbers', () => {
    expect(finalFilenameMatchKeys('IMG_0042.jpg')).toEqual(['img_0042']);
  });
});

describe('findMatchedPickId', () => {
  it('matches a RAW proof to its JPEG export ignoring case and extension', () => {
    expect(
      findMatchedPickId({ originalFilename: 'DSC_1234.jpg' }, [
        pick('p1', 'DSC_1234.CR3'),
        pick('p2', 'DSC_1235.CR3'),
      ]),
    ).toBe('p1');
  });

  it.each(['DSC_1234-Edit.jpg', 'DSC_1234-Edit-2.jpg', 'dsc_1234 copy.jpg', 'DSC_1234_edit.png'])(
    'matches export suffix %s',
    (name) => {
      expect(
        findMatchedPickId({ originalFilename: name }, [
          pick('p1', 'DSC_1234.CR3'),
          pick('p2', 'DSC_1240.CR3'),
        ]),
      ).toBe('p1');
    },
  );

  it('matches a Lightroom duplicate-name export counter', () => {
    expect(
      findMatchedPickId({ originalFilename: 'IMG_0042-2.jpg' }, [pick('p1', 'IMG_0042.HEIC')]),
    ).toBe('p1');
  });

  it('prefers an exact basename over a peeled one', () => {
    expect(
      findMatchedPickId({ originalFilename: 'IMG_0042-2.jpg' }, [
        pick('p1', 'IMG_0042.jpg'),
        pick('p2', 'IMG_0042-2.jpg'),
      ]),
    ).toBe('p2');
  });

  it('only considers picks, not every proof', () => {
    const rows: ReviewPhotoPickCandidate[] = [
      { id: 'unpicked', round: 'proof', selectionStatus: 'none', originalFilename: 'DSC_1.CR3' },
      { id: 'final', round: 'final', selectionStatus: 'none', originalFilename: 'DSC_1.jpg' },
    ];
    expect(findMatchedPickId({ originalFilename: 'DSC_1.jpg' }, rows)).toBeNull();
    expect(
      findMatchedPickId({ originalFilename: 'DSC_1.jpg' }, [
        ...rows,
        {
          id: 'approved',
          round: 'proof',
          selectionStatus: 'approved',
          originalFilename: 'DSC_1.NEF',
        },
      ]),
    ).toBe('approved');
  });

  it('leaves collisions unmatched', () => {
    expect(
      findMatchedPickId({ originalFilename: 'DSC_1234-Edit.jpg' }, [
        pick('raw', 'DSC_1234.CR3'),
        pick('jpg', 'DSC_1234.JPG'),
      ]),
    ).toBeNull();
  });

  it('returns null when nothing lines up or the final has no filename', () => {
    expect(findMatchedPickId({ originalFilename: 'x.jpg' }, [pick('a', 'y.jpg')])).toBeNull();
    expect(findMatchedPickId({ originalFilename: null }, [pick('a', 'y.jpg')])).toBeNull();
    expect(findMatchedPickId({ originalFilename: 'y.jpg' }, [pick('a', null)])).toBeNull();
  });
});
