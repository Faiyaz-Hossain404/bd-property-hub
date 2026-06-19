import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { LISTING_PUBLICATION_STATUSES, type ListingPublicationStatus } from '@bdph/types';

export type ListingStatusHistoryDocument = HydratedDocument<ListingStatusHistory>;

// Append-only transition log (DATABASE_DESIGN.md §5/§9). Written in the same
// transaction as the `listings` status change.
@Schema({ collection: 'listingStatusHistory', timestamps: { createdAt: true, updatedAt: false } })
export class ListingStatusHistory {
  @Prop({ type: Types.ObjectId, ref: 'Listing', required: true, index: true })
  listingId!: Types.ObjectId;

  @Prop({ type: String, enum: LISTING_PUBLICATION_STATUSES, required: true })
  fromStatus!: ListingPublicationStatus;

  @Prop({ type: String, enum: LISTING_PUBLICATION_STATUSES, required: true })
  toStatus!: ListingPublicationStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  actorId!: Types.ObjectId;

  @Prop({ type: String, default: null })
  reason!: string | null;
}

export const ListingStatusHistorySchema = SchemaFactory.createForClass(ListingStatusHistory);
