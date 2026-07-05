import type { EmailMessage } from './email.service';

// Replace control characters (including CR/LF) in user-supplied text with spaces
// before it goes into any email body, so a crafted name can't inject extra lines.
// Collapse runs of whitespace and trim. Applied to both the text and (pre-escape)
// HTML. Implemented by code point so the source carries no control-char literal.
function sanitizeName(value: string): string {
  let out = '';
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    out += code < 0x20 || code === 0x7f ? ' ' : ch;
  }
  return out.replace(/\s+/g, ' ').trim();
}

// Escape user-supplied text before it goes into the HTML body. The link is
// server-built with an encoded token, so it is safe in href.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function shell(bodyHtml: string): string {
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#2b2b2b;line-height:1.6">${bodyHtml}</div>`;
}

// English copy for now; the deep link carries the recipient's locale so the app
// UI opens in their language. Localized bodies are a straightforward follow-up.
export function verificationEmail(to: string, name: string, link: string): EmailMessage {
  const displayName = sanitizeName(name);
  const subject = 'Verify your email — BD Property Hub';
  const text = `Hi ${displayName},

Confirm your email address to finish setting up your BD Property Hub account:
${link}

This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.`;
  const html = shell(
    `<p>Hi ${escapeHtml(displayName)},</p>
<p>Confirm your email address to finish setting up your BD Property Hub account.</p>
<p><a href="${link}" style="display:inline-block;background:#bc6b49;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Verify email</a></p>
<p style="color:#6b6b6b;font-size:14px">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>`,
  );
  return { to, subject, html, text };
}

export function passwordResetEmail(to: string, name: string, link: string): EmailMessage {
  const displayName = sanitizeName(name);
  const subject = 'Reset your password — BD Property Hub';
  const text = `Hi ${displayName},

We received a request to reset your BD Property Hub password. Choose a new one here:
${link}

This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't change.`;
  const html = shell(
    `<p>Hi ${escapeHtml(displayName)},</p>
<p>We received a request to reset your BD Property Hub password. Choose a new one below.</p>
<p><a href="${link}" style="display:inline-block;background:#bc6b49;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Reset password</a></p>
<p style="color:#6b6b6b;font-size:14px">This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't change.</p>`,
  );
  return { to, subject, html, text };
}
