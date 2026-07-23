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

  it('rejects a token that fails verification', async () => {
    mockVerifyToken.mockResolvedValue({ errors: [new Error('bad signature')] });
    const service = makeService({ CLERK_SECRET_KEY: 'sk_test' });

    await expect(service.verifySessionToken('tok')).rejects.toBeInstanceOf(UnauthorizedException);
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
