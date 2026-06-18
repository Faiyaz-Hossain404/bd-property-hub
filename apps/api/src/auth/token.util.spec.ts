import { createSessionToken, hashToken } from './token.util';

describe('token.util', () => {
  it('produces a long random raw token and a 64-char sha256 hash', () => {
    const { raw, hash } = createSessionToken();

    expect(raw.length).toBeGreaterThanOrEqual(40);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generates a different token each call', () => {
    expect(createSessionToken().raw).not.toBe(createSessionToken().raw);
  });

  it('hashes deterministically', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc')).not.toBe(hashToken('abd'));
  });
});
