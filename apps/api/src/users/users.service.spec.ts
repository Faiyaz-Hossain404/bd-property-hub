import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Model } from 'mongoose';
import { UsersService } from './users.service';
import type { UserDocument } from './schemas/user.schema';

// A minimal UserDocument stand-in — only the fields ensureAdminPrime reads.
// Default is a verified, active buyer (the state in which elevation is allowed).
function fakeUser(overrides: Partial<UserDocument> = {}): UserDocument {
  return {
    id: 'user_1',
    email: 'owner@example.com',
    emailVerified: true,
    status: 'active',
    role: 'buyer',
    ...overrides,
  } as unknown as UserDocument;
}

// Build a UsersService with a stubbed Mongo model + a config that only knows
// SUPER_ADMIN_EMAIL. The service reads the value once in its constructor.
function makeService(
  superAdminEmail: string | undefined,
  findByIdAndUpdate: jest.Mock = jest.fn(),
): { service: UsersService; findByIdAndUpdate: jest.Mock } {
  const config = {
    get: (key: string) => (key === 'SUPER_ADMIN_EMAIL' ? superAdminEmail : undefined),
  } as unknown as ConfigService;
  const model = { findByIdAndUpdate } as unknown as Model<UserDocument>;
  return { service: new UsersService(model, config), findByIdAndUpdate };
}

describe('UsersService.ensureAdminPrime', () => {
  beforeAll(() => {
    // Keep the audit log out of the test output; the message itself isn't asserted.
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('sets the single admin_prime role (clearing any legacy array) for a verified, active match', async () => {
    const elevated = fakeUser({ role: 'admin_prime' });
    const findByIdAndUpdate = jest.fn().mockReturnValue({ exec: () => Promise.resolve(elevated) });
    const { service } = makeService('owner@example.com', findByIdAndUpdate);

    const result = await service.ensureAdminPrime(fakeUser({ role: 'buyer' }));

    expect(result.role).toBe('admin_prime');
    expect(findByIdAndUpdate).toHaveBeenCalledWith(
      'user_1',
      { $set: { role: 'admin_prime' }, $unset: { roles: 1 } },
      { new: true },
    );
  });

  it('matches the configured email case-insensitively and trims whitespace', async () => {
    const elevated = fakeUser({ role: 'admin_prime' });
    const findByIdAndUpdate = jest.fn().mockReturnValue({ exec: () => Promise.resolve(elevated) });
    const { service } = makeService('  Owner@Example.com ', findByIdAndUpdate);

    await service.ensureAdminPrime(fakeUser({ email: 'owner@example.com', role: 'buyer' }));

    expect(findByIdAndUpdate).toHaveBeenCalled();
  });

  it('does NOT elevate an unverified account, even when the email matches', async () => {
    // The core of the security fix: registration issues a session before the email
    // is verified, so an unverified match must never be elevated.
    const { service, findByIdAndUpdate } = makeService('owner@example.com');
    const user = fakeUser({ emailVerified: false, role: 'buyer' });

    const result = await service.ensureAdminPrime(user);

    expect(result).toBe(user);
    expect(findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('does NOT elevate a non-active (e.g. suspended) account, even when verified and matching', async () => {
    const { service, findByIdAndUpdate } = makeService('owner@example.com');
    const user = fakeUser({ status: 'suspended', role: 'buyer' });

    const result = await service.ensureAdminPrime(user);

    expect(result).toBe(user);
    expect(findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('is a no-op (no write) when the role is already admin_prime', async () => {
    const { service, findByIdAndUpdate } = makeService('owner@example.com');
    const user = fakeUser({ role: 'admin_prime' });

    const result = await service.ensureAdminPrime(user);

    expect(result).toBe(user);
    expect(findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('recognises a pre-migration owner (legacy super_admin array, no role field) as already-prime', async () => {
    const { service, findByIdAndUpdate } = makeService('owner@example.com');
    // effectiveRole collapses the legacy 'super_admin' value to admin_prime, so no
    // re-write is issued while the backfill has not yet run.
    const user = fakeUser({ role: undefined, roles: ['super_admin'] } as Partial<UserDocument>);

    const result = await service.ensureAdminPrime(user);

    expect(result).toBe(user);
    expect(findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('is a no-op for a non-matching email', async () => {
    const { service, findByIdAndUpdate } = makeService('owner@example.com');
    const user = fakeUser({ email: 'someone-else@example.com', role: 'buyer' });

    const result = await service.ensureAdminPrime(user);

    expect(result).toBe(user);
    expect(findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('never elevates anyone when SUPER_ADMIN_EMAIL is unset', async () => {
    const { service, findByIdAndUpdate } = makeService(undefined);
    const user = fakeUser({ role: 'buyer' });

    const result = await service.ensureAdminPrime(user);

    expect(result).toBe(user);
    expect(findByIdAndUpdate).not.toHaveBeenCalled();
  });
});
