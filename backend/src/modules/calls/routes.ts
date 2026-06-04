import type { FastifyPluginAsync } from 'fastify';

import { createRateLimitGuard } from '../../lib/rate-limit.js';
import {
  getCallSessionForMatch,
  handleCallEvent,
  joinCallForMatch,
} from './service.js';
import {
  callEventBodySchema,
  callJoinEnvelopeSchema,
  callSessionEnvelopeSchema,
  callSessionParamsSchema,
  matchParamsSchema,
} from './schemas.js';

type MatchParams = {
  matchId: string;
};

type CallSessionParams = {
  callSessionId: string;
};

type CallEventBody = {
  event: 'joined' | 'left';
};

const callJoinRateLimit = createRateLimitGuard({
  key: 'calls.join',
  limit: 20,
  windowMs: 10 * 60 * 1000,
  scope: 'user_or_ip',
});

export const callRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Params: MatchParams }>(
    '/matches/:matchId',
    {
      preHandler: fastify.authenticate,
      schema: {
        params: matchParamsSchema,
        response: {
          200: callSessionEnvelopeSchema,
        },
      },
    },
    async (request) => getCallSessionForMatch(fastify, request.user.sub, request.params.matchId),
  );

  fastify.post<{ Params: MatchParams }>(
    '/matches/:matchId/join',
    {
      preHandler: [fastify.authenticate, callJoinRateLimit],
      schema: {
        params: matchParamsSchema,
        response: {
          200: callJoinEnvelopeSchema,
        },
      },
    },
    async (request) => joinCallForMatch(fastify, request.user.sub, request.params.matchId),
  );

  fastify.post<{ Params: CallSessionParams; Body: CallEventBody }>(
    '/sessions/:callSessionId/events',
    {
      preHandler: fastify.authenticate,
      schema: {
        params: callSessionParamsSchema,
        body: callEventBodySchema,
        response: {
          200: callSessionEnvelopeSchema,
        },
      },
    },
    async (request) =>
      handleCallEvent(fastify, request.user.sub, {
        callSessionId: request.params.callSessionId,
        event: request.body.event,
      }),
  );
};
