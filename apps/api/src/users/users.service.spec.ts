import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Model } from 'mongoose';
import { UsersService } from './users.service';
import type { UserDocument } from './schemas/user.schema';

// A minimal UserDocument stand-in — only the fields ensureSuperAdmin reads. Default
// is a verified, active buyer (the state in which elevation is allowed to happen).
function fakeUser(overrides: Partial<UserDocument> = {}): UserDocument {
  return {
    id: 'user_1',
    email: 'owner@example.com',
    emailVerified: true,
    status: 'active',
    roles: ['buyer'],
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

describe('UsersService.ensureSuperAdmin', () => {
  beforeAll(() => {
    // Keep the audit log out of the test output; the message itself isn't asserted.
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('grants super_admin (via $addToSet, keeping existing roles) for a verified, active match', async () => {
    const elevated = fakeUser({ roles: ['buyer', 'super_admin'] });
    const findByIdAndUpdate = jest
      .fn()
      .mockReturnValue({ exec: () => Promise.resolve(elevated) });
    const { service } = makeService('owner@example.com', findByIdAndUpdate);

    const result = await service.ensureSuperAdmin(fakeUser({ roles: ['buyer'] }));

    expect(result.roles).toContain('super_admin');
    expect(findByIdAndUpdate).toHaveBeenCalledWith(
      'user_1',
      { $addToSet: { roles: 'super_admin' } },
      { new: true },
    );
  });

  it('matches the configured email case-insensitively and trims whitespace', async () => {
    const elevated = fakeUser({ roles: ['buyer', 'super_admin'] });
    const findByIdAndUpdate = jest
      .fn()
      .mockReturnValue({ exec: () => Promise.resolve(elevated) });
    const { service } = makeService('  Owner@Example.com ', findByIdAndUpdate);

    await service.ensureSuperAdmin(fakeUser({ email: 'owner@example.com', roles: ['buyer'] }));

    expect(findByIdAndUpdate).toHaveBeenCalled();
  });

  it('does NOT elevate an unverified account, even when the email matches', async () => {
    // The core of the security fix: registration issues a session before the email
    // is verified, so an unverified match must never be elevated.
    const { service, findByIdAndUpdate } = makeService('owner@example.com');
    const user = fakeUser({ emailVerified: false, roles: ['buyer'] });

    const result = await service.ensureSuperAdmin(user);

    expect(result).toBe(user);
    expect(findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('does NOT elevate a non-active (e.g. suspended) account, even when verified and matching', async () => {
    const { service, findByIdAndUpdate } = makeService('owner@example.com');
    const user = fakeUser({ status: 'suspended', roles: ['buyer'] });

    const result = await service.ensureSuperAdmin(user);

    expect(result).toBe(user);
    expect(findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('is a no-op (no write) when the role is already held', async () => {
    const { service, findByIdAndUpdate } = makeService('owner@example.com');
    const user = fakeUser({ roles: ['buyer', 'super_admin'] });

    const result = await service.ensureSuperAdmin(user);

    expect(result).toBe(user);
    expect(findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('is a no-op for a non-matching email', async () => {
    const { service, findByIdAndUpdate } = makeService('owner@example.com');
    const user = fakeUser({ email: 'someone-else@example.com', roles: ['buyer'] });

    const result = await service.ensureSuperAdmin(user);

    expect(result).toBe(user);
    expect(findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('never elevates anyone when SUPER_ADMIN_EMAIL is unset', async () => {
    const { service, findByIdAndUpdate } = makeService(undefined);
    const user = fakeUser({ roles: ['buyer'] });

    const result = await service.ensureSuperAdmin(user);

    expect(result).toBe(user);
    expect(findByIdAndUpdate).not.toHaveBeenCalled();
  });
});
