/** Vitest stub — real `cloudflare:workers` is only available in workerd. */
export const env = {};

export const cache = {
  async purge(): Promise<{ success: boolean; errors: { code: number; message: string }[] }> {
    return { success: true, errors: [] };
  },
};
