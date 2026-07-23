import {
  BadRequestException,
  Controller,
  HttpCode,
  Post,
  Req,
  type RawBodyRequest,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { WebhookVerificationError } from 'svix';
import type { Request } from 'express';
import { UsersService } from '../../users/users.service';
import { SessionService } from '../session.service';
import { ClerkService } from './clerk.service';
import {
  buildDisplayName,
  pickPrimaryEmail,
  type ClerkUserData,
  type ClerkWebhookEvent,
} from './clerk.types';

// Clerk -> our DB user sync. Clerk posts Svix-signed events as users are created,
// updated, or deleted in Clerk; we mirror them onto the canonical user record by
// clerkUserId. The bridge endpoint already upserts on sign-in, so this webhook is
// for keeping records in sync with out-of-band changes, not a hard dependency of
// the login path. Resolves under /api/v1/webhooks/clerk.
@Controller('webhooks/clerk')
export class ClerkWebhookController {
  constructor(
    private readonly clerk: ClerkService,
    private readonly users: UsersService,
    private readonly sessions: SessionService,
  ) {}

  @Post()
  @HttpCode(200)
  @SkipThrottle()
  async handle(@Req() req: RawBodyRequest<Request>): Promise<{ received: true }> {
    // rawBody is only captured when the app is created with { rawBody: true }
    // (see main.ts) — Svix must verify the exact bytes Clerk signed.
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Missing request body');
    }

    let event: ClerkWebhookEvent;
    try {
      event = this.clerk.verifyWebhook(rawBody, req.headers);
    } catch (error) {
      if (error instanceof WebhookVerificationError) {
        throw new BadRequestException('Invalid webhook signature');
      }
      throw error;
    }

    // Defensive: the payload is authenticated by the signature above, but guard
    // its shape so a malformed body is acknowledged (200) rather than 500-ing.
    if (event && typeof event.type === 'string') {
      await this.apply(event);
    }
    return { received: true };
  }

  private async apply(event: ClerkWebhookEvent): Promise<void> {
    if (event.type === 'user.created' || event.type === 'user.updated') {
      const data = event.data as ClerkUserData;
      const email = pickPrimaryEmail(data);
      // A Clerk user with no email (e.g. phone-only) has nothing to mirror onto our
      // email-keyed record — acknowledge and skip rather than fail the webhook.
      if (!email) return;
      const name = buildDisplayName(data.first_name, data.last_name, email);
      const { user, revokePriorSessions } = await this.users.upsertClerkUser({
        clerkUserId: data.id,
        email,
        name,
      });
      // Same protection as the bridge: if this linked a previously-unverified
      // account, revoke its prior sessions (its password was already cleared).
      if (revokePriorSessions) {
        await this.sessions.revokeAllForUser(user.id);
      }
      return;
    }

    if (event.type === 'user.deleted') {
      const id = (event.data as { id?: string }).id;
      if (id) {
        await this.users.softDeleteByClerkUserId(id);
      }
    }
    // Any other event type is acknowledged (200) and ignored.
  }
}
