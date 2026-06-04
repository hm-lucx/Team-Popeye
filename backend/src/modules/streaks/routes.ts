import type { FastifyPluginAsync } from 'fastify';

import { getMyStreakSummary } from './service.js';
import { streakQuerySchema, streakSummarySchema } from './schemas.js';

type StreakQuery = {
  localDay?: string | undefined;
};

export const streakRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Querystring: StreakQuery }>(
    '/me',
    {
      preHandler: fastify.authenticate,
      schema: {
        querystring: streakQuerySchema,
        response: {
          200: streakSummarySchema,
        },
      },
    },
    async (request) => getMyStreakSummary(fastify, request.user.sub, request.query),
  );
};
