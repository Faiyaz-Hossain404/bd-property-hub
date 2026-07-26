'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ApiError } from '@/lib/api';

// Every browser tab/request gets its own QueryClient (created lazily via
// useState, not a module-level singleton) — a shared instance would leak one
// user's cached data into another's render on the server.
const FIVE_MINUTES = 1000 * 60 * 5;
const MAX_RETRIES = 3;

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: FIVE_MINUTES,
            // Don't burn 3 backoff rounds on a client error that won't change on
            // retry — a 401/403/404 (ApiError carries the HTTP status) should
            // surface immediately. Keep retrying network failures (status 0) and
            // 5xx, matching the library default count.
            retry: (failureCount, error) => {
              if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
                return false;
              }
              return failureCount < MAX_RETRIES;
            },
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
