import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';

interface JournalEntry {
  idx: number;
  tag: string;
  when: number;
}

async function showStatus() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL belum diatur di file .env!');
  }

  const target = new URL(connectionString);
  console.log(
    `🗄️  [Status] ${target.hostname}:${target.port}${target.pathname}\n`,
  );

  const pool = new Pool({ connectionString });

  try {
    const journal = JSON.parse(
      readFileSync('drizzle/meta/_journal.json', 'utf8'),
    ) as { entries: JournalEntry[] };
    const entries = [...journal.entries].sort((a, b) => a.when - b.when);

    let appliedRows: Array<{ created_at: string }> = [];
    try {
      const res = await pool.query(
        'SELECT created_at FROM drizzle.__drizzle_migrations ORDER BY created_at',
      );
      appliedRows = res.rows as Array<{ created_at: string }>;
    } catch {
      console.log(
        '⚠️  Tabel drizzle.__drizzle_migrations belum ada (migrasi belum pernah dijalankan).\n',
      );
    }

    const lastApplied = appliedRows.length
      ? Math.max(...appliedRows.map((row) => Number(row.created_at)))
      : 0;

    const migrationRows = entries.map((entry, index) => ({
      order: index + 1,
      tag: entry.tag,
      status: entry.when <= lastApplied ? 'applied' : 'pending',
    }));
    const pendingCount = migrationRows.filter(
      (r) => r.status === 'pending',
    ).length;

    console.log('— Migrations —');
    console.table(migrationRows);

    const tableRes = await pool.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
    );
    const tableRows: Array<{ table: string; rows: number }> = [];
    for (const row of tableRes.rows as Array<{ tablename: string }>) {
      const count = await pool.query(
        `SELECT count(*)::int AS total FROM public."${row.tablename}"`,
      );
      tableRows.push({ table: row.tablename, rows: count.rows[0].total });
    }

    console.log('\n— Tables —');
    console.table(tableRows);

    const indexRes = await pool.query(
      `SELECT tablename AS "table", indexname AS "index", indexdef AS "definition"
       FROM pg_indexes
       WHERE schemaname = 'public' AND indexdef ILIKE '% WHERE %'
       ORDER BY tablename, indexname`,
    );

    console.log('\n— Partial indexes (yang punya WHERE) —');
    if (indexRes.rows.length === 0) {
      console.log('(tidak ada)');
    } else {
      console.table(indexRes.rows);
    }

    const ok = pendingCount === 0;
    console.log(
      `\n${ok ? '✅' : '⚠️ '} Migrasi: ${entries.length - pendingCount}/${entries.length} applied, ` +
        `${pendingCount} pending • ${tableRows.length} tabel • ${indexRes.rows.length} partial index`,
    );
    if (!ok) {
      console.log(
        '👉 Jalankan `npm run db:migrate` — atau `npm run db:fresh` kalau DB-nya tidak sinkron.',
      );
    }
  } catch (error) {
    console.error('💥 [Status] Gagal membaca status database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

void showStatus();
