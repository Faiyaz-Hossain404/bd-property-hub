import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@bdph/types';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

// Sample controllers exercising the two ways @Roles is applied in this codebase:
// at the class level (ModerationController) and at the method level (listings,
// media). The guard must enforce BOTH — a regression here silently opened the
// class-level admin routes to any authenticated user.
@Roles('admin', 'super_admin')
class ClassLevelController {
  handler(): void {}
}

class MethodLevelController {
  @Roles('seller')
  handler(): void {}
}

class NoRolesController {
  handler(): void {}
}

function makeContext(
  handler: (...args: unknown[]) => unknown,
  target: object,
  user: { roles: Role[] } | undefined,
): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => target,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());

  describe('class-level @Roles (e.g. ModerationController)', () => {
    it('allows a user holding a required role', () => {
      const ctx = makeContext(ClassLevelController.prototype.handler, ClassLevelController, {
        roles: ['admin'],
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('rejects an authenticated user without a required role', () => {
      // The core regression: a logged-in buyer/seller must NOT reach an
      // admin-only class-level route just because it lacks a method-level @Roles.
      const ctx = makeContext(ClassLevelController.prototype.handler, ClassLevelController, {
        roles: ['seller', 'buyer'],
      });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });

  describe('method-level @Roles (e.g. listings/media)', () => {
    it('allows a user holding the method role', () => {
      const ctx = makeContext(MethodLevelController.prototype.handler, MethodLevelController, {
        roles: ['seller'],
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('rejects a user lacking the method role', () => {
      const ctx = makeContext(MethodLevelController.prototype.handler, MethodLevelController, {
        roles: ['buyer'],
      });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });

  it('allows any request when no @Roles is present', () => {
    const ctx = makeContext(NoRolesController.prototype.handler, NoRolesController, { roles: ['buyer'] });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rejects when the role is required but no user is attached', () => {
    const ctx = makeContext(ClassLevelController.prototype.handler, ClassLevelController, undefined);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
