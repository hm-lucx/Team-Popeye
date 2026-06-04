import type { FastifyPluginAsync } from 'fastify';

import { AppError } from '../../lib/errors.js';
import {
  applySessionToReply,
  clearRefreshCookie,
  getCurrentUser,
  login,
  logout,
  REFRESH_TOKEN_COOKIE_NAME,
  refreshSession,
  signup,
} from './service.js';
import {
  loginBodySchema,
  publicUserSchema,
  sessionResponseSchema,
  signupBodySchema,
} from './schemas.js';

type SignupBody = {
  email: string;
  password: string;
  displayName: string;
  timezone: string;
};

type LoginBody = {
  email: string;
  password: string;
};

function requestMetadata(request: {
  headers: Record<string, unknown>;
  ip: string;
}) {
  return {
    userAgent:
      typeof request.headers['user-agent'] === 'string'
        ? request.headers['user-agent']
        : null,
    ipAddress: request.ip,
  };
}

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: SignupBody }>(
    '/signup',
    {
      schema: {
        body: signupBodySchema,
        response: {
          201: sessionResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const session = await signup(
        fastify,
        request.body,
        requestMetadata(request),
      );

      return reply.code(201).send(applySessionToReply(reply, session));
    },
  );

  fastify.post<{ Body: LoginBody }>(
    '/login',
    {
      schema: {
        body: loginBodySchema,
        response: {
          200: sessionResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const session = await login(
        fastify,
        request.body,
        requestMetadata(request),
      );

      return reply.send(applySessionToReply(reply, session));
    },
  );

  fastify.post(
    '/refresh',
    {
      schema: {
        response: {
          200: sessionResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const refreshToken = request.cookies[REFRESH_TOKEN_COOKIE_NAME];

      if (!refreshToken) {
        throw new AppError(401, 'missing_refresh_token', 'Refresh token cookie is missing.');
      }

      const session = await refreshSession(
        fastify,
        refreshToken,
        requestMetadata(request),
      );

      return reply.send(applySessionToReply(reply, session));
    },
  );

  fastify.get(
    '/me',
    {
      preHandler: fastify.authenticate,
      schema: {
        response: {
          200: publicUserSchema,
        },
      },
    },
    async (request) => getCurrentUser(fastify, request.user.sub),
  );

  fastify.post('/logout', async (request, reply) => {
    const refreshToken = request.cookies[REFRESH_TOKEN_COOKIE_NAME];
    await logout(fastify, refreshToken);
    clearRefreshCookie(reply);
    return reply.code(204).send();
  });
};
