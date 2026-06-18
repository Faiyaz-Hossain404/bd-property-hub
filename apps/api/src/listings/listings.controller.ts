import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { createListingInputSchema, type CreateListingInput, type PublicListing, type PublicUser } from '@bdph/types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ListingsService } from './listings.service';

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
}
