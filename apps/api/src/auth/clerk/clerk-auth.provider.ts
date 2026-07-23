import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { AuthProviderKind, PublicUser } from '@bdph/types';
import { UsersService } from '../../users/users.service';
import type { AuthProvider } from '../auth-provider.interface';
import { SessionService } from '../session.service';
import { ClerkService } from './clerk.service';

// The Clerk side of the AuthProvider seam (LocalAuthProvider is the first-party
// side). Whichever provider authenticates, downstream authorization operates on
// the same canonical PublicUser. This resolves a Clerk session token to that user;
// the caller (the bridge endpoint) then issues our own session cookie for it.
@Injectable()
export class ClerkAuthProvider implements AuthProvider {
  readonly kind: AuthProviderKind = 'clerk';

  constructor(
    private readonly clerk: ClerkService,
    private readonly users: UsersService,
    private readonly sessions: SessionService,
  ) {}

  // Verify a Clerk session token, resolve (creating or linking as needed) the
  // canonical user, and return the client-safe projection. Mirrors the suspended/
  // deleted denial in LocalAuthProvider.login so a banned account can't bridge in.
  async authenticate(token: string): Promise<PublicUser> {
    const clerkUserId = await this.clerk.verifySessionToken(token);
    const { email, name } = await this.clerk.getProfile(clerkUserId);
    const { user, revokePriorSessions } = await this.users.upsertClerkUser({
      clerkUserId,
      email,
      name,
    });
    if (user.status === 'suspended') {
      throw new UnauthorizedException('This account has been suspended');
    }
    if (user.status === 'deleted') {
      throw new UnauthorizedException('Invalid credentials');
    }
    // Linking onto a previously-unverified account: kill any sessions it had
    // before this link (e.g. an email squatter's) so only the session the bridge
    // is about to mint survives.
    if (revokePriorSessions) {
      await this.sessions.revokeAllForUser(user.id);
    }
    return this.users.toPublic(user);
  }
}
