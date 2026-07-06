import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import type { SellerKycStatus } from '@bdph/types';
import { User, UserDocument } from '../users/schemas/user.schema';
import {
  SellerVerificationEvent,
  SellerVerificationEventDocument,
} from './seller-verification-event.schema';
import { canRequestVerificationFrom, canReviewVerificationFrom } from './seller-verification';

@Injectable()
export class SellerVerificationService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(SellerVerificationEvent.name)
    private readonly eventModel: Model<SellerVerificationEventDocument>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  // Sellers waiting for a verification decision, oldest request first — the admin
  // review queue.
  findPendingQueue(): Promise<UserDocument[]> {
    return this.userModel.find({ kycStatus: 'pending' }).sort({ updatedAt: 1 }).exec();
  }

  // Seller asking to be verified (FR-S8). Allowed from 'unverified' or after a
  // 'rejected' decision; the actor is the seller themselves. Clears any prior
  // rejection note as the request starts fresh.
  async requestVerification(userId: string): Promise<UserDocument> {
    const user = await this.findOrThrow(userId);
    if (!canRequestVerificationFrom(user.kycStatus)) {
      throw new ConflictException(`Cannot request verification from status "${user.kycStatus}"`);
    }
    return this.transition(user, 'pending', userId, null);
  }

  // Admin approving a pending seller — they can now submit listings for review.
  async approve(actorId: string, userId: string): Promise<UserDocument> {
    const user = await this.findOrThrow(userId);
    if (!canReviewVerificationFrom(user.kycStatus)) {
      throw new ConflictException(`Cannot approve verification from status "${user.kycStatus}"`);
    }
    return this.transition(user, 'verified', actorId, null);
  }

  // Admin rejecting a pending seller, with a reason the seller sees before
  // requesting again (MOD-2 — no separate "changes requested" state).
  async reject(actorId: string, userId: string, reason: string): Promise<UserDocument> {
    const user = await this.findOrThrow(userId);
    if (!canReviewVerificationFrom(user.kycStatus)) {
      throw new ConflictException(`Cannot reject verification from status "${user.kycStatus}"`);
    }
    return this.transition(user, 'rejected', actorId, reason);
  }

  private async findOrThrow(userId: string): Promise<UserDocument> {
    // A malformed id is a clean 404 rather than a Mongoose CastError (500).
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('User not found');
    }
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  // Updates the user's kycStatus/kycReason and appends a sellerVerificationHistory
  // row in one transaction, mirroring the listing status-history audit pattern.
  private async transition(
    user: UserDocument,
    toStatus: SellerKycStatus,
    actorId: string,
    reason: string | null,
  ): Promise<UserDocument> {
    const fromStatus = user.kycStatus;
    const session = await this.connection.startSession();
    try {
      await session.withTransaction(async () => {
        user.kycStatus = toStatus;
        user.kycReason = reason;
        await user.save({ session });
        await this.eventModel.create(
          [
            {
              userId: user._id,
              fromStatus,
              toStatus,
              actorId: new Types.ObjectId(actorId),
              reason,
            },
          ],
          { session },
        );
      });
    } finally {
      await session.endSession();
    }
    return user;
  }
}
