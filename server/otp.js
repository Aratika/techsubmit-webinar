import crypto from 'crypto';

const OTP_TTL = 5 * 60 * 1000; // OTP valid for 5 minutes
const TOKEN_TTL = 15 * 60 * 1000; // after verifying, registration allowed for 15 minutes
const RESEND_GAP = 30 * 1000;
const MAX_ATTEMPTS = 5;

// In-memory store. For many servers / restarts use Redis instead.
const otps = new Map(); // phone -> { hash, expires, attempts, sentAt }
const tokens = new Map(); // token -> { phone, expires }

const hash = (code) =>
  crypto.createHash('sha256').update(code + (process.env.FB_APP_SECRET || 'otp-salt')).digest('hex');

export function createOtp(phone) {
  const prev = otps.get(phone);
  if (prev && Date.now() - prev.sentAt < RESEND_GAP) {
    const wait = Math.ceil((RESEND_GAP - (Date.now() - prev.sentAt)) / 1000);
    return { error: `Please wait ${wait} seconds before asking for a new OTP.` };
  }
  const code = String(crypto.randomInt(100000, 1000000));
  otps.set(phone, { hash: hash(code), expires: Date.now() + OTP_TTL, attempts: 0, sentAt: Date.now() });
  return { code };
}

export function checkOtp(phone, code) {
  const rec = otps.get(phone);
  if (!rec || rec.expires < Date.now()) return { error: 'This OTP has expired. Request a new one.' };
  if (rec.attempts >= MAX_ATTEMPTS) return { error: 'Too many wrong attempts. Request a new OTP.' };
  rec.attempts += 1;
  if (rec.hash !== hash(String(code))) return { error: 'That OTP is not correct. Check the code and try again.' };

  otps.delete(phone);
  const token = crypto.randomBytes(24).toString('hex');
  tokens.set(token, { phone, expires: Date.now() + TOKEN_TTL });
  return { token };
}

export function consumeVerifiedToken(token, phone) {
  const rec = tokens.get(token);
  if (!rec || rec.expires < Date.now() || rec.phone !== phone) return false;
  tokens.delete(token);
  return true;
}
