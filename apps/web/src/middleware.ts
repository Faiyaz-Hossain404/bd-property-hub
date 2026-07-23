import { clerkMiddleware } from '@clerk/nextjs/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

// Clerk's middleware establishes the auth context, then defers routing to
// next-intl (the official way to combine the two: return the other middleware
// from clerkMiddleware). We don't protect routes here — the app already gates
// authenticated pages client-side via useCurrentUser, and Clerk recommends
// protecting at the resource, not in middleware.
export default clerkMiddleware((auth, req) => intlMiddleware(req));

export const config = {
  // Run on everything except API routes, Next internals, and static files.
  matcher: ['/', '/(en|bn)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)'],
};
