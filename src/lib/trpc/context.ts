import { env } from 'cloudflare:workers';

import { accessEnvFrom } from '../cloudflare-env.ts';
import type { AccessIdentity } from '../access/verify-jwt.ts';
import type { AccessEnv } from '../access/verify-jwt.ts';
import type { AppEnv } from '../env.ts';
import { AppEnv as AppEnvFactory } from '../env.ts';

export type TrpcContext = {
	request: Request;
	accessEnv: AccessEnv;
	/** Set after first successful JWT verify in a batch (same HTTP request). */
	accessIdentity?: AccessIdentity;
	getAppEnv: () => AppEnv;
	getIngestAppEnv: () => AppEnv;
};

export function createTrpcContext(input: { request: Request }): TrpcContext {
	let appEnv: AppEnv | undefined;
	let ingestAppEnv: AppEnv | undefined;
	return {
		request: input.request,
		accessEnv: accessEnvFrom(env),
		getAppEnv() {
			appEnv ??= AppEnvFactory.fromBindings(env);
			return appEnv;
		},
		getIngestAppEnv() {
			ingestAppEnv ??= AppEnvFactory.from(env);
			return ingestAppEnv;
		},
	};
}
