import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

async function resetDatabase() {
  console.log(
    '🧨 [Reset] Menghapus schema public lalu menerapkan ulang semua migrasi...\n',
  );

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'db:reset tidak boleh dijalankan di environment production!',
    );
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL belum diatur di file .env!');
  }

  const pool = new Pool({ connectionString });

  try {
    await pool.query('DROP SCHEMA IF EXISTS public CASCADE');
    await pool.query('CREATE SCHEMA public');
    console.log('✅ [Reset] Schema public berhasil dikosongkan.');

    await migrate(drizzle({ client: pool }), {
      migrationsFolder: './drizzle',
    });
    console.log('✅ [Reset] Semua migrasi di ./drizzle selesai diterapkan.');
    console.log(
      '\n👉 Lanjutkan dengan `npm run db:seed` untuk mengisi data awal.',
    );
  } catch (error) {
    console.error('💥 [Reset] Gagal mereset database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

void resetDatabase();
