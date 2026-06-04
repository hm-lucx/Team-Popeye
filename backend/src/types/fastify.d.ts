import 'fastify';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';

import type { CallProvider } from '../modules/calls/provider.js';
import type { EventEnvelope } from '../plugins/realtime.js';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string;
      email: string;
    };
    user: {
      sub: string;
      email: string;
    };
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    db: Pool;
    callProvider: CallProvider;
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    publishUserEvent(userId: string, event: EventEnvelope): void;
  }
}
