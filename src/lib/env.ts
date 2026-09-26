import { env as workerEnv } from 'cloudflare:workers';

import { createDb } from '../db/client.ts';
import {
	getCloudflareBindings,
	getCloudflareEnv,
	type CloudflareAppEnv,
	type CloudflareBindings,
} from './cloudflare-env.ts';
import { D1DAO, ImagesDAO, R2DAO } from './dao/index.ts';

const BINDINGS_KEY = '__lawsonPhotographyBindingsEnv' as const;
const INGEST_KEY = '__lawsonPhotographyIngestEnv' as const;

type GlobalEnvCache = typeof globalThis & {
	[BINDINGS_KEY]?: AppEnv;
	[INGEST_KEY]?: AppEnv;
};

/**
 * Slim request bootstrap — wires D1 / R2 / Images DAOs once per isolate.
 * `fromBindings` — D1 + binding R2 (no R2 S3 secrets); admin list/update and R2 cleanup via bindings.
 * `from` — full ingest env (presigned PUT); fail-fast if R2_* unset.
 * Health uses `bindingHealth` instead.
 */
export class AppEnv {
	readonly d1: D1DAO;
	readonly images: ImagesDAO;
	readonly r2: R2DAO;

	private constructor(parsed: CloudflareBindings | CloudflareAppEnv, mode: 'bindings' | 'ingest') {
		const bindings = parsed as CloudflareBindings;
		this.d1 = D1DAO.getInstance(createDb(bindings.DB));
		this.images = ImagesDAO.getInstance(bindings.IMAGES);
		if (mode === 'ingest') {
			const full = parsed as CloudflareAppEnv;
			this.r2 = R2DAO.getIngestInstance(
				{ PORTFOLIO: bindings.PORTFOLIO, REVIEW: bindings.REVIEW },
				{
					accountId: full.R2_ACCOUNT_ID,
					accessKeyId: full.R2_ACCESS_KEY_ID,
					secretAccessKey: full.R2_SECRET_ACCESS_KEY,
				},
			);
		} else {
			this.r2 = R2DAO.getBindingsInstance({
				PORTFOLIO: bindings.PORTFOLIO,
				REVIEW: bindings.REVIEW,
			});
		}
	}

	/** Bindings only — no R2 S3 API secrets (safe before auth / when secrets unset). */
	static fromBindings(cf: Cloudflare.Env = workerEnv): AppEnv {
		const g = globalThis as GlobalEnvCache;
		if (!g[BINDINGS_KEY]) {
			g[BINDINGS_KEY] = new AppEnv(getCloudflareBindings(cf), 'bindings');
		}
		return g[BINDINGS_KEY];
	}

	/** Full ingest env — bindings + required R2 S3 secrets. */
	static from(cf: Cloudflare.Env = workerEnv): AppEnv {
		const g = globalThis as GlobalEnvCache;
		if (!g[INGEST_KEY]) {
			g[INGEST_KEY] = new AppEnv(getCloudflareEnv(cf), 'ingest');
		}
		return g[INGEST_KEY];
	}

	/** Test / local reset helper. */
	static reset(): void {
		const g = globalThis as GlobalEnvCache;
		g[BINDINGS_KEY] = undefined;
		g[INGEST_KEY] = undefined;
		D1DAO.resetInstance();
		R2DAO.resetInstance();
		ImagesDAO.resetInstance();
	}
}

/**
 * Bindings + D1/Images DAO presence for `/health` (no R2 S3 secrets).
 * Ingest routes must use `AppEnv.from` (fail-fast if R2_* unset).
 */
export function bindingHealth(raw: unknown): {
	bindings: { db: boolean; portfolio: boolean; review: boolean; images: boolean };
	daos: { d1: boolean; images: boolean };
} {
	const bindings = getCloudflareBindings(raw);
	const d1 = D1DAO.getInstance(createDb(bindings.DB));
	const images = ImagesDAO.getInstance(bindings.IMAGES);
	return {
		bindings: {
			db: Boolean(bindings.DB),
			portfolio: Boolean(bindings.PORTFOLIO),
			review: Boolean(bindings.REVIEW),
			images: Boolean(bindings.IMAGES),
		},
		daos: {
			d1: Boolean(d1),
			images: Boolean(images),
		},
	};
}
