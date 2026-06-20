import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type DistrictDocument = HydratedDocument<District>;

// A district ("Zilla") — the viewer's primary/required location selector
// (DATABASE_DESIGN.md §4, MAP-5). Belongs to exactly one division. `divisionCode`
// is denormalized alongside the ref so the seeder can resolve parents by slug and
// reads can group by division without a populate. `code` is the stable upsert key.
@Schema({ collection: 'districts', timestamps: true })
export class District {
  @Prop({ required: true, unique: true })
  code!: string;

  @Prop({ type: Types.ObjectId, ref: 'Division', required: true, index: true })
  divisionId!: Types.ObjectId;

  @Prop({ required: true })
  divisionCode!: string;

  @Prop({ required: true })
  nameEn!: string;

  @Prop({ required: true })
  nameBn!: string;
}

export const DistrictSchema = SchemaFactory.createForClass(District);
