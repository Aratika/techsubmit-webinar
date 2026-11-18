import 'dotenv/config';
import { sendWebinarEmail } from './webinar-mail.js';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { ensureTabs, appendRow, TABS } from './sheets.js';
import { createOtp, checkOtp, consumeVerifiedToken } from './otp.js';
import { handleLeadgen } from './facebook.js';
import { normalizePhone, nowIST } from './utils.js';
import { onRegistered } from './registration.js';
import jobs from './jobs.js';
import admin from './admin.js';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL?.split(',') || true }));
app.use(express.json({ verify: (req, _res, buf) => (req.rawBody = buf) }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ---------- 1. Send OTP on WhatsApp ----------
const otpLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 10, standardHeaders: true });

app.post('/api/otp/send', otpLimiter, async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  if (!phone) return res.status(400).json({ error: 'Enter a valid 10-digit mobile number.' });

  const { code, error } = createOtp(phone);
  if (error) return res.status(429).json({ error });

  try {
    await sendWhatsAppOtp(phone, code);
    res.json({ ok: true });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// ---------- 2. Verify OTP ----------
app.post('/api/otp/verify', (req, res) => {
  const phone = normalizePhone(req.body.phone);
  if (!phone) return res.status(400).json({ error: 'Enter a valid mobile number.' });
  const { token, error } = checkOtp(phone, req.body.otp);
  if (error) return res.status(400).json({ error });
  res.json({ verifiedToken: token });
});

// ---------- 3. Save registration to Google Sheet (Tab 2) ----------
app.post('/api/register', async (req, res) => {
  const { name, email, city, verifiedToken } = req.body;
  const phone = normalizePhone(req.body.phone);

  if (!name?.trim() || !/^\S+@\S+\.\S+$/.test(email || '') || !phone) {
    return res.status(400).json({ error: 'Check your name, email and phone number.' });
  }
  if (!consumeVerifiedToken(verifiedToken, phone)) {
    return res.status(403).json({ error: 'Verify your WhatsApp number first.' });
  }

  try {
    await appendRow(TABS.web.name, [
      nowIST(),
      'Official Website',
      name.trim(),
      email.trim(),
      `+${phone}`,
      (city || '').trim(),
      'Yes (WhatsApp OTP)',
    ]);

    // NEW: confirmation email (Zoom/Meet link) + WhatsApp community invite.
    // Not awaited, so the user gets their response immediately.
    onRegistered({ name: name.trim(), email: email.trim(), phone }).catch((e) =>
      console.error('Post-registration failed:', e.message)
    );

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not save your registration. Please try again.' });
  }
});

// ---------- 4. Facebook + Instagram lead ads webhook (Tab 1) ----------
app.get('/api/webhooks/facebook', (req, res) => {
  if (
    req.query['hub.mode'] === 'subscribe' &&
    req.query['hub.verify_token'] === process.env.FB_VERIFY_TOKEN
  ) {
    return res.status(200).send(req.query['hub.challenge']);
  }
  res.sendStatus(403);
});

function validSignature(req) {
  const sig = req.get('x-hub-signature-256');
  if (!sig || !process.env.FB_APP_SECRET) return false;
  const expected =
    'sha256=' + crypto.createHmac('sha256', process.env.FB_APP_SECRET).update(req.rawBody).digest('hex');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

app.post('/api/webhooks/facebook', (req, res) => {
  if (!validSignature(req)) return res.sendStatus(401);
  res.sendStatus(200); // reply fast, Meta retries if we are slow
  handleLeadgen(req.body);
});

// ---------- 5. NEW: scheduled jobs (reminders, post-webinar, LLM analysis) ----------
app.use('/api/jobs', jobs);

// ---------- 6. NEW: admin page (change links and send messages without touching code) ----------
const adminLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 100, standardHeaders: true });
app.use('/api/admin', adminLimiter, admin);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.get('/admin', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

const port = process.env.PORT || 5000;
app.listen(port, async () => {
  console.log(`Server running on http://localhost:${port}`);
  try {
    await ensureTabs();
    console.log('Google Sheet ready: tabs FB_Insta_Leads and Website_Registrations');
  } catch (e) {
    console.error('Google Sheet setup failed:', e.message);
  }
});
