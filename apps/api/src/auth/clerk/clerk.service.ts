import {
  Injectable,
  Logger,
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
  // Web origin(s) allowed to mint the tokens we accept, from CLERK_AUTHORIZED_PARTIES
  // (comma-separated). Passed to verifyToken to reject a token minted for a different
  // app on the same Clerk instance (a different `azp`). Empty (unset) => the check is
  // skipped and the token is trusted by its signature alone, which already binds it
  // to this Clerk instance.
  private readonly authorizedParties: string[];
  private readonly logger = new Logger(ClerkService.name);
  private client?: ClerkClient;

  constructor(config: ConfigService) {
    this.secretKey = config.get<string>('CLERK_SECRET_KEY') ?? '';
    this.webhookSecret = config.get<string>('CLERK_WEBHOOK_SECRET') ?? '';
    // Read the allowed origins only from CLERK_AUTHORIZED_PARTIES (not CORS_ORIGINS)
    // so the azp check is opt-in: unset => empty => skipped. Trailing slashes are
    // stripped so `https://app.example.com/` and `https://app.example.com` match.
    this.authorizedParties = (config.get<string>('CLERK_AUTHORIZED_PARTIES') ?? '')
      .split(',')
      .map((origin) => origin.trim().replace(/\/+$/, ''))
      .filter(Boolean);
    // Without an azp allow-list a token minted for a different app on the SAME Clerk
    // instance would be accepted. Harmless for a single-app instance, but warn in
    // production so it's a deliberate choice rather than silent drift.
    if (
      config.get<string>('NODE_ENV') === 'production' &&
      this.secretKey &&
      this.authorizedParties.length === 0
    ) {
      this.logger.warn(
        'CLERK_AUTHORIZED_PARTIES is unset: Clerk tokens are accepted by signature only ' +
          '(no azp allow-list). Set it if this Clerk instance is shared with another app.',
      );
    }
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
  // verifyToken resolves with the decoded payload on success and THROWS on a
  // malformed token or a failed `azp` check — so wrap it and map every failure to a
  // 401, never letting one escape as a 500.
  async verifySessionToken(token: string): Promise<string> {
    if (!this.secretKey) {
      throw new ServiceUnavailableException('Clerk is not configured');
    }
    // Map a thrown error to null so any failure becomes a 401 (never a 500).
    const result = await verifyToken(token, {
      secretKey: this.secretKey,
      // Omit when empty so verifyToken skips the check (default: trust the
      // signature) rather than rejecting every token.
      ...(this.authorizedParties.length ? { authorizedParties: this.authorizedParties } : {}),
    }).catch((error: unknown) => {
      // Log (never the token) so a bad secret / Clerk outage / azp mismatch is
      // visible instead of silent — the client still just gets a 401.
      this.logger.warn(
        `Clerk token verification failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return null;
    });
    // @clerk/backend@3.12.0 RESOLVES verifyToken to the decoded JwtPayload directly
    // (`sub` at the top level) and throws on failure. Its declared type — and our
    // unit-test mock — instead model the older `{ data, errors }` envelope. Read both
    // shapes: treat a present `errors` as a rejection, then take `sub` from `.data`
    // when the envelope is used, otherwise from the payload itself. (Missing this is
    // what made every valid token 401: `result.data.sub` is always undefined when the
    // SDK returns the payload directly.)
    const verified = result as
      | { sub?: string; data?: { sub?: string }; errors?: unknown }
      | null;
    if (!verified || verified.errors) {
      throw new UnauthorizedException('Invalid Clerk session token');
    }
    const sub = verified.data?.sub ?? verified.sub;
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
