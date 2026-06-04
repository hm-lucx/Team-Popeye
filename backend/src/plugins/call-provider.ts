import fp from 'fastify-plugin';

import { env } from '../config/env.js';
import { DailyCallProvider } from '../modules/calls/providers/daily-provider.js';
import { MockCallProvider } from '../modules/calls/providers/mock-provider.js';
import type { CallProvider } from '../modules/calls/provider.js';

function buildCallProvider(): CallProvider {
  if (env.callProvider === 'daily') {
    return new DailyCallProvider(env.dailyApiKey, env.dailyApiUrl);
  }

  return new MockCallProvider();
}

export const callProviderPlugin = fp(async (fastify) => {
  fastify.decorate('callProvider', buildCallProvider());
});
