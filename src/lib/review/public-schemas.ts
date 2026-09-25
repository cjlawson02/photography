import { z } from 'zod/v4';

import { idSchema, selectionStatusSchema } from '../../db/schema/types.ts';

/** POST `/review/api/selection` — link-secrecy only; slug must match the photo's collection. */
export const reviewSelectionBodySchema = z.object({
	slug: z.string().trim().min(1),
	photoId: idSchema,
	selectionStatus: selectionStatusSchema,
});
