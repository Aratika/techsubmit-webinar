import { Router } from 'express';
import crypto from 'crypto';
import { getContacts, isVerified } from './contacts.js';
import { getAllSettings, saveSettings } from './settings.js';
import { runReminder, runPostWebinar } from './jobs.js';
import { analyzeLeads } from './analyze.js';

const router = Router();
const hash = (s) => crypto.createHash('sha256').update(String(s)).digest();

// Every admin request must carry the password in the x-admin-password header.
router.use((req, res, next) => {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return res.status(503).json({ error: 'ADMIN_PASSWORD is not set in server/.env' });
  const given = req.get('x-admin-password') || '';
  if (!crypto.timingSafeEqual(hash(given), hash(expected))) {
    return res.status(401).json({ error: 'Wrong password' });
  }
  next();
});

router.get('/settings', async (_req, res) => {
  try {
    res.json({ settings: await getAllSettings() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/settings', async (req, res) => {
  try {
    await saveSettings(req.body || {});
    res.json({ ok: true, settings: await getAllSettings() });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/stats', async (_req, res) => {
  try {
    const all = await getContacts();
    const ok = all.filter(isVerified);
    res.json({
      registered: all.length,
      verified: ok.length,
      waitingDayReminder: ok.filter((c) => !c.reminderDaySent).length,
      waitingHourReminder: ok.filter((c) => !c.reminderHourSent).length,
      waitingPostMessage: ok.filter((c) => !c.postSent).length,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const ACTIONS = {
  'reminder-day': () => runReminder('day'),
  'reminder-hour': () => runReminder('hour'),
  'post-webinar': () => runPostWebinar(),
  analyze: () => analyzeLeads(),
};

router.post('/actions/:name', async (req, res) => {
  const action = ACTIONS[req.params.name];
  if (!action) return res.status(404).json({ error: 'Unknown action' });
  try {
    res.json(await action());
  } catch (e) {
    console.error('Admin action failed:', req.params.name, e.message);
    res.status(400).json({ error: e.message });
  }
});

export default router;
