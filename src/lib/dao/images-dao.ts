/**
 * Images Free binding wrapper — compress-once transforms at ingest.
 * Variant widths/puts live in `IngestService` (`src/lib/services/ingest-service.ts`).
 */
export class ImagesDAO {
  private static instance: ImagesDAO | undefined;

  private constructor(private readonly images: ImagesBinding) {}

  static getInstance(images: ImagesBinding): ImagesDAO {
    if (!ImagesDAO.instance) {
      ImagesDAO.instance = new ImagesDAO(images);
    }
    return ImagesDAO.instance;
  }

  static resetInstance(): void {
    ImagesDAO.instance = undefined;
  }

  /** Read natural width/height via Images binding (free; does not transform). */
  async readDimensions(stream: ReadableStream): Promise<{ width: number; height: number } | null> {
    const info = await this.images.info(stream);
    if (!('width' in info) || !('height' in info)) {
      return null;
    }
    return { width: info.width, height: info.height };
  }

  /**
   * Transform an image stream to WebP (quality 80).
   * Callers may chain `.transform({ width, fit })` via the binding before output
   * when the ingest redo wires variant specs.
   */
  async toWebp(
    stream: ReadableStream,
    options?: { width?: number; quality?: number },
  ): Promise<ReadableStream> {
    let pipeline = this.images.input(stream);
    if (options?.width != null) {
      pipeline = pipeline.transform({ width: options.width, fit: 'scale-down' });
    }
    const result = await pipeline.output({
      format: 'image/webp',
      quality: options?.quality ?? 80,
    });
    return result.image();
  }
}
