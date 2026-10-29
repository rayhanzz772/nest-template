import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { and, eq, isNull } from 'drizzle-orm';
import type { Request } from 'express';
import { DRIZZLE } from '../../database/database.module.js';
import type { Database } from '../../database/database.types.js';
import { users } from '../../database/schema/user.schema.js';
import { rolePermissions } from '../../database/schema/role-permission.schema.js';
import { permissions } from '../../database/schema/permission.schema.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';

interface AuthenticatedRequest extends Request {
  user?: { sub?: string };
}

/**
 * Resolves the authenticated user's permissions from the database and enforces
 * the codes declared with {@link RequirePermissions}.
 *
 * Runs after {@link AuthGuard} so that `request.user` has already been populated
 * from the verified JWT payload. Routes without `@RequirePermissions` metadata
 * are left untouched, which keeps public and self-service routes working.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(DRIZZLE) private readonly db: Database,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.sub;

    if (!userId) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const grantedPermissions = await this.db
      .select({ code: permissions.code })
      .from(users)
      .innerJoin(rolePermissions, eq(rolePermissions.roleId, users.roleId))
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(and(eq(users.id, userId), isNull(users.deletedAt)));

    const granted = new Set(grantedPermissions.map((item) => item.code));
    const missing = requiredPermissions.filter((code) => !granted.has(code));

    if (missing.length > 0) {
      throw new ForbiddenException(
        `Missing required permission(s): ${missing.join(', ')}`,
      );
    }

    return true;
  }
}
