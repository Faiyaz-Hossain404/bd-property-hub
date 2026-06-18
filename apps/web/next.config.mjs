import createNextIntlPlugin from 'next-intl/plugin';

// Points next-intl at the per-request i18n config (locale + messages).
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Shared workspace package ships TS source, so Next must transpile it.
  transpilePackages: ['@bdph/types'],
};

export default withNextIntl(nextConfig);
