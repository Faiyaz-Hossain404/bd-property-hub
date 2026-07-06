import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { Locale, PublicUser, Role } from '@bdph/types';
import { User, UserDocument } from './schemas/user.schema';

interface CreateLocalInput {
  email: string;
  name: string;
  locale: Locale;
  passwordHash: string;
}

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async createLocal(input: CreateLocalInput): Promise<UserDocument> {
    const existing = await this.userModel.exists({ email: input.email });
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    return this.userModel.create({
      email: input.email,
      name: input.name,
      locale: input.locale,
      passwordHash: input.passwordHash,
    });
  }

  // passwordHash is `select: false`, so opt in explicitly for credential checks.
  findByEmailWithSecret(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).select('+passwordHash').exec();
  }

  // Default projection (no passwordHash) — for lookups that don't need the secret,
  // e.g. resending a verification email.
  findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  // Mark the address verified and, if the account was only pending verification,
  // activate it. Never downgrades an already-active/suspended/deleted status.
  async markEmailVerified(userId: string): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.emailVerified = true;
    if (user.status === 'pending_verification') {
      user.status = 'active';
    }
    await user.save();
  }

  // Replace the first-party password hash (used by password reset). Callers hash
  // the plaintext with PasswordService before calling.
  async setPasswordHash(userId: string, passwordHash: string): Promise<void> {
    const result = await this.userModel
      .updateOne({ _id: new Types.ObjectId(userId) }, { $set: { passwordHash } })
      .exec();
    if (result.matchedCount === 0) {
      throw new NotFoundException('User not found');
    }
  }

  async addRole(userId: string, role: Role): Promise<UserDocument> {
    const updated = await this.userModel
      .findByIdAndUpdate(userId, { $addToSet: { roles: role } }, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException('User not found');
    }
    return updated;
  }

  toPublic(user: UserDocument): PublicUser {
    const createdAt = user.get('createdAt') as Date | undefined;
    return {
      id: user._id.toString(),
      email: user.email,
      emailVerified: user.emailVerified,
      name: user.name,
      phone: user.phone,
      roles: user.roles,
      status: user.status,
      // Coalesce so users created before this field default to 'unverified'.
      kycStatus: user.kycStatus ?? 'unverified',
      kycReason: user.kycReason ?? null,
      locale: user.locale,
      hasPassword: Boolean(user.passwordHash),
      hasClerkLink: Boolean(user.clerkUserId),
      createdAt: (createdAt ?? new Date()).toISOString(),
    };
  }
}
