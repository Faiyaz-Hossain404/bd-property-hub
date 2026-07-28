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
  // Pages only. Matchers are OR'd, so each one has to exclude non-page requests
  // on its own — the third pattern's exclusions do nothing for a path the second
  // one already matched.
  //
  //   '/'                      the root, which redirects to a locale
  //   '/(en|bn)/((?!.*\\..*).*)'  locale-prefixed pages, minus anything with a
  //                            dot in it. Without that inner lookahead this
  //                            pattern re-admits every static file requested
  //                            under a locale prefix (/en/logo.png), and both
  //                            Clerk and next-intl would run for an image.
  //   '/((?!api|_next|...))'   everything else that isn't an API route, a Next
  //                            internal (_next/static, _next/image), a Vercel
  //                            internal, or a file with an extension.
  matcher: ['/', '/(en|bn)/((?!.*\\..*).*)', '/((?!api|_next|_vercel|.*\\..*).*)'],
};
