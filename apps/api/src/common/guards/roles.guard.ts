import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PublicUser, Role } from '@bdph/types';
import { ROLES_KEY } from '../decorators/roles.decorator';

// Gates a route to users holding at least one of the @Roles(...) listed.
// Must run after SessionAuthGuard so request.user is already populated.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Read @Roles from BOTH the method and the controller class: a method-level
    // decorator overrides a class-level one, and a class-level @Roles applies to
    // every route in the controller. Using getHandler() alone silently ignored
    // class-level @Roles (e.g. ModerationController), leaving those routes gated
    // by SessionAuthGuard only — any authenticated user could reach them.
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: PublicUser }>();
    if (!user || !user.roles.some((role) => required.includes(role))) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
