import { parseMediaPath, type ParsedMediaPath } from './parse-media-path.ts';

export type MediaObject = {
  body: ReadableStream | null;
  httpMetadata?: { contentType?: string };
  httpEtag?: string;
};

export type BuildVariantMediaResponseOptions = {
  path: string;
  isAllowed: (id: string) => Promise<boolean>;
  getObject: (r2Key: string) => Promise<MediaObject | null>;
  cacheControl: string;
  extraHeaders?: Record<string, string>;
  parsePath?: (path: string) => ParsedMediaPath;
  contentDispositionFilename?: (id: string) => Promise<string | null>;
};

const NOT_FOUND = () => new Response('Not Found', { status: 404 });

/**
 * Shared GET pipeline for variant media: parse → allow → R2 get → Cache-Control /
 * Content-Type / ETag (+ optional headers).
 */
export async function buildVariantMediaResponse(
  options: BuildVariantMediaResponseOptions,
): Promise<Response> {
  const parse = options.parsePath ?? ((mediaPath: string) => parseMediaPath(mediaPath));
  const parsed = parse(options.path);
  if (!parsed.ok) {
    return NOT_FOUND();
  }

  const allowed = await options.isAllowed(parsed.id);
  if (!allowed) {
    return NOT_FOUND();
  }

  const object = await options.getObject(parsed.r2Key);
  if (!object) {
    return NOT_FOUND();
  }

  const headers = new Headers();
  headers.set('Cache-Control', options.cacheControl);
  if (parsed.isOriginal && options.contentDispositionFilename) {
    const filename = await options.contentDispositionFilename(parsed.id);
    if (filename) {
      headers.set('Content-Disposition', `attachment; filename="${filename.replaceAll('"', '')}"`);
    }
  }
  if (options.extraHeaders) {
    for (const [name, value] of Object.entries(options.extraHeaders)) {
      headers.set(name, value);
    }
  }
  const contentType = object.httpMetadata?.contentType;
  if (contentType) {
    headers.set('Content-Type', contentType);
  }
  const etag = object.httpEtag;
  if (etag) {
    headers.set('ETag', etag);
  }

  return new Response(object.body, { status: 200, headers });
}
