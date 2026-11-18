import { google } from 'googleapis';
import fs from 'fs';
import { TABS } from './sheets.js';

export const SHEET_ID = process.env.GOOGLE_SHEET_ID || process.env.SHEET_ID;
const TAB = TABS.web.name; // Website_Registrations

// Columns A-G match what /api/register writes. H-J are new: add these headers in your sheet.
export const COLS = [
  'timestamp',
  'source',
  'name',
  'email',
  'phone',
  'city',
  'verified',
  'reminderDaySent',
  'reminderHourSent',
  'postSent',
];

let _sheets;
export function getSheets() {
  if (!_sheets) {
    const credentials = process.env.GOOGLE_CREDENTIALS_JSON
      ? JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON)
      : JSON.parse(
          fs.readFileSync(new URL('./google-credentials.json', import.meta.url), 'utf8')
        );
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    _sheets = google.sheets({ version: 'v4', auth });
  }
  return _sheets;
}

const letter = (key) => String.fromCharCode(65 + COLS.indexOf(key));
const lastLetter = String.fromCharCode(65 + COLS.length - 1);

export const digits = (p) => String(p || '').replace(/\D/g, '');
export const samePhone = (a, b) => digits(a).slice(-10) === digits(b).slice(-10);

// /api/register writes "Yes (WhatsApp OTP)" in the verified column.
export const isVerified = (c) => String(c.verified).toLowerCase().startsWith('yes');

export async function getContacts() {
  const res = await getSheets().spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `'${TAB}'!A2:${lastLetter}`,
  });
  return (res.data.values || []).map((r, i) => {
    const c = { row: i + 2 };
    COLS.forEach((k, j) => (c[k] = r[j] || ''));
    return c;
  });
}

export async function setCell(row, key, value) {
  await getSheets().spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `'${TAB}'!${letter(key)}${row}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[value]] },
  });
}

export async function findByPhone(phone) {
  const all = await getContacts();
  return all.find((c) => samePhone(c.phone, phone));
}
