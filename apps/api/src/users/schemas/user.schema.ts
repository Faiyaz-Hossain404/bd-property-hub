import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  ROLES,
  SUPPORTED_LOCALES,
  USER_STATUSES,
  type Locale,
  type Role,
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

  @Prop({ type: String, enum: SUPPORTED_LOCALES, default: 'en' })
  locale!: Locale;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Sparse so multiple null clerkUserId values coexist; unique once a link exists.
UserSchema.index({ clerkUserId: 1 }, { unique: true, sparse: true });
