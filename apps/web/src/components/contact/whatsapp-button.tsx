import type { ComponentProps } from 'react';
import { MessageCircle } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { whatsappUrl } from '@/lib/contact';

type WhatsAppButtonProps = {
  number: string;
  label: string;
  message?: string;
  variant?: ComponentProps<typeof Button>['variant'];
  size?: ComponentProps<typeof Button>['size'];
  className?: string;
};

// A Button-styled link that opens a WhatsApp chat with a support number (and an
// optional pre-filled message) in a new tab. The number and message come from
// lib/contact.ts / translations — nothing user-supplied reaches the URL — and
// the new tab is opened with rel="noopener noreferrer" so the WhatsApp page can
// never reach back into the app via window.opener.
export function WhatsAppButton({
  number,
  label,
  message,
  variant = 'default',
  size,
  className,
}: WhatsAppButtonProps) {
  return (
    <Button asChild variant={variant} size={size} className={cn('w-fit', className)}>
      <a href={whatsappUrl(number, message)} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="size-4" />
        {label}
      </a>
    </Button>
  );
}
