import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

// Neutral pulsing placeholder for route-level loading.tsx screens. Uses a
// higher-contrast stone shade (not the faint `bg-muted` token) so card shapes,
// header blocks, and text bars stay clearly visible against the off-white
// background rather than nearly blending into it.
function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('animate-pulse rounded-md bg-stone-200/80 dark:bg-stone-800', className)}
      {...props}
    />
  );
}

export { Skeleton };
