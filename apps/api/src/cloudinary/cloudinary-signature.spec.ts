import { commitListingMediaInputSchema } from '@bdph/types';
import {
  buildCloudinaryDeliveryUrl,
  parseCloudinaryUrl,
  signCloudinaryParams,
  verifyCloudinaryUpload,
} from './cloudinary-signature';

// Pure tests for the Cloudinary signing + URL helpers. Signature verification is
// the security boundary at commit time (it proves an asset really came from
// Cloudinary), so the accept/reject cases are the highest-value behavior to lock.
describe('parseCloudinaryUrl', () => {
  it('parses a well-formed CLOUDINARY_URL', () => {
    expect(parseCloudinaryUrl('cloudinary://key123:secret456@mycloud')).toEqual({
      cloudName: 'mycloud',
      apiKey: 'key123',
      apiSecret: 'secret456',
    });
  });

  it('returns null for missing or empty input', () => {
    expect(parseCloudinaryUrl(undefined)).toBeNull();
    expect(parseCloudinaryUrl(null)).toBeNull();
    expect(parseCloudinaryUrl('')).toBeNull();
  });

  it('returns null for the wrong scheme', () => {
    expect(parseCloudinaryUrl('https://key:secret@mycloud')).toBeNull();
  });

  it('returns null when key/secret are absent', () => {
    expect(parseCloudinaryUrl('cloudinary://mycloud')).toBeNull();
  });

  it('returns null for a non-URL string', () => {
    expect(parseCloudinaryUrl('not a url')).toBeNull();
  });
});

describe('signCloudinaryParams', () => {
  it('is deterministic for the same inputs', () => {
    const a = signCloudinaryParams({ folder: 'listings/abc', timestamp: 1000 }, 'secret');
    const b = signCloudinaryParams({ folder: 'listings/abc', timestamp: 1000 }, 'secret');
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{40}$/); // SHA-1 hex
  });

  it('is independent of key order (params are sorted)', () => {
    const a = signCloudinaryParams({ folder: 'x', timestamp: 1 }, 'secret');
    const b = signCloudinaryParams({ timestamp: 1, folder: 'x' }, 'secret');
    expect(a).toBe(b);
  });

  it('changes with the secret', () => {
    const a = signCloudinaryParams({ folder: 'x', timestamp: 1 }, 'secretA');
    const b = signCloudinaryParams({ folder: 'x', timestamp: 1 }, 'secretB');
    expect(a).not.toBe(b);
  });

  it('ignores empty-valued params', () => {
    const withEmpty = signCloudinaryParams({ folder: 'x', timestamp: 1, extra: '' }, 'secret');
    const without = signCloudinaryParams({ folder: 'x', timestamp: 1 }, 'secret');
    expect(withEmpty).toBe(without);
  });
});

describe('verifyCloudinaryUpload', () => {
  const SECRET = 'top-secret';
  const PUBLIC_ID = 'listings/64b/photo-abc';
  const VERSION = 1712345678;
  const goodSignature = signCloudinaryParams({ public_id: PUBLIC_ID, version: VERSION }, SECRET);

  it('accepts a signature it generated itself', () => {
    expect(verifyCloudinaryUpload(PUBLIC_ID, VERSION, goodSignature, SECRET)).toBe(true);
  });

  it('rejects a tampered version', () => {
    expect(verifyCloudinaryUpload(PUBLIC_ID, VERSION + 1, goodSignature, SECRET)).toBe(false);
  });

  it('rejects a tampered public id', () => {
    expect(verifyCloudinaryUpload('listings/other/x', VERSION, goodSignature, SECRET)).toBe(false);
  });

  it('rejects the wrong secret', () => {
    expect(verifyCloudinaryUpload(PUBLIC_ID, VERSION, goodSignature, 'wrong-secret')).toBe(false);
  });

  it('rejects a forged or malformed signature', () => {
    expect(verifyCloudinaryUpload(PUBLIC_ID, VERSION, 'deadbeef', SECRET)).toBe(false);
    expect(verifyCloudinaryUpload(PUBLIC_ID, VERSION, 'not-hex!!', SECRET)).toBe(false);
    expect(verifyCloudinaryUpload(PUBLIC_ID, VERSION, '', SECRET)).toBe(false);
  });
});

describe('buildCloudinaryDeliveryUrl', () => {
  it('builds an f_auto,q_auto delivery URL (optimizes + strips EXIF)', () => {
    expect(buildCloudinaryDeliveryUrl('mycloud', 'listings/abc/photo1')).toBe(
      'https://res.cloudinary.com/mycloud/image/upload/f_auto,q_auto/listings/abc/photo1',
    );
  });
});

describe('commitListingMediaInputSchema', () => {
  const valid = {
    publicId: 'listings/abc/x',
    version: 12,
    signature: 'abc123',
    resourceType: 'image',
    format: 'jpg',
    bytes: 1000,
    width: 800,
    height: 600,
  };

  it('accepts a valid commit body', () => {
    expect(commitListingMediaInputSchema.parse(valid).publicId).toBe('listings/abc/x');
  });

  it('coerces numeric fields sent as strings', () => {
    const parsed = commitListingMediaInputSchema.parse({ ...valid, version: '12', bytes: '1000' });
    expect(parsed.version).toBe(12);
    expect(parsed.bytes).toBe(1000);
  });

  it('rejects an empty public id', () => {
    expect(() => commitListingMediaInputSchema.parse({ ...valid, publicId: '' })).toThrow();
  });
});
