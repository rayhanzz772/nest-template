import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { seed } from 'drizzle-seed';
import { Pool } from 'pg';
import * as schema from './schema.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

async function main() {
  await seed(db, schema).refine((f) => ({
    users: {
      count: 10,
    },
  }));

  console.log('✅ 10 users has been generated!');
  await pool.end();
}

main();
