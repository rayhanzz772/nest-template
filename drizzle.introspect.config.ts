// Konfigurasi terpisah khusus untuk `npm run db:introspect`.
//
// Alasannya: `drizzle-kit introspect` menulis hasilnya ke folder `out`.
// Kalau memakai drizzle.config.ts, hasilnya akan tertulis ke `./drizzle`
// dan mengotori folder migrasi. File ini mengarahkan output ke `./.temp`
// yang sudah di-ignore oleh git.
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema/index.ts',
  out: './.temp/introspect',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
