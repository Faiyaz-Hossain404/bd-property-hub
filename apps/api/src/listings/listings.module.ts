import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { Listing, ListingSchema } from './schemas/listing.schema';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';

@Module({
  imports: [AuthModule, MongooseModule.forFeature([{ name: Listing.name, schema: ListingSchema }])],
  controllers: [ListingsController],
  providers: [ListingsService, RolesGuard],
})
export class ListingsModule {}
