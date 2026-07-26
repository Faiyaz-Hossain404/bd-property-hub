// Public contact + support channels for BD Property Hub. These are intentionally
// client-visible — they render as mailto:/wa.me links — so they are NOT secrets.
// Kept in one place so the footer and the WhatsApp buttons can never drift.

export const CONTACT_EMAIL = 'shafiarifbd@yahoo.com';

// WhatsApp support desks. Stored as digits only (no leading '+') because that is
// the shape wa.me deep links expect. whatsappUrl() re-strips defensively anyway.
export const WHATSAPP_SELLER_SUPPORT = '8801634346934';
export const WHATSAPP_BUYER_SUPPORT = '8801634346936';

// Build a https://wa.me/<number> deep link, optionally pre-filling the chat with
// `message`. The number is reduced to digits (wa.me rejects '+'/spaces) and the
// message is percent-encoded, so a message containing spaces or a listing title
// with punctuation is always a valid URL.
export function whatsappUrl(number: string, message?: string): string {
  const digits = number.replace(/\D/g, '');
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
