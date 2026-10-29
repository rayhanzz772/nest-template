import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '../../database/database.types.js';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { PermissionsGuard } from './permissions.guard.js';

function createContext(user?: { sub?: string }): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class TestController {},
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let requiredPermissions: string[] | undefined;
  let isPublic: boolean;
  let grantedPermissions: Array<{ code: string }>;

  const mockReflector = {
    getAllAndOverride: vi.fn((key: string) => {
      if (key === PERMISSIONS_KEY) {
        return requiredPermissions;
      }
      if (key === IS_PUBLIC_KEY) {
        return isPublic;
      }
      return undefined;
    }),
  };

  const mockDb = {
    select: vi.fn(),
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    requiredPermissions = undefined;
    isPublic = false;
    grantedPermissions = [];

    mockDb.select.mockReturnValue(mockDb);
    mockDb.from.mockReturnValue(mockDb);
    mockDb.innerJoin.mockReturnValue(mockDb);
    mockDb.where.mockImplementation(async () => grantedPermissions);

    guard = new PermissionsGuard(
      mockReflector as unknown as Reflector,
      mockDb as unknown as Database,
    );
  });

  it('allows the request when no permissions are required', async () => {
    const result = await guard.canActivate(createContext({ sub: 'user-1' }));

    expect(result).toBe(true);
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it('allows a public route even when permissions are declared', async () => {
    requiredPermissions = ['users:read'];
    isPublic = true;

    const result = await guard.canActivate(createContext());

    expect(result).toBe(true);
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it('allows the request when the user owns every required permission', async () => {
    requiredPermissions = ['users:read', 'users:create'];
    grantedPermissions = [{ code: 'users:read' }, { code: 'users:create' }];

    const result = await guard.canActivate(createContext({ sub: 'admin-1' }));

    expect(result).toBe(true);
  });

  it('rejects the request when a required permission is missing', async () => {
    requiredPermissions = ['users:delete'];
    grantedPermissions = [{ code: 'users:read' }];

    await expect(
      guard.canActivate(createContext({ sub: 'user-1' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects the request when the user is not authenticated', async () => {
    requiredPermissions = ['users:read'];

    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(mockDb.select).not.toHaveBeenCalled();
  });
});
