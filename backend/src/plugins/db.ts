import fp from 'fastify-plugin';
import { Pool } from 'pg';

import { env } from '../config/env.js';

export const dbPlugin = fp(async (fastify) => {
  const pool = new Pool({
    connectionString: env.databaseUrl,
  });

  await pool.query('select 1');

  fastify.decorate('db', pool);

  fastify.addHook('onClose', async () => {
    await pool.end();
  });
});
