import fs from 'fs';
import { google } from 'googleapis';
import { nowIST } from './utils.js';

// Two tabs. They are created automatically on server start if missing.
export const TABS = {
  fb: {
    name: 'FB_Insta_Leads', // Tab 1: Facebook + Instagram lead ads
    headers: ['Received At', 'Source', 'Lead ID', 'Name', 'Email', 'Phone', 'Campaign', 'Ad', 'Form ID'],
  },
  web: {
    name: 'Website_Registrations', // Tab 2: official website
    headers: ['Registered At', 'Source', 'Name', 'Email', 'Phone', 'City', 'Phone Verified'],
  },
};

// Reads the key from server/google-credentials.json (falls back to .env)
const credsUrl = new URL('./google-credentials.json', import.meta.url);
const creds = fs.existsSync(credsUrl) ? JSON.parse(fs.readFileSync(credsUrl, 'utf8')) : null;

const auth = new google.auth.JWT({
  email: creds?.client_email || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: creds?.private_key || (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });
const id = () => process.env.GOOGLE_SHEET_ID;

let ready;
export function ensureTabs() {
  ready ??= setup().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

async function setup() {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: id() });
  const existing = new Set(meta.data.sheets.map((s) => s.properties.title));
  const missing = Object.values(TABS).filter((t) => !existing.has(t.name));

  if (missing.length) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: id(),
      requestBody: {
        requests: missing.map((t) => ({
          addSheet: { properties: { title: t.name, gridProperties: { frozenRowCount: 1 } } },
        })),
      },
    });
  }

  for (const t of Object.values(TABS)) {
    const r = await sheets.spreadsheets.values.get({ spreadsheetId: id(), range: `${t.name}!A1:A1` });
    if (!r.data.values?.length) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: id(),
        range: `${t.name}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [t.headers] },
      });
    }
  }
}

export async function appendRow(tabName, values) {
  await ensureTabs();
  await sheets.spreadsheets.values.append({
    spreadsheetId: id(),
    range: `${tabName}!A1`,
    valueInputOption: 'RAW', // keeps phone numbers as text
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [values] },
  });
}

// Phone is column E in the Website_Registrations tab
export async function websitePhoneExists(phone) {
  await ensureTabs();
  const r = await sheets.spreadsheets.values.get({
    spreadsheetId: id(),
    range: `${TABS.web.name}!E2:E`,
  });
  return (r.data.values || []).some((row) => row[0] === `+${phone}`);
}

export { nowIST };