import { createHash, timingSafeEqual } from 'crypto';

// Pure Cloudinary signing/URL helpers. Cloudinary's signature is a documented,
// stable SHA-1 scheme, so we implement it with Node's built-in `crypto` rather
// than pulling in the SDK — no extra dependency, no network, fully unit-testable.

export interface CloudinaryCredentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

// Parse the standard CLOUDINARY_URL form `cloudinary://<api_key>:<api_secret>@<cloud_name>`.
// Returns null when absent or malformed so the caller can treat media uploads as
// "not configured" (503) instead of crashing at boot.
export function parseCloudinaryUrl(raw: string | undefined | null): CloudinaryCredentials | null {
  if (!raw) return null;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'cloudinary:') return null;
  const apiKey = decodeURIComponent(parsed.username);
  const apiSecret = decodeURIComponent(parsed.password);
  const cloudName = parsed.hostname;
  if (!apiKey || !apiSecret || !cloudName) return null;
  return { cloudName, apiKey, apiSecret };
}

// Cloudinary signs a request by sorting the params by key, joining as `k=v` with
// `&`, appending the api_secret, and taking the SHA-1 hex digest. Empty values are
// dropped. Used both to sign an upload request and to recompute a response signature.
export function signCloudinaryParams(
  params: Record<string, string | number>,
  apiSecret: string,
): string {
  const toSign = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== '')
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return createHash('sha1')
    .update(`${toSign}${apiSecret}`)
    .digest('hex');
}

// Verify the signature Cloudinary returns on an upload response. Cloudinary signs
// over `public_id` + `version`, so recomputing and comparing proves the
// (public_id, version) genuinely came from Cloudinary and was not forged by the
// client at commit time. Constant-time comparison avoids a timing side channel.
export function verifyCloudinaryUpload(
  publicId: string,
  version: number | string,
  signature: string,
  apiSecret: string,
): boolean {
  const expected = signCloudinaryParams({ public_id: publicId, version }, apiSecret);
  const expectedBuf = Buffer.from(expected, 'hex');
  const actualBuf = Buffer.from(signature, 'hex');
  if (expectedBuf.length === 0 || expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

// Build a public delivery URL for a stored asset. `f_auto,q_auto` re-encodes the
// image on delivery, which optimizes format/quality AND strips EXIF/GPS metadata
// (privacy: a seller's photo may carry their home coordinates — FILE_STORAGE §4).
export function buildCloudinaryDeliveryUrl(cloudName: string, publicId: string): string {
  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto/${publicId}`;
}
