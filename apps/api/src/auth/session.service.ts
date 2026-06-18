import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { PublicUser } from '@bdph/types';
import { UsersService } from '../users/users.service';
import { Session, SessionDocument } from './schemas/session.schema';
import { createSessionToken, hashToken } from './token.util';

export const SESSION_COOKIE = 'bdph_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

interface SessionMeta {
  userAgent?: string | null;
  ip?: string | null;
}

@Injectable()
export class SessionService {
  constructor(
    @InjectModel(Session.name) private readonly sessionModel: Model<SessionDocument>,
    private readonly users: UsersService,
  ) {}

  async issue(
    userId: string,
    meta: SessionMeta,
  ): Promise<{ token: string; maxAgeSeconds: number }> {
    const { raw, hash } = createSessionToken();
    await this.sessionModel.create({
      userId: new Types.ObjectId(userId),
      tokenHash: hash,
      userAgent: meta.userAgent ?? null,
      ip: meta.ip ?? null,
      expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000),
    });
    return { token: raw, maxAgeSeconds: SESSION_TTL_SECONDS };
  }

  // Resolves a raw cookie token to the canonical user, or null if the session
  // is unknown, revoked, or expired.
  async resolve(rawToken: string): Promise<PublicUser | null> {
    const session = await this.sessionModel
      .findOne({ tokenHash: hashToken(rawToken), revokedAt: null, expiresAt: { $gt: new Date() } })
      .lean();
    if (!session) return null;

    const user = await this.users.findById(session.userId.toString());
    return user ? this.users.toPublic(user) : null;
  }

  async revoke(rawToken: string): Promise<void> {
    await this.sessionModel.updateOne(
      { tokenHash: hashToken(rawToken), revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
  }
}
