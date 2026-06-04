import type { FastifyInstance } from 'fastify';

import { env } from '../../config/env.js';
import { runMaintenanceSweep } from './service.js';

export function startMaintenanceScheduler(fastify: FastifyInstance): () => void {
  if (!env.enableScheduledJobs) {
    return () => undefined;
  }

  let running = false;

  const timer = setInterval(async () => {
    if (running) {
      return;
    }

    running = true;

    try {
      await runMaintenanceSweep(fastify);
    } catch (error) {
      fastify.log.error(
        {
          event: 'maintenance.sweep_failed',
          err: error,
        },
        'Maintenance sweep failed.',
      );
    } finally {
      running = false;
    }
  }, env.maintenanceSweepSeconds * 1000);

  timer.unref();

  return () => clearInterval(timer);
}
