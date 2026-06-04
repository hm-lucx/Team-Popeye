import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdir } from 'node:fs/promises';
import { Pool } from 'pg';

import { env } from '../src/config/env.js';

const currentDir = fileURLToPath(new URL('.', import.meta.url));
const migrationsDir = join(currentDir, '../db/migrations');

async function main() {
  const pool = new Pool({
    connectionString: env.databaseUrl,
  });

  try {
    await pool.query(`
      create table if not exists public.schema_migrations (
        id text primary key,
        applied_at timestamptz not null default timezone('utc', now())
      )
    `);

    const files = (await readdir(migrationsDir))
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const migrationId = basename(file);
      const alreadyApplied = await pool.query(
        'select 1 from public.schema_migrations where id = $1',
        [migrationId],
      );

      if (alreadyApplied.rowCount) {
        continue;
      }

      const sql = await readFile(join(migrationsDir, file), 'utf8');
      const client = await pool.connect();

      try {
        await client.query('begin');
        await client.query(sql);
        await client.query(
          'insert into public.schema_migrations (id) values ($1)',
          [migrationId],
        );
        await client.query('commit');
        console.log(`applied ${migrationId}`);
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
