import cors from '@fastify/cors';
import Fastify from 'fastify';

import { env } from './config/env.js';
import { availabilityRoutes } from './modules/availability/routes.js';
import { authRoutes } from './modules/auth/routes.js';
import { callRoutes } from './modules/calls/routes.js';
import { healthRoutes } from './modules/health/routes.js';
import { matchRoutes } from './modules/matches/routes.js';
import { socialRoutes } from './modules/social/routes.js';
import { authPlugin } from './plugins/auth.js';
import { callProviderPlugin } from './plugins/call-provider.js';
import { dbPlugin } from './plugins/db.js';
import { errorHandlerPlugin } from './plugins/error-handler.js';
import { realtimePlugin } from './plugins/realtime.js';

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: env.corsOrigin.split(',').map((value) => value.trim()),
    credentials: true,
  });

  await app.register(errorHandlerPlugin);
  await app.register(dbPlugin);
  await app.register(authPlugin);
  await app.register(callProviderPlugin);
  await app.register(realtimePlugin);

  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(socialRoutes, { prefix: '/social' });
  await app.register(availabilityRoutes, { prefix: '/availability' });
  await app.register(matchRoutes, { prefix: '/matches' });
  await app.register(callRoutes, { prefix: '/calls' });

  return app;
}
