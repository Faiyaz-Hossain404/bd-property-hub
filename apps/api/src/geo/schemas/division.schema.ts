import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DivisionDocument = HydratedDocument<Division>;

// One of Bangladesh's 8 administrative divisions (DATABASE_DESIGN.md §4) — a tiny,
// rarely-changing reference collection. `code` is a stable kebab slug that serves
// as the natural key for idempotent seeding (`unique` already builds the index).
@Schema({ collection: 'divisions', timestamps: true })
export class Division {
  @Prop({ required: true, unique: true })
  code!: string;

  @Prop({ required: true })
  nameEn!: string;

  @Prop({ required: true })
  nameBn!: string;
}

export const DivisionSchema = SchemaFactory.createForClass(Division);
