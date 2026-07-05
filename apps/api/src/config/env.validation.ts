import { z } from 'zod';

/**
 * Boundary validation for the API process environment. Unknown keys (Clerk,
 * Resend, storage, etc.) are passed through untouched so other modules can read
 * them; the keys below are the ones the core bootstrap depends on.
 */
const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_PORT: z.coerce.number().int().positive().default(4000),
    API_GLOBAL_PREFIX: z.string().default('api'),
    CORS_ORIGINS: z.string().default(''),
    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
    MONGODB_DB_NAME: z.string().default('bdph'),
    REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
    // Express `trust proxy` setting, so req.ip reflects the real client (not the
    // load balancer) for IP rate limiting. Leave unset for direct exposure / local
    // dev. Behind exactly one proxy set TRUST_PROXY=1; 'true'/'false' and a subnet
    // string are also accepted. Do NOT trust more hops than actually sit in front
    // of the API, or a client can spoof X-Forwarded-For to dodge the rate limit.
    TRUST_PROXY: z.string().optional(),
    // Global per-IP rate limit: THROTTLE_LIMIT requests per THROTTLE_TTL_SECONDS.
    // Sensitive auth routes get a tighter limit of their own (see AuthController).
    THROTTLE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
    THROTTLE_LIMIT: z.coerce.number().int().positive().default(120),
    // Optional: listing photo uploads are disabled (routes 503) until this is set.
    // Form: cloudinary://<api_key>:<api_secret>@<cloud_name>
    CLOUDINARY_URL: z.string().optional(),
    // Base URL of the web app, used to build the verify-email / reset-password
    // links sent by email. Locale is appended per-user. Validated as a URL so a
    // misconfigured value fails fast at boot instead of producing broken links.
    APP_BASE_URL: z.string().url().default('http://localhost:3000'),
    // Transactional email (Resend). Optional: when unset, emails are logged in
    // dev and dropped in production instead of sent.
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().default('BD Property Hub <no-reply@bdpropertyhub.test>'),
  })
  .passthrough();

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error(`Invalid environment variables:\n${parsed.error.toString()}`);
  }
  return parsed.data;
}
