import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const DATA_DIR = path.join(__dirname, 'data');
const BUNDLES_DIR = path.join(DATA_DIR, 'bundles');
await fs.ensureDir(BUNDLES_DIR);

const listPath = path.join(DATA_DIR, 'referrals.json');
if (!(await fs.pathExists(listPath))) {
  await fs.writeJson(listPath, []);
}

// Util: compute alerts from milestones
function computeAlerts(bundle) {
  const alerts = [...(bundle.alerts || [])];
  for (const m of bundle.milestones || []) {
    if (m.status === 'blocked') {
      alerts.unshift({
        severity: 'high',
        message: `Blocked at ${m.label} — ${m.hold_reason || 'Reason unknown'}`,
        owner: m.owner
      });
    }
  }
  // Simple SLA warning for next pending step
  const next = (bundle.milestones || []).find(m => m.status !== 'done');
  if (next) {
    alerts.push({
      severity: 'warn',
      message: `Next step: ${next.label} — SLA ${next.sla_hours || '—'}h`,
      owner: next.owner
    });
  }
  return alerts;
}

// GET health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// GET all referrals (summary)
app.get('/api/referrals', async (_req, res) => {
  const list = await fs.readJson(listPath);
  res.json(list);
});

// GET bundle by trackingId
app.get('/api/referrals/:id', async (req, res) => {
  const id = req.params.id;
  const fp = path.join(BUNDLES_DIR, `${id}.json`);
  if (!(await fs.pathExists(fp))) return res.status(404).json({ error: 'Not found' });
  const bundle = await fs.readJson(fp);
  bundle.alerts = computeAlerts(bundle);
  res.json(bundle);
});

// POST create referral (minimal payload → seed bundle)
app.post('/api/referrals', async (req, res) => {
  const p = req.body || {};
  if (!p.trackingId || !p.patient?.name) return res.status(400).json({ error: 'trackingId and patient.name required' });

  const list = await fs.readJson(listPath);
  if (list.find(r => r.trackingId === p.trackingId)) return res.status(409).json({ error: 'Already exists' });

  const bundle = {
    trackingId: p.trackingId,
    mode: 'internal',
    patient: p.patient,
    stakeholders: p.stakeholders || [],
    milestones: p.milestones || [],
    activities: p.activities || [],
    alerts: p.alerts || []
  };
  await fs.writeJson(path.join(BUNDLES_DIR, `${p.trackingId}.json`), bundle, { spaces: 2 });
  list.push({
    trackingId: p.trackingId,
    patient: p.patient.name,
    status: 'New',
    updatedAt: new Date().toISOString()
  });
  await fs.writeJson(listPath, list, { spaces: 2 });
  res.status(201).json(bundle);
});

// POST add activity
app.post('/api/referrals/:id/event', async (req, res) => {
  const id = req.params.id;
  const fp = path.join(BUNDLES_DIR, `${id}.json`);
  if (!(await fs.pathExists(fp))) return res.status(404).json({ error: 'Not found' });
  const bundle = await fs.readJson(fp);
  const ev = req.body || {};
  ev.at = ev.at || new Date().toISOString();
  bundle.activities = [ev, ...(bundle.activities || [])].sort((a, b) => new Date(b.at) - new Date(a.at));
  await fs.writeJson(fp, bundle, { spaces: 2 });
  res.json({ ok: true });
});

// POST update/add milestone
app.post('/api/referrals/:id/milestone', async (req, res) => {
  const id = req.params.id;
  const fp = path.join(BUNDLES_DIR, `${id}.json`);
  if (!(await fs.pathExists(fp))) return res.status(404).json({ error: 'Not found' });
  const bundle = await fs.readJson(fp);
  const m = req.body || {};
  const idx = (bundle.milestones || []).findIndex(x => x.code === m.code);
  if (idx >= 0) {
    bundle.milestones[idx] = { ...bundle.milestones[idx], ...m };
  } else {
    bundle.milestones = [...(bundle.milestones || []), m];
  }
  await fs.writeJson(fp, bundle, { spaces: 2 });
  res.json({ ok: true });
});

// POST add manual alert
app.post('/api/referrals/:id/alert', async (req, res) => {
  const id = req.params.id;
  const fp = path.join(BUNDLES_DIR, `${id}.json`);
  if (!(await fs.pathExists(fp))) return res.status(404).json({ error: 'Not found' });
  const bundle = await fs.readJson(fp);
  bundle.alerts = [...(bundle.alerts || []), req.body];
  await fs.writeJson(fp, bundle, { spaces: 2 });
  res.json({ ok: true });
});

// Fallback → index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Referral Tracker running on :${PORT}`));
