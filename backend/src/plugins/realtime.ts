import { randomUUID } from 'node:crypto';
import type { ServerResponse } from 'node:http';

import fp from 'fastify-plugin';

import { env } from '../config/env.js';

type Connection = {
  raw: ServerResponse;
  heartbeat: NodeJS.Timeout;
};

export type EventEnvelope = {
  type: string;
  data: unknown;
  emittedAt: string;
};

function writeEvent(raw: ServerResponse, event: EventEnvelope) {
  raw.write(`event: ${event.type}\n`);
  raw.write(`data: ${JSON.stringify(event)}\n\n`);
}

export const realtimePlugin = fp(async (fastify) => {
  const connectionsByUser = new Map<string, Map<string, Connection>>();

  fastify.decorate('publishUserEvent', (userId: string, event: EventEnvelope) => {
    const userConnections = connectionsByUser.get(userId);

    if (!userConnections) {
      return;
    }

    for (const connection of userConnections.values()) {
      writeEvent(connection.raw, event);
    }
  });

  fastify.get(
    '/realtime/stream',
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const userId = request.user.sub;
      const connectionId = randomUUID();

      reply.hijack();
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      });

      const heartbeat = setInterval(() => {
        if (!reply.raw.writableEnded) {
          reply.raw.write(': ping\n\n');
        }
      }, env.sseHeartbeatSeconds * 1000);

      const userConnections = connectionsByUser.get(userId) ?? new Map<string, Connection>();
      userConnections.set(connectionId, { raw: reply.raw, heartbeat });
      connectionsByUser.set(userId, userConnections);

      writeEvent(reply.raw, {
        type: 'ready',
        data: { connectionId },
        emittedAt: new Date().toISOString(),
      });

      request.raw.on('close', () => {
        clearInterval(heartbeat);

        const existingConnections = connectionsByUser.get(userId);
        existingConnections?.delete(connectionId);

        if (existingConnections && existingConnections.size === 0) {
          connectionsByUser.delete(userId);
        }
      });
    },
  );
});
