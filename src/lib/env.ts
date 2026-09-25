import { env as workerEnv } from 'cloudflare:workers';

import { createDb } from '../db/client.ts';
import { D1DAO, ImagesDAO, R2DAO } from './dao/index.ts';

const GLOBAL_KEY = '__lawsonPhotographyEnv' as const;

type GlobalEnvCache = typeof globalThis & {
	[GLOBAL_KEY]?: AppEnv;
};

/**
 * Slim request bootstrap — wires D1 / R2 / Images DAOs once per isolate.
 * No Clerk, Sentry, stages, or rate limiter (not in this app).
 */
export class AppEnv {
	readonly d1: D1DAO;
	readonly images: ImagesDAO;
	readonly r2: R2DAO;

	private constructor(cf: Cloudflare.Env) {
		this.d1 = D1DAO.getInstance(createDb(cf.DB));
		this.images = ImagesDAO.getInstance(cf.IMAGES);
		this.r2 = R2DAO.getInstance(
			{ PORTFOLIO: cf.PORTFOLIO, REVIEW: cf.REVIEW },
			R2DAO.tryReadSecrets({
				R2_ACCOUNT_ID: cf.R2_ACCOUNT_ID,
				R2_ACCESS_KEY_ID: cf.R2_ACCESS_KEY_ID,
				R2_SECRET_ACCESS_KEY: cf.R2_SECRET_ACCESS_KEY,
			}),
		);
	}

	static from(cf: Cloudflare.Env = workerEnv): AppEnv {
		const g = globalThis as GlobalEnvCache;
		if (!g[GLOBAL_KEY]) {
			g[GLOBAL_KEY] = new AppEnv(cf);
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
