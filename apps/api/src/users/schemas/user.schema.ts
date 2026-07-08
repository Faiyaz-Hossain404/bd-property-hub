import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  ROLES,
  SELLER_KYC_STATUSES,
  SUPPORTED_LOCALES,
  USER_STATUSES,
  type Locale,
  type Role,
  type SellerKycStatus,
  type UserStatus,
} from '@bdph/types';

export type UserDocument = HydratedDocument<User>;

/**
 * Canonical identity record — the single source of truth for a person.
 * A user may authenticate via first-party password, via Clerk, or both
 * (linked by verified email); roles/permissions/PII always live here, never
 * only in Clerk. See IMPLEMENTATION_PLAN.md §3.
 */
@Schema({ collection: 'users', timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email!: string;

  @Prop({ default: false })
  emailVerified!: boolean;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: String, default: null })
  phone!: string | null;

  // First-party credential. `select: false` keeps it out of every query unless
  // explicitly requested, so it never leaks into a default projection.
  @Prop({ type: String, default: null, select: false })
  passwordHash!: string | null;

  // Link to the Clerk identity; null for password-only users.
  @Prop({ type: String, default: null })
  clerkUserId!: string | null;

  @Prop({ type: [String], enum: ROLES, default: ['buyer'] })
  roles!: Role[];

  @Prop({ type: String, enum: USER_STATUSES, default: 'pending_verification' })
  status!: UserStatus;

  // Seller verification gate (FR-S8). Indexed so the admin queue can list
  // `pending` sellers cheaply. Defaults to 'unverified'; a listing can't be
  // submitted for review until its owner is 'verified'.
  @Prop({ type: String, enum: SELLER_KYC_STATUSES, default: 'unverified', index: true })
  kycStatus!: SellerKycStatus;

  // Admin's note on the most recent rejection, surfaced to the seller. Null
  // unless the last decision was a rejection.
  @Prop({ type: String, default: null })
  kycReason!: string | null;

  @Prop({ type: String, enum: SUPPORTED_LOCALES, default: 'en' })
  locale!: Locale;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Enforce Clerk-link uniqueness only among users that actually have a link. A
// partial index is required rather than a sparse one: clerkUserId defaults to an
// explicit null, and a sparse index still indexes present-but-null fields — so it
// would reject the second password-only user (both have clerkUserId: null). The
// partial filter scopes the unique constraint to string values, leaving any number
// of null (password-only) users free to coexist.
UserSchema.index(
  { clerkUserId: 1 },
  { unique: true, partialFilterExpression: { clerkUserId: { $type: 'string' } } },
);
