import { Router } from 'express';
import { getContacts, setCell, isVerified } from './contacts.js';
import { notify } from './wa.js';
import { analyzeLeads } from './analyze.js';
import { getSetting } from './settings.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Sends to every verified contact whose `flag` column is still empty.
async function broadcast({ flag, templateEnv, params, text }) {
  const targets = (await getContacts()).filter((c) => isVerified(c) && !c[flag]);
  let sent = 0;
  let failed = 0;

  for (const c of targets) {
    try {
      await notify(c.phone, templateEnv, params(c), text(c));
      await setCell(c.row, flag, new Date().toISOString());
      sent++;
    } catch (e) {
      failed++;
      console.error('Send failed:', c.phone, e.message);
    }
    await sleep(300);
  }
  return { total: targets.length, sent, failed };
}

export async function runReminder(when) {
  if (!['day', 'hour'].includes(when)) throw new Error('use day or hour');
  const link = await getSetting('WEBINAR_LINK');
  const time = (await getSetting('WEBINAR_TIME_TEXT')) || 'soon';
  if (!link) throw new Error('Webinar link is not set. Add it on the /admin page.');
  const label = when === 'day' ? 'tomorrow' : 'in 1 hour';

  return broadcast({
    flag: when === 'day' ? 'reminderDaySent' : 'reminderHourSent',
    templateEnv: when === 'day' ? 'WA_TEMPLATE_REMINDER_DAY' : 'WA_TEMPLATE_REMINDER_HOUR',
    params: (c) => [c.name || 'there', time, link],
    text: (c) => `Hi ${c.name || 'there'}, the webinar is ${label} (${time}). Join: ${link}`,
  });
}

export async function runPostWebinar() {
  const cert = await getSetting('CERTIFICATE_LINK');
  const resources = await getSetting('RESOURCES_LINK');
  if (!cert && !resources) throw new Error('Set the certificate or resources link on the /admin page first.');

  return broadcast({
    flag: 'postSent',
    templateEnv: 'WA_TEMPLATE_POST',
    params: (c) => [c.name || 'there', cert || '-', resources || '-'],
    text: (c) =>
      `Thanks for attending, ${c.name || 'there'}!` +
      (cert ? `\nCertificate: ${cert}` : '') +
      (resources ? `\nResources: ${resources}` : ''),
  });
}

// Cloud Scheduler can still call these routes with the header: x-job-secret
const router = Router();

router.use((req, res, next) => {
  if (!process.env.JOB_SECRET || req.get('x-job-secret') !== process.env.JOB_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
});

router.post('/reminder/:when', async (req, res) => {
  try {
    res.json(await runReminder(req.params.when));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/post-webinar', async (req, res) => {
  try {
    res.json(await runPostWebinar());
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/analyze', async (req, res) => {
  try {
    res.json(await analyzeLeads());
  } catch (e) {
    console.error('Analyze failed:', e.message);
    res.status(500).json({ error: e.message });
  }
});

export default router;
