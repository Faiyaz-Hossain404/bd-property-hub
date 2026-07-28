import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
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

const STAFF_ROLES = ['admin', 'admin_prime'];

@Controller()
export class ListingsController {
  constructor(private readonly listings: ListingsService) {}

  @Post('listings')
  @HttpCode(201)
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('seller', 'admin', 'admin_prime')
  async createDraft(
    @Body(new ZodValidationPipe(createListingInputSchema)) body: CreateListingInput,
    @CurrentUser() user: PublicUser,
  ): Promise<PublicListing> {
    const listing = await this.listings.createDraft(user.id, body);
    return this.listings.toPublic(listing, { forOwnerOrStaff: true });
  }

  @Get('me/listings')
  @UseGuards(SessionAuthGuard)
  async findOwn(@CurrentUser() user: PublicUser): Promise<PublicListing[]> {
    const listings = await this.listings.findOwnByOwner(user.id);
    return listings.map((listing) => this.listings.toPublic(listing, { forOwnerOrStaff: true }));
  }

  @Patch('listings/:id')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('seller', 'admin', 'admin_prime')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateListingInputSchema)) body: UpdateListingInput,
    @CurrentUser() user: PublicUser,
  ): Promise<PublicListing> {
    const listing = await this.listings.update(user.id, id, body);
    return this.listings.toPublic(listing, { forOwnerOrStaff: true });
  }

  // Owner self-service delete of a never-submitted draft. Same shape as update()
  // above: deleteDraft() checks ownership against the caller's own id, so
  // ownership is the real protection and the role gate only decides who may hold
  // drafts at all. Staff get a 403 on someone else's draft — a staff-initiated
  // removal of another seller's listing is the moderation takedown, not this.
  // 204, no body: there is nothing left to return.
  @Delete('listings/:id')
  @HttpCode(204)
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('seller', 'admin', 'admin_prime')
  async remove(@Param('id') id: string, @CurrentUser() user: PublicUser): Promise<void> {
    await this.listings.deleteDraft(user.id, id);
  }

  @Post('listings/:id/submit')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('seller', 'admin', 'admin_prime')
  async submit(@Param('id') id: string, @CurrentUser() user: PublicUser): Promise<PublicListing> {
    const listing = await this.listings.submitForReview(user.id, id);
    return this.listings.toPublic(listing, { forOwnerOrStaff: true });
  }

  // Owner self-service. withdraw() ALWAYS checks ownership against the caller's
  // own id, so ownership — not the role gate — is the real protection here: staff
  // (admin/admin_prime, who inherit seller capability) can withdraw their OWN
  // listing but get a 403 on anyone else's. A staff-initiated takedown of someone
  // else's listing is the separate moderation capability, not this route — do not
  // "fix" a 403 by swapping in a non-ownership-checked lookup.
  @Post('listings/:id/withdraw')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('seller')
  async withdraw(@Param('id') id: string, @CurrentUser() user: PublicUser): Promise<PublicListing> {
    const listing = await this.listings.withdraw(user.id, id);
    return this.listings.toPublic(listing, { forOwnerOrStaff: true });
  }

  // Owner self-service, same as withdraw above — restore() checks ownership
  // against the caller's id, so ownership (not the role) scopes it: staff get a
  // 403 on a cross-owner listing. Keep '@Roles('seller')'; don't swap in a lookup
  // that skips the ownership check.
  @Post('listings/:id/restore')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('seller')
  async restore(@Param('id') id: string, @CurrentUser() user: PublicUser): Promise<PublicListing> {
    const listing = await this.listings.restore(user.id, id);
    return this.listings.toPublic(listing, { forOwnerOrStaff: true });
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
