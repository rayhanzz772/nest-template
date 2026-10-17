
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

export type Database = ReturnType<
  typeof drizzle<typeof schema>
>;
