import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { rejectListingInputSchema, type PublicListing, type PublicUser, type RejectListingInput } from '@bdph/types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ListingsService } from './listings.service';

// Admin moderation surface (API_DESIGN.md §7). `:caseId` is the listing id —
// there is no separate moderation_case collection for this slice.
@Controller('admin/moderation')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class ModerationController {
  constructor(private readonly listings: ListingsService) {}

  @Get('queue')
  async queue(): Promise<PublicListing[]> {
    const listings = await this.listings.findPendingQueue();
    return listings.map((listing) => this.listings.toPublic(listing));
  }

  @Post(':caseId/approve')
  async approve(@Param('caseId') caseId: string, @CurrentUser() user: PublicUser): Promise<PublicListing> {
    const listing = await this.listings.approve(user.id, caseId);
    return this.listings.toPublic(listing);
  }

  @Post(':caseId/reject')
  async reject(
    @Param('caseId') caseId: string,
    @Body(new ZodValidationPipe(rejectListingInputSchema)) body: RejectListingInput,
    @CurrentUser() user: PublicUser,
  ): Promise<PublicListing> {
    const listing = await this.listings.reject(user.id, caseId, body.reason);
    return this.listings.toPublic(listing);
  }
}
