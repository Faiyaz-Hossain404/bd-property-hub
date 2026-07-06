import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  rejectSellerVerificationInputSchema,
  type PublicUser,
  type RejectSellerVerificationInput,
} from '@bdph/types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UsersService } from '../users/users.service';
import { SellerVerificationService } from './seller-verification.service';

// Admin surface for reviewing seller verification (FR-S8). Class-level @Roles is
// enforced by RolesGuard (reads class + method metadata), so every route here is
// admin/super_admin only.
@Controller('admin/seller-verification')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class SellerVerificationController {
  constructor(
    private readonly verification: SellerVerificationService,
    private readonly users: UsersService,
  ) {}

  @Get('queue')
  async queue(): Promise<PublicUser[]> {
    const users = await this.verification.findPendingQueue();
    return users.map((user) => this.users.toPublic(user));
  }

  @Post(':userId/approve')
  async approve(@Param('userId') userId: string, @CurrentUser() actor: PublicUser): Promise<PublicUser> {
    const user = await this.verification.approve(actor.id, userId);
    return this.users.toPublic(user);
  }

  @Post(':userId/reject')
  async reject(
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(rejectSellerVerificationInputSchema)) body: RejectSellerVerificationInput,
    @CurrentUser() actor: PublicUser,
  ): Promise<PublicUser> {
    const user = await this.verification.reject(actor.id, userId, body.reason);
    return this.users.toPublic(user);
  }
}
