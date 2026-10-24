import type { Database } from '../../database/database.types.js';
import { roles } from '../../database/schema/role.schema.js';
import { permissions } from '../../database/schema/permission.schema.js';
import { rolePermissions } from '../../database/schema/role-permission.schema.js';
import { eq, inArray } from 'drizzle-orm';

export async function seedRolePermissions(db: Database): Promise<void> {
  console.log('  ⏳ Menanam data role_permissions...');

  const adminRole = (await db.select().from(roles).where(eq(roles.code, 'ADMIN')).limit(1))[0];
  const userRole = (await db.select().from(roles).where(eq(roles.code, 'USER')).limit(1))[0];

  if (!adminRole || !userRole) {
    throw new Error('Role ADMIN atau USER tidak ditemukan. Pastikan seeder roles sudah dijalankan.');
  }

  const allPermissions = await db.select().from(permissions);
  if (allPermissions.length === 0) {
    throw new Error('Permissions belum ditanam. Pastikan seeder permissions sudah dijalankan.');
  }

  const rolePermissionsData: Array<typeof rolePermissions.$inferInsert> = [];

  // Admin gets all permissions
  for (const perm of allPermissions) {
    rolePermissionsData.push({
      roleId: adminRole.id,
      permissionId: perm.id,
    });
  }

  // User gets read permissions only
  const userPermCodes = ['users:read', 'roles:read', 'permissions:read'];
  const userPermissions = await db
    .select()
    .from(permissions)
    .where(inArray(permissions.code, userPermCodes));

  for (const perm of userPermissions) {
    rolePermissionsData.push({
      roleId: userRole.id,
      permissionId: perm.id,
    });
  }

  await db
    .insert(rolePermissions)
    .values(rolePermissionsData)
    .onConflictDoNothing();

  console.log(`  ✅ Role permissions selesai ditanam (${rolePermissionsData.length} records)!`);
}
