import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extract the authenticated user from the request.
 *
 * @example
 *   @Get('profile')
 *   getProfile(@CurrentUser() user: User) { ... }
 *
 *   @Get('id')
 *   getId(@CurrentUser('id') id: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (data) {
      return user?.[data];
    }

    return user;
  },
);
