import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  commitListingMediaInputSchema,
  reorderListingMediaInputSchema,
  type CommitListingMediaInput,
  type ListingMediaUploadTicket,
  type PublicListing,
  type PublicUser,
  type ReorderListingMediaInput,
} from '@bdph/types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ListingsService } from './listings.service';

// Owner-only listing photo uploads, two-phase per FILE_STORAGE_ARCHITECTURE.md:
//   1. presign — the API mints a short-lived Cloudinary signature
//   2. (browser uploads the file directly to Cloudinary — bytes skip this server)
//   3. commit — the client echoes Cloudinary's response; the API verifies + records
// The documented `media:presign`/`media:commit` actions are implemented as the
// `media/presign` and `media/commit` sub-paths (a literal ':' collides with
// Nest's route-param syntax). Ownership + editable-status are enforced in the
// service; the commit re-verifies Cloudinary's signature so a forged body fails.
@Controller()
export class ListingMediaController {
  constructor(private readonly listings: ListingsService) {}

  @Post('listings/:id/media/presign')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('seller', 'admin', 'super_admin')
  async presign(
    @Param('id') id: string,
    @CurrentUser() user: PublicUser,
  ): Promise<ListingMediaUploadTicket> {
    return this.listings.createUploadSignature(user.id, id);
  }

  @Post('listings/:id/media/commit')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('seller', 'admin', 'super_admin')
  async commit(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(commitListingMediaInputSchema)) body: CommitListingMediaInput,
    @CurrentUser() user: PublicUser,
  ): Promise<PublicListing> {
    const listing = await this.listings.commitUploadedMedia(user.id, id, body);
    return this.listings.toPublic(listing);
  }

  // Reorder the listing's photos (order[0] is the cover). PATCH rather than a
  // dedicated set-cover route, since "make cover" and "move" are the same
  // operation — a new full ordering. Ownership + editable-status enforced in the
  // service. Placed before the :mediaId delete so 'order' is never read as an id
  // (it wouldn't be anyway — different HTTP verb — but the ordering is clearer).
  @Patch('listings/:id/media/order')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('seller', 'admin', 'super_admin')
  async reorder(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reorderListingMediaInputSchema)) body: ReorderListingMediaInput,
    @CurrentUser() user: PublicUser,
  ): Promise<PublicListing> {
    const listing = await this.listings.reorderMedia(user.id, id, body.order);
    return this.listings.toPublic(listing);
  }

  // Remove one photo, addressed by its media subdocument id. Ownership +
  // editable-status enforced in the service; returns the refreshed listing.
  @Delete('listings/:id/media/:mediaId')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('seller', 'admin', 'super_admin')
  async remove(
    @Param('id') id: string,
    @Param('mediaId') mediaId: string,
    @CurrentUser() user: PublicUser,
  ): Promise<PublicListing> {
    const listing = await this.listings.removeMedia(user.id, id, mediaId);
    return this.listings.toPublic(listing);
  }
}
