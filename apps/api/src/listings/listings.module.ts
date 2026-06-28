import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { GeoModule } from '../geo/geo.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { Listing, ListingSchema } from './schemas/listing.schema';
import { ListingStatusHistory, ListingStatusHistorySchema } from './schemas/listing-status-history.schema';
import { CatalogController } from './catalog.controller';
import { ListingsController } from './listings.controller';
import { ListingMediaController } from './listing-media.controller';
import { ModerationController } from './moderation.controller';
import { ListingsService } from './listings.service';

@Module({
  imports: [
    AuthModule,
    GeoModule,
    CloudinaryModule,
    MongooseModule.forFeature([
      { name: Listing.name, schema: ListingSchema },
      { name: ListingStatusHistory.name, schema: ListingStatusHistorySchema },
    ]),
  ],
  controllers: [CatalogController, ListingsController, ListingMediaController, ModerationController],
  providers: [ListingsService, RolesGuard],
})
export class ListingsModule {}
