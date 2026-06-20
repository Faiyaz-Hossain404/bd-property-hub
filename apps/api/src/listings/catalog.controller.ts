import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  publicListingQuerySchema,
  type ApiPage,
  type PublicListing,
  type PublicListingQuery,
} from '@bdph/types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ListingsService } from './listings.service';

// Public catalog surface (API_DESIGN.md §5) — no auth, cacheable. Serves only
// `approved` listings; the whole submit → moderate → approve pipeline exists to
// gate content into here.
//
// SECURITY NOTE: `toPublic()` is safe to expose anonymously *today* only because
// the listing model carries no precise geo, address_line, media, or owner KYC
// fields yet. When those land (FILE_STORAGE_ARCHITECTURE / geo taxonomy), this
// must switch to a catalog-specific projection that honors the A5/MAP-2 rule
// (exact coordinates + address_line are NEVER returned to the public — only an
// area-level approximate location). Revisit before adding any sensitive field.
@Controller()
export class CatalogController {
  constructor(private readonly listings: ListingsService) {}

  @Get('listings')
  async browse(
    @Query(new ZodValidationPipe(publicListingQuerySchema)) query: PublicListingQuery,
  ): Promise<ApiPage<PublicListing>> {
    const { items, nextCursor } = await this.listings.findPublicPage(query.limit, query.cursor ?? null);
    return {
      data: items.map((listing) => this.listings.toPublic(listing)),
      page: { nextCursor, limit: query.limit },
    };
  }

  @Get('listings/:id')
  async detail(@Param('id') id: string): Promise<PublicListing> {
    const listing = await this.listings.findPublicListing(id);
    return this.listings.toPublic(listing);
  }
}
