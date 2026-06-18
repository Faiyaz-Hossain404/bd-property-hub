import { createHash, randomBytes } from 'node:crypto';

// Opaque session tokens: a 256-bit random value goes to the client cookie, and
// only its SHA-256 hash is persisted — a DB leak can't be replayed as a cookie.
export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function createSessionToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('base64url');
  return { raw, hash: hashToken(raw) };
}
