import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CityCorporationDocument = HydratedDocument<CityCorporation>;

// One of Bangladesh's city corporations (DATABASE_DESIGN.md §4, FR-S7c) — a small,
// fixed reference list. Unlike the division→district→upazila→area hierarchy this
// is a flat, cross-cutting tag a seller may optionally add to a listing's location
// (a property inside a city-corporation area). `code` is the stable kebab slug
// upsert key.
@Schema({ collection: 'cityCorporations', timestamps: true })
export class CityCorporation {
  @Prop({ required: true, unique: true })
  code!: string;

  @Prop({ required: true })
  nameEn!: string;

  @Prop({ required: true })
  nameBn!: string;
}

export const CityCorporationSchema = SchemaFactory.createForClass(CityCorporation);
