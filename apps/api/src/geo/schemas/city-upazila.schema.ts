import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CityUpazilaDocument = HydratedDocument<CityUpazila>;

// A city/upazila — the level below a district (DATABASE_DESIGN.md §4), the first
// drill-down under the required Zilla selector. Belongs to exactly one district.
// `districtCode` is denormalized alongside the ref so the seeder can resolve
// parents by slug and reads can group by district without a populate. `code` is
// the stable (district-namespaced, so globally unique) upsert key.
@Schema({ collection: 'citiesUpazilas', timestamps: true })
export class CityUpazila {
  @Prop({ required: true, unique: true })
  code!: string;

  @Prop({ type: Types.ObjectId, ref: 'District', required: true, index: true })
  districtId!: Types.ObjectId;

  @Prop({ required: true })
  districtCode!: string;

  @Prop({ required: true })
  nameEn!: string;

  @Prop({ required: true })
  nameBn!: string;
}

export const CityUpazilaSchema = SchemaFactory.createForClass(CityUpazila);
