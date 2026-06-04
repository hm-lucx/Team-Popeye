import type { FastifyPluginAsync } from 'fastify';

import { createRateLimitGuard } from '../../lib/rate-limit.js';
import {
  attemptMatch,
  getMatch,
  getMatches,
  respondToExistingMatch,
} from './service.js';
import {
  attemptMatchBodySchema,
  listMatchesQuerySchema,
  matchListSchema,
  matchParamsSchema,
  matchResponseEnvelopeSchema,
  respondToMatchBodySchema,
} from './schemas.js';

type ListMatchesQuery = {
  status?:
    | 'pending'
    | 'accepted'
    | 'declined'
    | 'expired'
    | 'completed'
    | 'cancelled'
    | 'missed'
    | undefined;
  localDay?: string | undefined;
};

type MatchParams = {
  matchId: string;
};

type RespondToMatchBody = {
  response: 'accept' | 'decline';
};

type AttemptMatchBody = {
  localDay: string;
  expiresInMinutes?: number | undefined;
};

const matchAttemptRateLimit = createRateLimitGuard({
  key: 'matches.attempt',
  limit: 60,
  windowMs: 60 * 60 * 1000,
  scope: 'user_or_ip',
});

export const matchRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Querystring: ListMatchesQuery }>(
    '/',
    {
      preHandler: fastify.authenticate,
      schema: {
        querystring: listMatchesQuerySchema,
        response: {
          200: matchListSchema,
        },
      },
    },
    async (request) => getMatches(fastify, request.user.sub, request.query),
  );

  fastify.get<{ Params: MatchParams }>(
    '/:matchId',
    {
      preHandler: fastify.authenticate,
      schema: {
        params: matchParamsSchema,
        response: {
          200: matchResponseEnvelopeSchema,
        },
      },
    },
    async (request) => getMatch(fastify, request.user.sub, request.params.matchId),
  );

  fastify.post<{ Body: AttemptMatchBody }>(
    '/attempt',
    {
      preHandler: [fastify.authenticate, matchAttemptRateLimit],
      schema: {
        body: attemptMatchBodySchema,
        response: {
          200: matchResponseEnvelopeSchema,
        },
      },
    },
    async (request) => attemptMatch(fastify, request.user.sub, request.body),
  );

  fastify.post<{ Params: MatchParams; Body: RespondToMatchBody }>(
    '/:matchId/respond',
    {
      preHandler: fastify.authenticate,
      schema: {
        params: matchParamsSchema,
        body: respondToMatchBodySchema,
        response: {
          200: matchResponseEnvelopeSchema,
        },
      },
    },
    async (request) =>
      respondToExistingMatch(fastify, request.user.sub, {
        matchId: request.params.matchId,
        response: request.body.response,
      }),
  );
};
