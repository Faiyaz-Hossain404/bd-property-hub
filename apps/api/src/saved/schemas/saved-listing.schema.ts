import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SavedListingDocument = HydratedDocument<SavedListing>;

// A buyer's bookmark: one (user, listing) pair. The compound unique index below
// makes saving idempotent — a second save of the same listing by the same user
// can never create a duplicate row. Only `createdAt` matters (a save is never
// edited), so `updatedAt` is disabled.
@Schema({ collection: 'savedListings', timestamps: { createdAt: true, updatedAt: false } })
export class SavedListing {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Listing', required: true, index: true })
  listingId!: Types.ObjectId;
}

export const SavedListingSchema = SchemaFactory.createForClass(SavedListing);

// One save per (user, listing). The unique index is the source of truth for
// idempotency; the upsert in the service relies on it.
SavedListingSchema.index({ userId: 1, listingId: 1 }, { unique: true });
