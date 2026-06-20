import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Division, DivisionSchema } from './schemas/division.schema';
import { District, DistrictSchema } from './schemas/district.schema';
import { GeoController } from './geo.controller';
import { GeoService } from './geo.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Division.name, schema: DivisionSchema },
      { name: District.name, schema: DistrictSchema },
    ]),
  ],
  controllers: [GeoController],
  providers: [GeoService],
  // Exported so the standalone seeder (geo.seed.ts) can resolve it from the app
  // context without `{ strict: false }`.
  exports: [GeoService],
})
export class GeoModule {}
