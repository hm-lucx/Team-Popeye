import type { FastifyPluginAsync } from 'fastify';

import { createRateLimitGuard } from '../../lib/rate-limit.js';
import {
  cancelFriendRequest,
  getFriendRequests,
  getFriends,
  respondToFriendRequest,
  sendFriendRequest,
} from './service.js';
import {
  createFriendRequestBodySchema,
  friendListSchema,
  friendRequestIndexSchema,
  friendRequestMutationResponseSchema,
  friendRequestParamsSchema,
  respondToFriendRequestBodySchema,
} from './schemas.js';

type CreateFriendRequestBody = {
  inviteCode: string;
  message?: string;
};

type FriendRequestParams = {
  requestId: string;
};

type RespondToFriendRequestBody = {
  action: 'accept' | 'decline';
};

const friendRequestWriteRateLimit = createRateLimitGuard({
  key: 'social.friend-request.write',
  limit: 30,
  windowMs: 60 * 60 * 1000,
  scope: 'user_or_ip',
});

export const socialRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/friend-requests',
    {
      preHandler: fastify.authenticate,
      schema: {
        response: {
          200: friendRequestIndexSchema,
        },
      },
    },
    async (request) => getFriendRequests(fastify, request.user.sub),
  );

  fastify.get(
    '/friends',
    {
      preHandler: fastify.authenticate,
      schema: {
        response: {
          200: friendListSchema,
        },
      },
    },
    async (request) => getFriends(fastify, request.user.sub),
  );

  fastify.post<{ Body: CreateFriendRequestBody }>(
    '/friend-requests',
    {
      preHandler: [fastify.authenticate, friendRequestWriteRateLimit],
      schema: {
        body: createFriendRequestBodySchema,
        response: {
          201: friendRequestMutationResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const result = await sendFriendRequest(fastify, request.user.sub, request.body);
      return reply.code(201).send(result);
    },
  );

  fastify.post<{ Params: FriendRequestParams; Body: RespondToFriendRequestBody }>(
    '/friend-requests/:requestId/respond',
    {
      preHandler: [fastify.authenticate, friendRequestWriteRateLimit],
      schema: {
        params: friendRequestParamsSchema,
        body: respondToFriendRequestBodySchema,
        response: {
          200: friendRequestMutationResponseSchema,
        },
      },
    },
    async (request) =>
      respondToFriendRequest(fastify, request.user.sub, {
        requestId: request.params.requestId,
        action: request.body.action,
      }),
  );

  fastify.post<{ Params: FriendRequestParams }>(
    '/friend-requests/:requestId/cancel',
    {
      preHandler: [fastify.authenticate, friendRequestWriteRateLimit],
      schema: {
        params: friendRequestParamsSchema,
        response: {
          200: friendRequestMutationResponseSchema,
        },
      },
    },
    async (request) =>
      cancelFriendRequest(fastify, request.user.sub, request.params.requestId),
  );
};
