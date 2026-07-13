import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  rejectListingInputSchema,
  takedownListingInputSchema,
  type PublicListing,
  type PublicUser,
  type RejectListingInput,
  type TakedownListingInput,
} from '@bdph/types';
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
    return listings.map((listing) => this.listings.toPublic(listing, { forOwnerOrStaff: true }));
  }

  // Listings staff have taken down — the surface for reviewing/reinstating them.
  @Get('removed')
  async removed(): Promise<PublicListing[]> {
    const listings = await this.listings.findRemovedQueue();
    return listings.map((listing) => this.listings.toPublic(listing, { forOwnerOrStaff: true }));
  }

  @Post(':caseId/approve')
  async approve(@Param('caseId') caseId: string, @CurrentUser() user: PublicUser): Promise<PublicListing> {
    const listing = await this.listings.approve(user.id, caseId);
    return this.listings.toPublic(listing, { forOwnerOrStaff: true });
  }

  @Post(':caseId/reject')
  async reject(
    @Param('caseId') caseId: string,
    @Body(new ZodValidationPipe(rejectListingInputSchema)) body: RejectListingInput,
    @CurrentUser() user: PublicUser,
  ): Promise<PublicListing> {
    const listing = await this.listings.reject(user.id, caseId, body.reason);
    return this.listings.toPublic(listing, { forOwnerOrStaff: true });
  }

  // Take a live listing down (MOD-3). Requires a reason for the audit trail.
  @Post(':caseId/takedown')
  async takedown(
    @Param('caseId') caseId: string,
    @Body(new ZodValidationPipe(takedownListingInputSchema)) body: TakedownListingInput,
    @CurrentUser() user: PublicUser,
  ): Promise<PublicListing> {
    const listing = await this.listings.takedown(user.id, caseId, body.reason);
    return this.listings.toPublic(listing, { forOwnerOrStaff: true });
  }

  // Undo a takedown — return the listing to the public catalog (MOD-3).
  @Post(':caseId/reinstate')
  async reinstate(@Param('caseId') caseId: string, @CurrentUser() user: PublicUser): Promise<PublicListing> {
    const listing = await this.listings.reinstate(user.id, caseId);
    return this.listings.toPublic(listing, { forOwnerOrStaff: true });
  }
}
