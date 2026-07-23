import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parse as parseEnv } from 'dotenv';
import createNextIntlPlugin from 'next-intl/plugin';

// Shared config lives in the monorepo root .env (single source of truth), but Next
// only reads .env from this app's folder. Load ONLY the keys this app legitimately
// needs — the public NEXT_PUBLIC_* values and the Clerk secret key that
// clerkMiddleware uses server-side — so unrelated server secrets (DB URI, JWT and
// session secrets, email keys) never enter the web process at all. Runs before the
// config is built so NEXT_PUBLIC_* values are inlined into the client bundle.
function loadRootEnv() {
  try {
    const rootEnv = resolve(dirname(fileURLToPath(import.meta.url)), '../../.env');
    const parsed = parseEnv(readFileSync(rootEnv));
    for (const [key, value] of Object.entries(parsed)) {
      const isAllowed = key.startsWith('NEXT_PUBLIC_') || key === 'CLERK_SECRET_KEY';
      if (isAllowed && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // Root .env is optional (e.g. CI providing real env vars directly).
  }
}
loadRootEnv();

// Points next-intl at the per-request i18n config (locale + messages).
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Shared workspace package ships TS source, so Next must transpile it.
  transpilePackages: ['@bdph/types'],
};

export default withNextIntl(nextConfig);
