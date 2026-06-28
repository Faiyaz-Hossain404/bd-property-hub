import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import {
  commitListingMediaInputSchema,
  type CommitListingMediaInput,
  type ListingMediaUploadTicket,
  type PublicListing,
  type PublicUser,
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
}
