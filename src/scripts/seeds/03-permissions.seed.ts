import type { Database } from '../../database/database.types.js';
import * as schema from '../../database/schema/permission.schema.js';

export async function seedPermissions(db: Database): Promise<void> {
  console.log('  ⏳ Menanam data permissions...');

  const permissionsData: Array<typeof schema.permissions.$inferInsert> = [
    {
      name: 'Create User',
      code: 'users:create',
      description: 'Allow creating new users',
    },
    {
      name: 'Read User',
      code: 'users:read',
      description: 'Allow viewing users list and details',
    },
    {
      name: 'Update User',
      code: 'users:update',
      description: 'Allow updating existing users',
    },
    {
      name: 'Delete User',
      code: 'users:delete',
      description: 'Allow deleting users',
    },
    {
      name: 'Create Role',
      code: 'roles:create',
      description: 'Allow creating new roles',
    },
    {
      name: 'Read Role',
      code: 'roles:read',
      description: 'Allow viewing roles list and details',
    },
    {
      name: 'Update Role',
      code: 'roles:update',
      description: 'Allow updating existing roles',
    },
    {
      name: 'Delete Role',
      code: 'roles:delete',
      description: 'Allow deleting roles',
    },
    {
      name: 'Read Permission',
      code: 'permissions:read',
      description: 'Allow viewing permissions list and details',
    },
    {
      name: 'Assign Role Permission',
      code: 'permissions:assign',
      description: 'Allow assigning permissions to roles',
    },
  ];

  await db
    .insert(schema.permissions)
    .values(permissionsData)
    .onConflictDoNothing();

  console.log(`  ✅ Permissions selesai ditanam (${permissionsData.length} permissions)!`);
}
