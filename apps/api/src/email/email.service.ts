import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

const DEFAULT_FROM = 'BD Property Hub <no-reply@bdpropertyhub.test>';

/**
 * Transactional email via Resend's REST API (no SDK — a single signed fetch, in
 * keeping with the Cloudinary layer). When RESEND_API_KEY is absent the behavior
 * depends on environment:
 *   - dev/test: log the message (incl. link) so flows can be exercised locally;
 *   - production: log an error and drop it — never write the token-bearing link
 *     to logs where it isn't the intended recipient.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string | undefined;
  private readonly from: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('RESEND_API_KEY') || undefined;
    this.from = config.get<string>('EMAIL_FROM') || DEFAULT_FROM;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async send(message: EmailMessage): Promise<void> {
    if (!this.apiKey) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.error(
          `Email not configured (RESEND_API_KEY missing) — dropped "${message.subject}" to ${message.to}`,
        );
      } else {
        this.logger.warn(
          `[email:dev] to=${message.to} subject="${message.subject}"\n${message.text}`,
        );
      }
      return;
    }

    let response: Response;
    try {
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: message.to,
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`Email send failed: ${detail}`);
    }

    if (!response.ok) {
      throw new Error(`Email send failed with status ${response.status}`);
    }
  }
}
