import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { ListingsModule } from '../listings/listings.module';
import { SavedListing, SavedListingSchema } from './schemas/saved-listing.schema';
import { SavedListingsController } from './saved-listings.controller';
import { SavedListingsService } from './saved-listings.service';

@Module({
  imports: [
    // AuthModule supplies SessionAuthGuard's dependencies; ListingsModule exports
    // ListingsService, which we use to validate a listing is publicly viewable
    // before saving and to hydrate saved listings for the dashboard.
    AuthModule,
    ListingsModule,
    MongooseModule.forFeature([{ name: SavedListing.name, schema: SavedListingSchema }]),
  ],
  controllers: [SavedListingsController],
  providers: [SavedListingsService],
})
export class SavedListingsModule {}
