import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { SELLER_KYC_STATUSES, type SellerKycStatus } from '@bdph/types';

export type SellerVerificationEventDocument = HydratedDocument<SellerVerificationEvent>;

// Append-only audit trail for seller verification decisions (FR-S8). One row per
// status change, written in the same transaction as the user's kycStatus update.
// `actorId` is the seller themselves for a request, or the admin for a decision.
@Schema({ collection: 'sellerVerificationHistory', timestamps: { createdAt: true, updatedAt: false } })
export class SellerVerificationEvent {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, enum: SELLER_KYC_STATUSES, required: true })
  fromStatus!: SellerKycStatus;

  @Prop({ type: String, enum: SELLER_KYC_STATUSES, required: true })
  toStatus!: SellerKycStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  actorId!: Types.ObjectId;

  @Prop({ type: String, default: null })
  reason!: string | null;
}

export const SellerVerificationEventSchema = SchemaFactory.createForClass(SellerVerificationEvent);
