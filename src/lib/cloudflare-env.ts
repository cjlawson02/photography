import { z } from 'zod/v4';

import type { AccessEnv } from './access/verify-jwt.ts';
import { requiredTrimmedString } from '../db/schema/types.ts';
import { R2ConfigError } from './dao/r2-dao.ts';

function isBinding(value: unknown): boolean {
  return value != null && typeof value === 'object';
}

function binding<T>(label: string) {
  return z.custom<T>((value) => isBinding(value), { message: `${label} binding missing` });
}

/**
 * Empty wrangler placeholders (`""`) count as unset.
 * When a value is present it must be a non-empty trimmed string.
 */
const optionalConfiguredString = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}, z.string().min(1).optional());

/** Bindings required for health / DAO presence — no R2 S3 secrets. */
export const cloudflareBindingsSchema = z.object({
  DB: binding<D1Database>('DB'),
  PORTFOLIO: binding<R2Bucket>('PORTFOLIO'),
  REVIEW: binding<R2Bucket>('REVIEW'),
  IMAGES: binding<ImagesBinding>('IMAGES'),
});

export const r2SecretsSchema = z.object({
  R2_ACCOUNT_ID: requiredTrimmedString,
  R2_ACCESS_KEY_ID: requiredTrimmedString,
  R2_SECRET_ACCESS_KEY: requiredTrimmedString,
});

export const accessEnvSchema = z.object({
  CF_ACCESS_TEAM_DOMAIN: optionalConfiguredString,
  CF_ACCESS_AUD: optionalConfiguredString,
});

/** Full ingest env — bindings + required R2 S3 secrets + optional Access vars. */
export const cloudflareEnvSchema = cloudflareBindingsSchema.extend(r2SecretsSchema.shape).extend({
  CF_ACCESS_TEAM_DOMAIN: optionalConfiguredString,
  CF_ACCESS_AUD: optionalConfiguredString,
});

export type CloudflareBindings = z.infer<typeof cloudflareBindingsSchema>;

export type CloudflareAppEnv = z.infer<typeof cloudflareEnvSchema> & {
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
};

export function getCloudflareBindings(raw: unknown): CloudflareBindings {
  return cloudflareBindingsSchema.parse(raw);
}

/**
 * Parse Worker env for ingest / AppEnv (FamilyNotes-style bindings + R2 secrets; optional Sentry via Worker entry).
 * Missing R2 S3 secrets throw `R2ConfigError` (admin maps to 503).
 */
export function getCloudflareEnv(raw: unknown): CloudflareAppEnv {
  const bindings = cloudflareBindingsSchema.parse(raw);
  const access = accessEnvSchema.parse(raw);
  const secrets = r2SecretsSchema.safeParse(raw);
  if (!secrets.success) {
    throw new R2ConfigError(
      'R2 S3 secrets not configured (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY)',
    );
  }
  return {
    ...bindings,
    ...secrets.data,
    CF_ACCESS_TEAM_DOMAIN: access.CF_ACCESS_TEAM_DOMAIN,
    CF_ACCESS_AUD: access.CF_ACCESS_AUD,
  };
}

/** Access JWT config — empty placeholders stay unset (verify still 403s). */
export function accessEnvFrom(raw: unknown): AccessEnv {
  const parsed = accessEnvSchema.parse(raw);
  return {
    CF_ACCESS_TEAM_DOMAIN: parsed.CF_ACCESS_TEAM_DOMAIN ?? '',
    CF_ACCESS_AUD: parsed.CF_ACCESS_AUD ?? '',
  };
}
