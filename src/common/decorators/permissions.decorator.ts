import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Declares the permissions required to access a route or controller.
 * The {@link PermissionsGuard} resolves the permission codes owned by the
 * authenticated user's role and rejects the request when any code is missing.
 *
 * @example
 * ```ts
 * @RequirePermissions('users:create')
 * @Post()
 * create(@Body() body: CreateUserDto) {}
 * ```
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
