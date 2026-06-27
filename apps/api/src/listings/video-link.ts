import { VIDEO_LINK_HOSTS, MAX_VIDEO_LINK_LENGTH, type NormalizedVideoLink } from '@bdph/types';

// Validate + canonicalize a seller-supplied video tour link (DATABASE_DESIGN.md
// §5 `video_link`; FILE_STORAGE_ARCHITECTURE.md §4b/§10). The value is stored and
// later embedded for the public, so the rules are strict and security-driven:
//   - HTTPS only — blocks `javascript:`/`data:` (stored-XSS) and http embeds that
//     would be mixed-content-blocked on the site anyway.
//   - Host allowlist (VIDEO_LINK_HOSTS) — no arbitrary third-party origins.
//   - No embedded credentials — `https://anything@evil/` style spoofs are out.
//   - Length-bounded.
// We parse with the WHATWG `URL` global rather than a hand-rolled regex, which is
// far less prone to host-confusion bypasses. Returns null when the link is not
// acceptable; the caller turns that into a 400. Lives in the API (not @bdph/types)
// because `URL` is a Node/DOM global not in that package's ES2022 lib.
export function normalizeVideoLink(raw: string): NormalizedVideoLink | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_VIDEO_LINK_LENGTH) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:') return null;
  if (parsed.username !== '' || parsed.password !== '') return null;

  const provider = VIDEO_LINK_HOSTS[parsed.hostname.toLowerCase()];
  if (!provider) return null;

  return { url: parsed.href, provider };
}
