import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Locale } from '@bdph/types';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { verificationEmail, passwordResetEmail } from '../email/account-emails';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { AuthTokenService } from './auth-token.service';

const EMAIL_VERIFY_TTL_SECONDS = 60 * 60 * 24; // 24 hours
const PASSWORD_RESET_TTL_SECONDS = 60 * 60; // 1 hour

function detail(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Orchestrates the email-driven account flows (verify address, reset password)
 * across the token store, the email sender, and the user/session services. Keeps
 * this logic out of the thin AuthController.
 */
@Injectable()
export class AccountFlowsService {
  private readonly logger = new Logger(AccountFlowsService.name);
  private readonly appBaseUrl: string;

  constructor(
    config: ConfigService,
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly tokens: AuthTokenService,
    private readonly email: EmailService,
  ) {
    this.appBaseUrl = (config.get<string>('APP_BASE_URL') || 'http://localhost:3000').replace(
      /\/+$/,
      '',
    );
  }

  // Best-effort verification email (called after registration and on resend). A
  // send failure must not break the caller — the account still exists and the user
  // can request another link.
  async sendVerificationEmail(
    userId: string,
    email: string,
    name: string,
    locale: Locale,
  ): Promise<void> {
    try {
      const token = await this.tokens.issue(userId, 'email_verify', EMAIL_VERIFY_TTL_SECONDS);
      const link = this.buildLink(locale, 'verify-email', token);
      await this.email.send(verificationEmail(email, name, link));
    } catch (error) {
      this.logger.warn(`Failed to send verification email: ${detail(error)}`);
    }
  }

  async verifyEmail(token: string): Promise<void> {
    const userId = await this.tokens.consume(token, 'email_verify');
    if (!userId) {
      throw new BadRequestException('This verification link is invalid or has expired.');
    }
    await this.users.markEmailVerified(userId);
  }

  // Generic by design — never reveals whether the email maps to an account or
  // whether it's already verified. Only actually sends for an unverified account.
  async resendVerification(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (user && !user.emailVerified) {
      await this.sendVerificationEmail(user._id.toString(), user.email, user.name, user.locale);
    }
  }

  // Generic by design (no enumeration). Only sends when a first-party (password)
  // account exists for the email; Clerk-only accounts have no password to reset.
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.users.findByEmailWithSecret(email);
    if (!user || !user.passwordHash) return;
    try {
      const token = await this.tokens.issue(
        user._id.toString(),
        'password_reset',
        PASSWORD_RESET_TTL_SECONDS,
      );
      const link = this.buildLink(user.locale, 'reset-password', token);
      await this.email.send(passwordResetEmail(user.email, user.name, link));
    } catch (error) {
      this.logger.warn(`Failed to send password reset email: ${detail(error)}`);
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const userId = await this.tokens.consume(token, 'password_reset');
    if (!userId) {
      throw new BadRequestException('This reset link is invalid or has expired.');
    }
    const passwordHash = await this.passwords.hash(newPassword);
    await this.users.setPasswordHash(userId, passwordHash);
    // Invalidate every existing session so a reset always ends other sessions
    // (e.g. an attacker's) — the user re-authenticates with the new password.
    await this.sessions.revokeAllForUser(userId);
  }

  // Locale-prefixed deep link into the web app, e.g.
  // https://app/<locale>/verify-email?token=<raw>. The token is URL-encoded.
  private buildLink(locale: Locale, path: string, token: string): string {
    return `${this.appBaseUrl}/${locale}/${path}?token=${encodeURIComponent(token)}`;
  }
}
