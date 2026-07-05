import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import {
  loginInputSchema,
  registerInputSchema,
  requestPasswordResetInputSchema,
  resendVerificationInputSchema,
  resetPasswordInputSchema,
  verifyEmailInputSchema,
  type LoginInput,
  type PublicUser,
  type RegisterInput,
  type RequestPasswordResetInput,
  type ResendVerificationInput,
  type ResetPasswordInput,
  type VerifyEmailInput,
} from '@bdph/types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser } from './current-user.decorator';
import { LocalAuthProvider } from './local-auth.provider';
import { AccountFlowsService } from './account-flows.service';
import { SESSION_COOKIE, SessionService } from './session.service';
import { SessionAuthGuard } from './session-auth.guard';

// Credential endpoints are brute-force targets, so they get a far tighter budget
// than the global default: 10 attempts per minute per IP.
const AUTH_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

function sessionCookieOptions(maxAgeSeconds?: number): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    ...(maxAgeSeconds ? { maxAge: maxAgeSeconds * 1000 } : {}),
  };
}

// First-party (manual) auth. Clerk authenticates via webhook sync + JWT verify
// rather than these routes; both resolve to the same canonical user and session.
@Controller('auth')
export class AuthController {
  constructor(
    private readonly local: LocalAuthProvider,
    private readonly sessions: SessionService,
    private readonly accounts: AccountFlowsService,
  ) {}

  @Post('register')
  @HttpCode(201)
  @Throttle(AUTH_THROTTLE)
  async register(
    @Body(new ZodValidationPipe(registerInputSchema)) body: RegisterInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PublicUser> {
    const user = await this.local.register(body);
    // Send the verification email (best-effort inside the service). The user is
    // signed in immediately either way; verification can be completed later.
    await this.accounts.sendVerificationEmail(user.id, user.email, user.name, user.locale);
    await this.startSession(user, req, res);
    return user;
  }

  @Post('login')
  @HttpCode(200)
  @Throttle(AUTH_THROTTLE)
  async login(
    @Body(new ZodValidationPipe(loginInputSchema)) body: LoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PublicUser> {
    const user = await this.local.login(body);
    await this.startSession(user, req, res);
    return user;
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  me(@CurrentUser() user: PublicUser): PublicUser {
    return user;
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(SessionAuthGuard)
  async logout(
    @Req() req: Request & { cookies?: Record<string, string> },
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: true }> {
    const token = req.cookies?.[SESSION_COOKIE];
    if (token) {
      await this.sessions.revoke(token);
    }
    res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
    return { success: true };
  }

  // Confirm an email address from the emailed link. The token is the credential,
  // so this is public (the clicker may be signed out or on another device).
  @Post('verify-email')
  @HttpCode(200)
  @Throttle(AUTH_THROTTLE)
  async verifyEmail(
    @Body(new ZodValidationPipe(verifyEmailInputSchema)) body: VerifyEmailInput,
  ): Promise<{ success: true }> {
    await this.accounts.verifyEmail(body.token);
    return { success: true };
  }

  // Re-send a verification email. Always 202 with a generic body regardless of
  // whether the email exists or is already verified (no account enumeration).
  @Post('resend-verification')
  @HttpCode(202)
  @Throttle(AUTH_THROTTLE)
  async resendVerification(
    @Body(new ZodValidationPipe(resendVerificationInputSchema)) body: ResendVerificationInput,
  ): Promise<{ success: true }> {
    await this.accounts.resendVerification(body.email);
    return { success: true };
  }

  // Start a password reset. Always 202/generic (no enumeration); only sends mail
  // when a first-party account exists for the email.
  @Post('forgot-password')
  @HttpCode(202)
  @Throttle(AUTH_THROTTLE)
  async forgotPassword(
    @Body(new ZodValidationPipe(requestPasswordResetInputSchema)) body: RequestPasswordResetInput,
  ): Promise<{ success: true }> {
    await this.accounts.requestPasswordReset(body.email);
    return { success: true };
  }

  // Complete a password reset with the emailed token + new password. Consuming the
  // token also revokes all existing sessions for that user.
  @Post('reset-password')
  @HttpCode(200)
  @Throttle(AUTH_THROTTLE)
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordInputSchema)) body: ResetPasswordInput,
  ): Promise<{ success: true }> {
    await this.accounts.resetPassword(body.token, body.password);
    return { success: true };
  }

  private async startSession(user: PublicUser, req: Request, res: Response): Promise<void> {
    const { token, maxAgeSeconds } = await this.sessions.issue(user.id, {
      userAgent: req.headers['user-agent'] ?? null,
      ip: req.ip ?? null,
    });
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions(maxAgeSeconds));
  }
}
