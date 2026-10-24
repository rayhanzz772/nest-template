import { createId } from '@paralleldrive/cuid2';
import {
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { roles } from './role.schema.js';
import { permissions } from './permission.schema.js';

export const rolePermissions = pgTable(
  'role_permissions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    roleId: text('role_id')
      .notNull()
      .references(() => roles.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    permissionId: text('permission_id')
      .notNull()
      .references(() => permissions.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    createdAt: timestamp('created_at')
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('role_permission_unique').on(table.roleId, table.permissionId),
  ],
);

export const rolePermission = rolePermissions;
