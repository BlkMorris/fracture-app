import { Injectable, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CanActivate } from '@nestjs/common';
import { UserRole } from '../../auth/entities/user.entity';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

export const ROLES_KEY = 'roles';

/**
 * Guard that checks whether the authenticated user's role is
 * included in the allowed list set by @Roles(...).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // If the route is marked @Public(), skip role checking
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No roles required → allow
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('No authenticated user');
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Role "${user.role}" is not authorized. Required: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
