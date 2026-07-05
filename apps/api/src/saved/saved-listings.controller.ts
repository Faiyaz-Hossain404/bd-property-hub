import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import {
  saveListingInputSchema,
  type PublicListing,
  type PublicSavedListing,
  type PublicUser,
  type SaveListingInput,
} from '@bdph/types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { SavedListingsService } from './saved-listings.service';

// Buyer favorites live under /me/saved. Every route is session-guarded and scoped
// to the caller's own id — a user can only ever read or change their own saves,
// so there is no ownership check to get wrong. Any authenticated role may save
// (buying is not gated behind the seller role).
@Controller()
export class SavedListingsController {
  constructor(private readonly saved: SavedListingsService) {}

  @Post('me/saved')
  @HttpCode(201)
  @UseGuards(SessionAuthGuard)
  async save(
    @Body(new ZodValidationPipe(saveListingInputSchema)) body: SaveListingInput,
    @CurrentUser() user: PublicUser,
  ): Promise<PublicSavedListing> {
    return this.saved.save(user.id, body.listingId);
  }

  @Delete('me/saved/:listingId')
  @HttpCode(204)
  @UseGuards(SessionAuthGuard)
  async unsave(
    @Param('listingId') listingId: string,
    @CurrentUser() user: PublicUser,
  ): Promise<void> {
    await this.saved.unsave(user.id, listingId);
  }

  @Get('me/saved')
  @UseGuards(SessionAuthGuard)
  async list(@CurrentUser() user: PublicUser): Promise<PublicListing[]> {
    return this.saved.listSaved(user.id);
  }

  // Lightweight companion to GET /me/saved — just the ids, so the catalog and
  // detail page can show the right toggle state without hydrating full listings.
  @Get('me/saved/ids')
  @UseGuards(SessionAuthGuard)
  async listIds(@CurrentUser() user: PublicUser): Promise<string[]> {
    return this.saved.listSavedIds(user.id);
  }
}
