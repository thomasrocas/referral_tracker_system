import { createApp } from './app.js';
import { runMigrations } from './db/migrate.js';
import { getPool } from './db/pool.js';

const port = Number(process.env.PORT ?? 3000);

async function bootstrap() {
  await runMigrations();
  const app = createApp({ db: getPool() });
  app.listen(port, () => {
    console.log(`Referral Tracker API listening on :${port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
