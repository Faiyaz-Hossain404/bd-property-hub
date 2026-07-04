import { Body, Controller, ForbiddenException, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  createListingInputSchema,
  updateListingInputSchema,
  type CreateListingInput,
  type PublicListing,
  type PublicListingStatusHistoryEntry,
  type PublicUser,
  type UpdateListingInput,
} from '@bdph/types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ListingsService } from './listings.service';

const STAFF_ROLES = ['admin', 'super_admin'];

@Controller()
export class ListingsController {
  constructor(private readonly listings: ListingsService) {}

  @Post('listings')
  @HttpCode(201)
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('seller', 'admin', 'super_admin')
  async createDraft(
    @Body(new ZodValidationPipe(createListingInputSchema)) body: CreateListingInput,
    @CurrentUser() user: PublicUser,
  ): Promise<PublicListing> {
    const listing = await this.listings.createDraft(user.id, body);
    return this.listings.toPublic(listing);
  }

  @Get('me/listings')
  @UseGuards(SessionAuthGuard)
  async findOwn(@CurrentUser() user: PublicUser): Promise<PublicListing[]> {
    const listings = await this.listings.findOwnByOwner(user.id);
    return listings.map((listing) => this.listings.toPublic(listing));
  }

  @Patch('listings/:id')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('seller', 'admin', 'super_admin')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateListingInputSchema)) body: UpdateListingInput,
    @CurrentUser() user: PublicUser,
  ): Promise<PublicListing> {
    const listing = await this.listings.update(user.id, id, body);
    return this.listings.toPublic(listing);
  }

  @Post('listings/:id/submit')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('seller', 'admin', 'super_admin')
  async submit(@Param('id') id: string, @CurrentUser() user: PublicUser): Promise<PublicListing> {
    const listing = await this.listings.submitForReview(user.id, id);
    return this.listings.toPublic(listing);
  }

  // Owner self-service only — not '@Roles(..., admin, super_admin)' like the
  // sibling routes above. withdraw() always checks ownership against the
  // caller's own id, so staff would just get a 403 here, not a real grant.
  // A staff-initiated takedown of someone else's listing is a separate,
  // not-yet-designed capability (would need its own audit/role checks) —
  // do not "fix" the 403 by swapping in a non-ownership-checked lookup.
  @Post('listings/:id/withdraw')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('seller')
  async withdraw(@Param('id') id: string, @CurrentUser() user: PublicUser): Promise<PublicListing> {
    const listing = await this.listings.withdraw(user.id, id);
    return this.listings.toPublic(listing);
  }

  // Owner self-service only, same as withdraw above — restore() checks ownership
  // against the caller's id, so staff get a 403 rather than a cross-owner grant.
  // Keep it '@Roles('seller')'; don't broaden it or swap in a lookup that skips
  // the ownership check.
  @Post('listings/:id/restore')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('seller')
  async restore(@Param('id') id: string, @CurrentUser() user: PublicUser): Promise<PublicListing> {
    const listing = await this.listings.restore(user.id, id);
    return this.listings.toPublic(listing);
  }

  @Get('listings/:id/status-history')
  @UseGuards(SessionAuthGuard)
  async statusHistory(
    @Param('id') id: string,
    @CurrentUser() user: PublicUser,
  ): Promise<PublicListingStatusHistoryEntry[]> {
    const listing = await this.listings.findById(id);
    const isStaff = user.roles.some((role) => STAFF_ROLES.includes(role));
    if (!isStaff && listing.ownerId.toString() !== user.id) {
      throw new ForbiddenException('You do not own this listing');
    }
    return this.listings.findStatusHistory(id);
  }
}
