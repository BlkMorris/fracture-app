import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../auth/entities/user.entity';

export const ROLES_KEY = 'roles';

/**
 * Restrict access to users with specific roles.
 * Must be used with RolesGuard.
 *
 * @example @Roles(UserRole.ADMIN, UserRole.ANALYST)
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
