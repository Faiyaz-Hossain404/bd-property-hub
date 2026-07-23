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

interface UpsertClerkInput {
  clerkUserId: string;
  email: string;
  name: string;
  locale?: Locale;
}

export interface UpsertClerkResult {
  user: UserDocument;
  // True when the caller must revoke the user's pre-existing sessions because a
  // previously-unverified account was just linked (and its password cleared).
  revokePriorSessions: boolean;
}

// Mongo duplicate-key error code — used to recover from a lost create race.
function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000
  );
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

  findByClerkUserId(clerkUserId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ clerkUserId }).exec();
  }

  // Resolve a Clerk identity to the canonical user, creating or linking as needed:
  //   1. already linked by clerkUserId  -> keep email/name in sync
  //   2. an account with the same email -> link the Clerk id onto it
  //   3. otherwise                      -> create a Clerk-only user (no password)
  // The partial-unique index on clerkUserId guards against duplicate links; a
  // concurrent create (the bridge endpoint and the webhook racing on first
  // sign-in) surfaces as E11000, which we treat as "already created" and resolve
  // by re-reading the winner.
  //
  // Returns `revokePriorSessions: true` when it linked onto an account whose email
  // was NOT already verified first-party — see the security note in the byEmail
  // branch. The caller must then revoke that account's existing sessions.
  async upsertClerkUser(input: UpsertClerkInput): Promise<UpsertClerkResult> {
    const email = input.email.toLowerCase();

    // Select the (normally hidden) passwordHash so the returned document reflects
    // hasPassword correctly for accounts that also have a first-party password —
    // saving never rewrites it, since only modified paths are persisted.
    const linked = await this.userModel
      .findOne({ clerkUserId: input.clerkUserId })
      .select('+passwordHash')
      .exec();
    if (linked) {
      linked.email = email;
      linked.name = input.name;
      await linked.save();
      return { user: linked, revokePriorSessions: false };
    }

    const byEmail = await this.userModel.findOne({ email }).select('+passwordHash').exec();
    if (byEmail) {
      // SECURITY: an existing account whose email was never verified first-party
      // may be an unverified "squat" registered against the victim's address (our
      // register flow issues a session before verification). Clerk has now proven
      // ownership of the email, so distrust that account's first-party credential:
      // drop its password so it can't be used to log in, and tell the caller to
      // revoke any sessions minted before this link. An already-verified account
      // proved ownership through the normal flow, so its password is kept.
      const wasEmailVerified = byEmail.emailVerified;
      byEmail.clerkUserId = input.clerkUserId;
      byEmail.emailVerified = true;
      if (byEmail.status === 'pending_verification') {
        byEmail.status = 'active';
      }
      if (!wasEmailVerified) {
        byEmail.passwordHash = null;
      }
      await byEmail.save();
      return { user: byEmail, revokePriorSessions: !wasEmailVerified };
    }

    try {
      const created = await this.userModel.create({
        email,
        name: input.name,
        locale: input.locale ?? 'en',
        passwordHash: null,
        clerkUserId: input.clerkUserId,
        emailVerified: true,
        status: 'active',
      });
      return { user: created, revokePriorSessions: false };
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        const existing =
          (await this.userModel.findOne({ clerkUserId: input.clerkUserId }).exec()) ??
          (await this.userModel.findOne({ email }).exec());
        if (existing) return { user: existing, revokePriorSessions: false };
      }
      throw error;
    }
  }

  // Mirror a Clerk `user.deleted` event: mark the linked account deleted (the same
  // status the session guard already treats as denied) rather than hard-deleting,
  // so its listings/history stay intact. No-op if no account is linked.
  async softDeleteByClerkUserId(clerkUserId: string): Promise<void> {
    await this.userModel.updateOne({ clerkUserId }, { $set: { status: 'deleted' } }).exec();
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
