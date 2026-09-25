/**
 * Images Free binding wrapper — compress-once transforms at ingest.
 * Full variant pipeline (widths / put to R2) lands in the ingest redo PR.
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
