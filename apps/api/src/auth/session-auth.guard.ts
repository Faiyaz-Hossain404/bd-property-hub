import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { PublicUser } from '@bdph/types';
import { SESSION_COOKIE, SessionService } from './session.service';

type AuthedRequest = Request & {
  cookies?: Record<string, string>;
  user?: PublicUser;
};

/** Resolves the session cookie to a canonical user and attaches it to req.user. */
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly sessions: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const token = request.cookies?.[SESSION_COOKIE];
    if (!token) {
      throw new UnauthorizedException('Not authenticated');
    }

    const user = await this.sessions.resolve(token);
    if (!user) {
      throw new UnauthorizedException('Session invalid or expired');
    }

    request.user = user;
    return true;
  }
}
