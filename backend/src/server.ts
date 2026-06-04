import { buildApp } from './app.js';
import { env } from './config/env.js';
import { startMaintenanceScheduler } from './modules/maintenance/scheduler.js';

const app = await buildApp();
const stopMaintenanceScheduler = startMaintenanceScheduler(app);

try {
  await app.listen({
    host: env.host,
    port: env.port,
  });
} catch (error) {
  stopMaintenanceScheduler();
  app.log.error(error);
  process.exit(1);
}
