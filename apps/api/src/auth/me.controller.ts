import { Controller, Post, UseGuards } from '@nestjs/common';
import type { PublicUser } from '@bdph/types';
import { CurrentUser } from './current-user.decorator';
import { SessionAuthGuard } from './session-auth.guard';
import { UsersService } from '../users/users.service';

// Self-service profile actions under /me. Becoming a seller changes a buyer's
// single role to seller (no application/KYC gate at this step yet).
@Controller('me')
@UseGuards(SessionAuthGuard)
export class MeController {
  constructor(private readonly users: UsersService) {}

  @Post('become-seller')
  async becomeSeller(@CurrentUser() user: PublicUser): Promise<PublicUser> {
    // Single-role, staff-safe: only a plain buyer is promoted to seller. A seller
    // (idempotent) or an admin/admin_prime — who already hold seller capability by
    // inheritance — is returned unchanged, so this self-service action can never
    // DEMOTE staff by overwriting their role.
    if (user.role !== 'buyer') return user;
    const updated = await this.users.setRole(user.id, 'seller');
    return this.users.toPublic(updated);
  }
}
