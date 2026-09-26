import { z } from 'zod/v4';

/** Shared admin delete/revoke flag — default purge R2 when true. */
export const cleanupR2Field = z.boolean().default(true);
