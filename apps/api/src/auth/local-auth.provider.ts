import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { LoginInput, PublicUser, RegisterInput } from '@bdph/types';
import { UsersService } from '../users/users.service';
import { PasswordService } from './password.service';
import type { AuthProvider } from './auth-provider.interface';

@Injectable()
export class LocalAuthProvider implements AuthProvider {
  readonly kind = 'local' as const;

  constructor(
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
  ) {}

  async register(input: RegisterInput): Promise<PublicUser> {
    const passwordHash = await this.passwords.hash(input.password);
    const user = await this.users.createLocal({
      email: input.email.toLowerCase(),
      name: input.name,
      locale: input.locale,
      passwordHash,
    });
    // NOTE: deliberately no super-admin elevation here. A freshly registered account
    // is not yet email-verified, and registration issues a session immediately — so
    // elevating on an unverified email would let anyone who knows the configured
    // owner address self-register into super_admin. The owner is elevated once they
    // verify their email (AccountFlowsService.verifyEmail) or on their next sign-in.
    return this.users.toPublic(user);
  }

  async login(input: LoginInput): Promise<PublicUser> {
    const user = await this.users.findByEmailWithSecret(input.email);
    // Same error whether the email is unknown or the password is wrong, so the
    // response can't be used to enumerate accounts.
    if (!user?.passwordHash || !(await this.passwords.verify(user.passwordHash, input.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    // Deny suspended accounts even with correct credentials so a suspended user
    // can't simply log back in and mint a fresh session. A 'deleted' account is
    // reported as invalid credentials so its prior existence isn't confirmed.
    if (user.status === 'suspended') {
      throw new UnauthorizedException('This account has been suspended');
    }
    if (user.status === 'deleted') {
      throw new UnauthorizedException('Invalid credentials');
    }
    // Auto-grant the admin_prime role to the configured owner email on sign-in
    // (no-op for everyone else). Runs after the status checks so a suspended or
    // deleted account is rejected before any elevation.
    const elevated = await this.users.ensureAdminPrime(user);
    return this.users.toPublic(elevated);
  }
}
