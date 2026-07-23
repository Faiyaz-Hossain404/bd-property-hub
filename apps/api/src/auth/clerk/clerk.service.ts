import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClerkClient, verifyToken, type ClerkClient } from '@clerk/backend';
import { Webhook } from 'svix';
import { buildDisplayName, type ClerkWebhookEvent } from './clerk.types';

export interface ClerkProfile {
  email: string;
  name: string;
}

// Thin wrapper over the Clerk Backend SDK. Reads its keys from config; when they
// are unset the whole Clerk surface is inert (endpoints answer 503) so the app
// still boots and first-party email/password auth keeps working. Only touched
// when the bridge endpoint or the webhook is actually called.
@Injectable()
export class ClerkService {
  private readonly secretKey: string;
  private readonly webhookSecret: string;
  // The frontend origin(s) Clerk mints tokens for. Passed to verifyToken so a
  // token minted for a different app on the same Clerk instance (a different `azp`)
  // is rejected here. Empty (nothing configured) => the check is skipped.
  private readonly authorizedParties: string[];
  private client?: ClerkClient;

  constructor(config: ConfigService) {
    this.secretKey = config.get<string>('CLERK_SECRET_KEY') ?? '';
    this.webhookSecret = config.get<string>('CLERK_WEBHOOK_SECRET') ?? '';
    const appBaseUrl = config.get<string>('APP_BASE_URL') ?? '';
    const corsOrigins = (config.get<string>('CORS_ORIGINS') ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    this.authorizedParties = [appBaseUrl, ...corsOrigins]
      .filter(Boolean)
      .map((origin) => origin.replace(/\/+$/, ''));
  }

  isConfigured(): boolean {
    return this.secretKey.length > 0;
  }

  private getClient(): ClerkClient {
    if (!this.secretKey) {
      throw new ServiceUnavailableException('Clerk is not configured');
    }
    if (!this.client) {
      this.client = createClerkClient({ secretKey: this.secretKey });
    }
    return this.client;
  }

  // Verify a Clerk session JWT and return the Clerk user id (the `sub` claim).
  // verifyToken resolves with { data } | { errors } rather than throwing, so both
  // an invalid signature and a missing subject map to a 401.
  async verifySessionToken(token: string): Promise<string> {
    if (!this.secretKey) {
      throw new ServiceUnavailableException('Clerk is not configured');
    }
    const result = await verifyToken(token, {
      secretKey: this.secretKey,
      // Omit when empty so verifyToken skips the check (local dev without origins
      // configured) rather than rejecting every token.
      ...(this.authorizedParties.length ? { authorizedParties: this.authorizedParties } : {}),
    });
    // Access `sub` defensively: the SDK's JwtPayload type resolves inconsistently
    // across the project's tsc and ts-jest, so we don't rely on its shape here.
    const sub = result.errors ? undefined : (result.data as { sub?: string } | undefined)?.sub;
    if (!sub) {
      throw new UnauthorizedException('Invalid Clerk session token');
    }
    return sub;
  }

  // Fetch the canonical email + display name for a Clerk user. The session JWT
  // carries only the user id, so the profile is read from Clerk's Backend API.
  async getProfile(clerkUserId: string): Promise<ClerkProfile> {
    const user = await this.getClient().users.getUser(clerkUserId);
    const primary =
      user.primaryEmailAddress?.emailAddress ??
      user.emailAddresses.find((entry) => entry.id === user.primaryEmailAddressId)?.emailAddress ??
      user.emailAddresses[0]?.emailAddress;
    if (!primary) {
      throw new UnauthorizedException('Clerk account has no email address');
    }
    const email = primary.toLowerCase();
    return { email, name: buildDisplayName(user.firstName, user.lastName, email) };
  }

  // Verify a Clerk webhook against the RAW request body (Svix signs the exact
  // bytes, so a re-serialized JSON body would fail). Throws WebhookVerificationError
  // on a bad signature; the controller maps that to a 400.
  verifyWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): ClerkWebhookEvent {
    if (!this.webhookSecret) {
      throw new ServiceUnavailableException('Clerk webhook secret is not configured');
    }
    const webhook = new Webhook(this.webhookSecret);
    return webhook.verify(rawBody, {
      'svix-id': String(headers['svix-id'] ?? ''),
      'svix-timestamp': String(headers['svix-timestamp'] ?? ''),
      'svix-signature': String(headers['svix-signature'] ?? ''),
    }) as ClerkWebhookEvent;
  }
}
