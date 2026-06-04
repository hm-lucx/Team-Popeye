import { buildApp } from '../src/app.js';
import { runMaintenanceSweep } from '../src/modules/maintenance/service.js';

const app = await buildApp();

try {
  const result = await runMaintenanceSweep(app);
  console.log(JSON.stringify(result, null, 2));
} finally {
  await app.close();
}
