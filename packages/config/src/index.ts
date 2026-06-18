/**
 * Cross-cutting runtime configuration shared by web, api, and workers.
 * Type definitions live in `@bdph/types`; this package holds concrete values
 * (limits, defaults, brand tokens) so they are defined exactly once.
 */

// Brand palette (IMPLEMENTATION_PLAN.md §5, warm editorial) — mirrors the CSS
// tokens in apps/web so server-rendered surfaces (emails, PDFs) stay on-brand.
export const BRAND = {
  primary: '#B5654A', // terracotta
  olive: '#8E9070',
  ochre: '#D8A24E',
  dustyBlue: '#A9C3CA',
  cream: '#ECDCB6',
  danger: '#B23A2E',
} as const;

// Cursor pagination defaults (API_DESIGN.md).
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Listing media limits (FILE_STORAGE_ARCHITECTURE.md).
export const MAX_LISTING_IMAGES = 20;
export const MAX_LISTING_VIDEOS = 1;
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200 MB
