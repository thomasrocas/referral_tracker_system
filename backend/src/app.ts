import cors from 'cors';
import express from 'express';
import { authenticate } from './auth/authenticate.js';
import { AuditService } from './audit/service.js';
import type { DBClient } from './db/types.js';
import { errorHandler } from './middleware/error-handler.js';
import { createStakeholderRouter } from './modules/stakeholders/router.js';
import { StakeholderService } from './modules/stakeholders/service.js';

export interface AppDependencies {
  db: DBClient;
}

export function createApp(deps: AppDependencies) {
  const app = express();
  const auditService = new AuditService(deps.db);
  const stakeholderService = new StakeholderService(deps.db, auditService);

  app.use(
    cors({
      origin: true,
      credentials: true
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(authenticate());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/stakeholders', createStakeholderRouter({ stakeholderService }));

  app.use(errorHandler);

  return app;
}
