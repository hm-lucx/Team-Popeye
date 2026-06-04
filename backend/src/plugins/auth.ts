import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import fp from 'fastify-plugin';

import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';

export const authPlugin = fp(async (fastify) => {
  await fastify.register(cookie);
  await fastify.register(jwt, {
    secret: env.jwtAccessSecret,
    sign: {
      iss: env.jwtIssuer,
      aud: env.jwtAudience,
      expiresIn: `${env.accessTokenTtlMinutes}m`,
    },
    verify: {
      allowedIss: env.jwtIssuer,
      allowedAud: env.jwtAudience,
    },
  });

  fastify.decorate('authenticate', async (request, _reply) => {
    try {
      await request.jwtVerify();
    } catch {
      throw new AppError(401, 'unauthorized', 'Authentication required.');
    }
  });
});
