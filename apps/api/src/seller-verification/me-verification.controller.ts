import { Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { PublicUser } from '@bdph/types';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UsersService } from '../users/users.service';
import { SellerVerificationService } from './seller-verification.service';

// Tighter than the global per-IP limit: a rejected seller can re-request
// immediately, so cap requests so a reject→re-request loop can't flood the admin
// review queue. A legitimate seller only needs one request.
const REQUEST_VERIFICATION_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

// Seller self-service: request verification (FR-S8). Restricted to sellers — a
// buyer becomes a seller first (POST /me/become-seller), then applies here. The
// service enforces the state rule (only from unverified/rejected).
@Controller('me/verification')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles('seller', 'admin', 'super_admin')
export class MeVerificationController {
  constructor(
    private readonly verification: SellerVerificationService,
    private readonly users: UsersService,
  ) {}

  @Post('request')
  @Throttle(REQUEST_VERIFICATION_THROTTLE)
  async request(@CurrentUser() user: PublicUser): Promise<PublicUser> {
    const updated = await this.verification.requestVerification(user.id);
    return this.users.toPublic(updated);
  }
}
