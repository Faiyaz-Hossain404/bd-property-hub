'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Every browser tab/request gets its own QueryClient (created lazily via
// useState, not a module-level singleton) — a shared instance would leak one
// user's cached data into another's render on the server.
const FIVE_MINUTES = 1000 * 60 * 5;

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: FIVE_MINUTES,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
