import { env } from 'cloudflare:workers';

import { accessEnvFrom } from '../cloudflare-env.ts';
import type { AccessEnv } from '../access/verify-jwt.ts';
import type { AppEnv } from '../env.ts';
import { AppEnv as AppEnvFactory } from '../env.ts';

export type TrpcContext = {
	request: Request;
	accessEnv: AccessEnv;
	appEnv: AppEnv;
};

export function createTrpcContext(input: { request: Request }): TrpcContext {
	return {
		request: input.request,
		accessEnv: accessEnvFrom(env),
		appEnv: AppEnvFactory.from(env),
	};
}
