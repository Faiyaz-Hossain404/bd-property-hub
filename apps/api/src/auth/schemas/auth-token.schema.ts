import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export const AUTH_TOKEN_PURPOSES = ['email_verify', 'password_reset'] as const;
export type AuthTokenPurpose = (typeof AUTH_TOKEN_PURPOSES)[number];

export type AuthTokenDocument = HydratedDocument<AuthToken>;

/**
 * Single-use, expiring tokens delivered by email (verify address / reset
 * password). Like sessions, only the SHA-256 hash of the emailed token is stored,
 * so a DB leak can't be redeemed. A token is spent by setting `usedAt`.
 */
@Schema({ collection: 'authTokens', timestamps: true })
export class AuthToken {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, unique: true })
  tokenHash!: string;

  @Prop({ type: String, enum: AUTH_TOKEN_PURPOSES, required: true })
  purpose!: AuthTokenPurpose;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop({ type: Date, default: null })
  usedAt!: Date | null;
}

export const AuthTokenSchema = SchemaFactory.createForClass(AuthToken);

// TTL index: Mongo drops the row once expiresAt passes. `consume` also checks
// expiry, so this is cleanup/defense-in-depth, not the only guard.
AuthTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
