
import { createId } from '@paralleldrive/cuid2';
import {
    pgTable,
    varchar,
    text,
    timestamp,
    uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { roles } from './role.schema.js';

export const users = pgTable('users', {
    id: text('id')
        .primaryKey()
        .$defaultFn(() => createId()),
    roleId: text('role_id')
        .notNull()
        .references(() => roles.id, {
            onDelete: 'restrict',
            onUpdate: 'cascade'
        }),
    name: varchar('name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    password: varchar('password', { length: 255 }).notNull(),
    createdAt: timestamp('created_at')
        .defaultNow()
        .notNull(),
    updatedAt: timestamp('updated_at')
        .defaultNow()
        .$onUpdateFn(() => new Date())
        .notNull(),
    deletedAt: timestamp('deleted_at')
}, (table) => [
    uniqueIndex('users_email_active_idx')
        .on(table.email)
        .where(sql`${table.deletedAt} is null`),
]);
