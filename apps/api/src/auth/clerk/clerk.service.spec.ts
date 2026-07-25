import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

// Mock the Clerk SDK so these stay pure unit tests (no network / no JWKS fetch).
jest.mock('@clerk/backend', () => ({
  verifyToken: jest.fn(),
  createClerkClient: jest.fn(),
}));

import { verifyToken } from '@clerk/backend';
import { ClerkService } from './clerk.service';

const mockVerifyToken = verifyToken as jest.Mock;

// A ConfigService stub that just reads from a plain env map.
function makeService(env: Record<string, string | undefined>): ClerkService {
  const config = { get: (key: string) => env[key] } as unknown as ConfigService;
  return new ClerkService(config);
}

describe('ClerkService.verifySessionToken', () => {
  beforeEach(() => {
    mockVerifyToken.mockReset();
  });

  it('returns the subject (Clerk user id) for a valid token', async () => {
    mockVerifyToken.mockResolvedValue({ data: { sub: 'user_123' } });
    const service = makeService({ CLERK_SECRET_KEY: 'sk_test' });

    await expect(service.verifySessionToken('tok')).resolves.toBe('user_123');
    expect(mockVerifyToken).toHaveBeenCalledWith('tok', { secretKey: 'sk_test' });
  });

  it('returns the subject when verifyToken resolves to a bare payload (real SDK shape)', async () => {
    // @clerk/backend@3.12.0 resolves verifyToken to the decoded JwtPayload DIRECTLY
    // (sub at the top level), not the { data } envelope its types describe. The other
    // tests mock the { data } shape, which hid a bug where every valid token 401'd
    // because the code only read result.data.sub. This asserts the real shape works.
    mockVerifyToken.mockResolvedValue({ sub: 'user_123', iss: 'https://x.clerk.accounts.dev' });
    const service = makeService({ CLERK_SECRET_KEY: 'sk_test' });

    await expect(service.verifySessionToken('tok')).resolves.toBe('user_123');
  });

  it('rejects a token that fails verification', async () => {
    mockVerifyToken.mockResolvedValue({ errors: [new Error('bad signature')] });
    const service = makeService({ CLERK_SECRET_KEY: 'sk_test' });

    await expect(service.verifySessionToken('tok')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('maps a thrown verification error to a 401 (not a 500)', async () => {
    // verifyToken throws (e.g. an absent/mismatched `azp`) instead of returning
    // { errors }; without a try/catch this used to escape as an unhandled 500.
    mockVerifyToken.mockRejectedValue(new Error('Invalid JWT Authorized party claim (azp)'));
    const service = makeService({ CLERK_SECRET_KEY: 'sk_test' });

    await expect(service.verifySessionToken('tok')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('skips the authorized-parties check by default, even when CORS is configured', async () => {
    mockVerifyToken.mockResolvedValue({ data: { sub: 'user_123' } });
    // CORS is set but CLERK_AUTHORIZED_PARTIES is not: the azp check must NOT be
    // derived from CORS, so verifyToken is called without authorizedParties.
    const service = makeService({
      CLERK_SECRET_KEY: 'sk_test',
      CORS_ORIGINS: 'http://localhost:3000',
    });

    await expect(service.verifySessionToken('tok')).resolves.toBe('user_123');
    expect(mockVerifyToken).toHaveBeenCalledWith('tok', { secretKey: 'sk_test' });
  });

  it('enforces authorized parties only when CLERK_AUTHORIZED_PARTIES is set', async () => {
    mockVerifyToken.mockResolvedValue({ data: { sub: 'user_123' } });
    const service = makeService({
      CLERK_SECRET_KEY: 'sk_test',
      CLERK_AUTHORIZED_PARTIES: 'https://app.example.com, https://www.example.com/',
    });

    await service.verifySessionToken('tok');
    expect(mockVerifyToken).toHaveBeenCalledWith('tok', {
      secretKey: 'sk_test',
      authorizedParties: ['https://app.example.com', 'https://www.example.com'],
    });
  });

  it('rejects a verified token that carries no subject', async () => {
    mockVerifyToken.mockResolvedValue({ data: {} });
    const service = makeService({ CLERK_SECRET_KEY: 'sk_test' });

    await expect(service.verifySessionToken('tok')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('is inert (503) and never calls Clerk when the secret key is unset', async () => {
    const service = makeService({});

    expect(service.isConfigured()).toBe(false);
    await expect(service.verifySessionToken('tok')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(mockVerifyToken).not.toHaveBeenCalled();
  });
});
