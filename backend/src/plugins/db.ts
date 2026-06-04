import fp from 'fastify-plugin';
import { Pool } from 'pg';

import { env } from '../config/env.js';

function resolveDatabaseSsl() {
  if (env.databaseSslMode === 'disable') {
    return false;
  }

  if (env.databaseSslMode === 'require') {
    return {
      rejectUnauthorized: true,
    };
  }

  return {
    rejectUnauthorized: false,
  };
}

export const dbPlugin = fp(async (fastify) => {
  const pool = new Pool({
    connectionString: env.databaseUrl,
    ssl: resolveDatabaseSsl(),
  });

  await pool.query('select 1');

  fastify.decorate('db', pool);

  fastify.addHook('onClose', async () => {
    await pool.end();
  });
});
