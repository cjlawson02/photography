import { env as workerEnv } from 'cloudflare:workers';

import { createDb } from '../db/client.ts';
import {
	getCloudflareBindings,
	getCloudflareEnv,
	type CloudflareAppEnv,
} from './cloudflare-env.ts';
import { D1DAO, ImagesDAO, R2DAO } from './dao/index.ts';

const GLOBAL_KEY = '__lawsonPhotographyEnv' as const;

type GlobalEnvCache = typeof globalThis & {
	[GLOBAL_KEY]?: AppEnv;
};

/**
 * Slim request bootstrap — wires D1 / R2 / Images DAOs once per isolate.
 * Requires parsed ingest env (R2 S3 secrets). Health uses `bindingHealth` instead.
 * No Clerk, Sentry, stages, or rate limiter (not in this app).
 */
export class AppEnv {
	readonly d1: D1DAO;
	readonly images: ImagesDAO;
	readonly r2: R2DAO;

	private constructor(parsed: CloudflareAppEnv) {
		this.d1 = D1DAO.getInstance(createDb(parsed.DB));
		this.images = ImagesDAO.getInstance(parsed.IMAGES);
		this.r2 = R2DAO.getInstance(
			{ PORTFOLIO: parsed.PORTFOLIO, REVIEW: parsed.REVIEW },
			{
				accountId: parsed.R2_ACCOUNT_ID,
				accessKeyId: parsed.R2_ACCESS_KEY_ID,
				secretAccessKey: parsed.R2_SECRET_ACCESS_KEY,
			},
		);
	}

	static from(cf: Cloudflare.Env = workerEnv): AppEnv {
		const g = globalThis as GlobalEnvCache;
		if (!g[GLOBAL_KEY]) {
			g[GLOBAL_KEY] = new AppEnv(getCloudflareEnv(cf));
		}
		return g[GLOBAL_KEY];
	}

	/** Test / local reset helper. */
	static reset(): void {
		const g = globalThis as GlobalEnvCache;
		g[GLOBAL_KEY] = undefined;
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
