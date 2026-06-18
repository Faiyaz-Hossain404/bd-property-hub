import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { PublicUser } from '@bdph/types';

/** Injects the user attached by SessionAuthGuard. Use only on guarded routes. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): PublicUser => {
    return context.switchToHttp().getRequest<{ user: PublicUser }>().user;
  },
);
