import type { FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => {
    const result = await fastify.db.query(
      "select timezone('utc', now()) as now_utc, current_database() as database_name",
    );

    return {
      ok: true,
      service: 'catchup-backend',
      database: result.rows[0]?.database_name ?? null,
      nowUtc: result.rows[0]?.now_utc ?? null,
    };
  });
};
