/** Minimal Worker entry for Vitest workerd pool (not the Astro SSR / Sentry entry). */
export default {
  fetch() {
    return new Response('ok');
  },
};
