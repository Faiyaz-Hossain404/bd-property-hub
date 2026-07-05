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
  type LoginInput,
  type PublicUser,
  type RegisterInput,
} from '@bdph/types';

// Credential endpoints are brute-force targets, so they get a far tighter budget
// than the global default: 10 attempts per minute per IP.
const AUTH_THROTTLE = { default: { limit: 10, ttl: 60_000 } };
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser } from './current-user.decorator';
import { LocalAuthProvider } from './local-auth.provider';
import { SESSION_COOKIE, SessionService } from './session.service';
import { SessionAuthGuard } from './session-auth.guard';

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

  private async startSession(user: PublicUser, req: Request, res: Response): Promise<void> {
    const { token, maxAgeSeconds } = await this.sessions.issue(user.id, {
      userAgent: req.headers['user-agent'] ?? null,
      ip: req.ip ?? null,
    });
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions(maxAgeSeconds));
  }
}
