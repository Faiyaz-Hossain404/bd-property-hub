import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AuthToken,
  AuthTokenDocument,
  type AuthTokenPurpose,
} from './schemas/auth-token.schema';
import { createSessionToken, hashToken } from './token.util';

@Injectable()
export class AuthTokenService {
  constructor(
    @InjectModel(AuthToken.name) private readonly tokenModel: Model<AuthTokenDocument>,
  ) {}

  // Issue a fresh token for (user, purpose). Any earlier unused token of the same
  // purpose is invalidated first, so only the most recently emailed link works —
  // a re-request quietly supersedes the previous one.
  async issue(userId: string, purpose: AuthTokenPurpose, ttlSeconds: number): Promise<string> {
    const uid = new Types.ObjectId(userId);
    await this.tokenModel.updateMany(
      { userId: uid, purpose, usedAt: null },
      { $set: { usedAt: new Date() } },
    );
    const { raw, hash } = createSessionToken();
    await this.tokenModel.create({
      userId: uid,
      tokenHash: hash,
      purpose,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
    });
    return raw;
  }

  // Atomically spend a token: it must match by hash + purpose, be unused, and
  // unexpired. Returns the userId, or null if invalid/expired/already used. The
  // findOneAndUpdate makes redemption single-use even under concurrent requests —
  // the second caller no longer matches `usedAt: null`.
  async consume(rawToken: string, purpose: AuthTokenPurpose): Promise<string | null> {
    const doc = await this.tokenModel
      .findOneAndUpdate(
        {
          tokenHash: hashToken(rawToken),
          purpose,
          usedAt: null,
          expiresAt: { $gt: new Date() },
        },
        { $set: { usedAt: new Date() } },
      )
      .exec();
    return doc ? doc.userId.toString() : null;
  }
}
