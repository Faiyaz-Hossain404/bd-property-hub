import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AreaThanaDocument = HydratedDocument<AreaThana>;

// An area/thana (union) — the finest level of the geo taxonomy (DATABASE_DESIGN.md
// §4), below a city/upazila. Belongs to exactly one city/upazila. `cityUpazilaCode`
// is denormalized alongside the ref so the seeder resolves parents by slug and
// reads group by upazila without a populate. `code` is the stable (upazila-
// namespaced, so globally unique) upsert key.
@Schema({ collection: 'areasThanas', timestamps: true })
export class AreaThana {
  @Prop({ required: true, unique: true })
  code!: string;

  @Prop({ type: Types.ObjectId, ref: 'CityUpazila', required: true, index: true })
  cityUpazilaId!: Types.ObjectId;

  @Prop({ required: true })
  cityUpazilaCode!: string;

  @Prop({ required: true })
  nameEn!: string;

  @Prop({ required: true })
  nameBn!: string;
}

export const AreaThanaSchema = SchemaFactory.createForClass(AreaThana);
