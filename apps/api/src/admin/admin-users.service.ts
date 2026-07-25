import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import {
  ASSIGNABLE_ROLES,
  effectiveRole,
  type AdminSettableUserStatus,
  type AdminUsersQuery,
  type ApiPage,
  type AssignableRole,
  type PublicUser,
  type Role,
} from '@bdph/types';
import { User, UserDocument } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { SessionService } from '../auth/session.service';
import { escapeRegExp } from '../listings/listing-search.util';

// Assigned roles that make an account "staff". Acting on a staff account (suspend)
// is reserved for the prime admin — a standard admin must not be able to disable a
// peer or the prime (privilege-escalation / denial-of-service guard).
const STAFF_ROLES: readonly Role[] = ['admin_prime', 'admin'];

// Legacy stored values that collapse to a given role, so the admin-list role
// facet still matches pre-migration documents (which have `roles`, not `role`).
const LEGACY_ROLE_VALUES: Record<Role, string[]> = {
  admin_prime: ['admin_prime', 'super_admin'],
  admin: ['admin', 'customer_support'],
  seller: ['seller'],
  buyer: ['buyer'],
};

// User management for the admin dashboard (FR-A1 / user.suspend /
// staff.assign_role). The controller applies the role gate (admin+ for the list
// and status routes, super_admin only for role assignment); this service applies
// the per-target ownership/privilege rules that a role check alone can't express.
@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly users: UsersService,
    private readonly sessions: SessionService,
  ) {}

  // Paginated, newest-first user list with optional free-text (name/email) search
  // and role/status facets. Keyset cursor over (createdAt desc, _id desc) — opaque
  // so a client can't hand-craft it to deep-page.
  async list(query: AdminUsersQuery): Promise<ApiPage<PublicUser>> {
    const { q, role, status, cursor, limit } = query;
    const filter: FilterQuery<UserDocument> = {};
    // Match the single `role` field OR — for un-migrated documents that only have
    // the legacy `roles` array — the legacy value(s) that collapse to this role.
    // ANDed via $and so it composes with the `q` $or and the cursor keyset below.
    if (role) {
      filter.$and = [
        ...(filter.$and ?? []),
        {
          $or: [
            { role },
            { role: { $exists: false }, roles: { $in: LEGACY_ROLE_VALUES[role] } },
          ],
        },
      ];
    }
    if (status) filter.status = status;
    if (q) {
      // Escaped to a literal pattern so regex metacharacters in user input match
      // verbatim — no injection / ReDoS via attacker-controlled syntax.
      const pattern = new RegExp(escapeRegExp(q), 'i');
      filter.$or = [{ name: pattern }, { email: pattern }];
    }
    if (cursor) {
      const { createdAt, id } = this.decodeCursor(cursor);
      // ANDed with the facet predicates. `q` already uses $or, so express the
      // keyset as $and to avoid two top-level $or keys clobbering each other.
      const keyset: FilterQuery<UserDocument> = {
        $or: [{ createdAt: { $lt: createdAt } }, { createdAt, _id: { $lt: id } }],
      };
      filter.$and = [...(filter.$and ?? []), keyset];
    }

    const docs = await this.userModel
      .find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .exec();

    const hasMore = docs.length > limit;
    const items = hasMore ? docs.slice(0, limit) : docs;
    const last = items[items.length - 1];
    const nextCursor = hasMore && last ? this.encodeCursor(last) : null;
    return {
      data: items.map((user) => this.users.toPublic(user)),
      page: { nextCursor, limit },
    };
  }

  // Suspend or reactivate an account (user.suspend). `actor` is the authenticated
  // caller (already gated to admin/super_admin by the controller).
  async setStatus(
    actor: PublicUser,
    userId: string,
    status: AdminSettableUserStatus,
  ): Promise<PublicUser> {
    const target = await this.findOrThrow(userId);

    // You cannot suspend yourself — an admin locking themselves out is never the
    // intent, and it protects against fat-fingering away your own access.
    if (target._id.toString() === actor.id) {
      throw new ForbiddenException('You cannot change your own account status');
    }
    // Only the prime admin may act on a staff account; a standard admin is limited
    // to end-user (buyer/seller) accounts.
    if (this.isStaff(target) && actor.role !== 'admin_prime') {
      throw new ForbiddenException('Only the prime admin can manage staff accounts');
    }

    target.status = status;
    await target.save();
    // Revoking on suspend logs the account out of every device immediately; the
    // session-resolve gate already blocks it, but this also clears the stored
    // sessions rather than leaving them to expire.
    if (status === 'suspended') {
      await this.sessions.revokeAllForUser(target._id.toString());
    }
    this.logger.log(`User ${target._id.toString()} status set to "${status}" by ${actor.id}`);
    return this.users.toPublic(target);
  }

  // Set an account's single role (staff.assign_role — admin_prime only, enforced
  // at the controller). The prime cannot change their OWN role: that blanket
  // self-block is what stops the sole prime from demoting themselves into a
  // zero-prime lockout (there is no DB uniqueness guard on the prime role).
  async assignRole(
    actor: PublicUser,
    userId: string,
    role: AssignableRole,
  ): Promise<PublicUser> {
    // Defense-in-depth: role assignment is admin_prime-only. The controller's
    // method-level @Roles('admin_prime') already enforces this, but assert it here
    // too so a future controller/guard regression can't quietly let a standard
    // admin re-role accounts (including self-promotion) — this is the most
    // sensitive capability in the module, so it doesn't rely on the route gate
    // alone.
    if (actor.role !== 'admin_prime') {
      throw new ForbiddenException('Only the prime admin can assign roles');
    }
    // admin_prime is never assignable through this path — it is conferred solely by
    // SUPER_ADMIN_EMAIL. The DTO (ASSIGNABLE_ROLES) already excludes it; re-check
    // here so the rule holds even if a caller bypasses the pipe.
    if (!ASSIGNABLE_ROLES.includes(role as AssignableRole)) {
      throw new BadRequestException('That role cannot be assigned');
    }
    const target = await this.findOrThrow(userId);
    if (target._id.toString() === actor.id) {
      throw new ForbiddenException('You cannot change your own role');
    }
    const updated = await this.users.setRole(target._id.toString(), role);
    this.logger.log(`User ${updated._id.toString()} role set to "${role}" by ${actor.id}`);
    return this.users.toPublic(updated);
  }

  private isStaff(user: UserDocument): boolean {
    return STAFF_ROLES.includes(effectiveRole(user));
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

  // Opaque keyset cursor = base64url({ c: createdAt ISO, i: _id }); mirrors the
  // listings catalog cursor so the pagination contract is identical.
  private encodeCursor(user: UserDocument): string {
    const createdAt = (user.get('createdAt') as Date).toISOString();
    const json = JSON.stringify({ c: createdAt, i: user._id.toString() });
    return Buffer.from(json, 'utf8').toString('base64url');
  }

  private decodeCursor(cursor: string): { createdAt: Date; id: Types.ObjectId } {
    let parsed: unknown;
    try {
      parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    } catch {
      throw new BadRequestException('Invalid cursor');
    }
    const record = parsed as { c?: unknown; i?: unknown };
    const createdAt = typeof record.c === 'string' ? new Date(record.c) : new Date(NaN);
    if (
      Number.isNaN(createdAt.getTime()) ||
      typeof record.i !== 'string' ||
      !Types.ObjectId.isValid(record.i)
    ) {
      throw new BadRequestException('Invalid cursor');
    }
    return { createdAt, id: new Types.ObjectId(record.i) };
  }
}
