import { Controller, Post, UseGuards } from '@nestjs/common';
import type { PublicUser } from '@bdph/types';
import { CurrentUser } from './current-user.decorator';
import { SessionAuthGuard } from './session-auth.guard';
import { UsersService } from '../users/users.service';

// Self-service profile actions under /me. Becoming a seller is a one-way role
// grant for MVP — no application/KYC gate yet (USER_ROLES.md leaves this open).
@Controller('me')
@UseGuards(SessionAuthGuard)
export class MeController {
  constructor(private readonly users: UsersService) {}

  @Post('become-seller')
  async becomeSeller(@CurrentUser() user: PublicUser): Promise<PublicUser> {
    const updated = await this.users.addRole(user.id, 'seller');
    return this.users.toPublic(updated);
  }
}
