import { getSheets, SHEET_ID } from './contacts.js';

const TAB = 'Settings';

// Everything you can change from the /admin page.
export const KEYS = [
  { key: 'WEBINAR_LINK', label: 'Webinar link (Zoom or Google Meet)', type: 'url', hint: 'Sent in the confirmation email and reminders' },
  { key: 'WEBINAR_TIME_TEXT', label: 'Webinar date and time', type: 'text', hint: 'Example: Saturday 22 Nov, 7 PM IST' },
  { key: 'COMMUNITY_LINK', label: 'WhatsApp community link', type: 'url', hint: 'Sent right after registration' },
  { key: 'CERTIFICATE_LINK', label: 'Certificate link', type: 'url', hint: 'Sent after the webinar' },
  { key: 'RESOURCES_LINK', label: 'Resources link', type: 'url', hint: 'Sent after the webinar' },
];

let tabReady = false;
let cache = null;
let cacheAt = 0;

async function ensureTab() {
  if (tabReady) return;
  const sheets = getSheets();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: SHEET_ID,
    fields: 'sheets.properties.title',
  });
  const exists = meta.data.sheets.some((s) => s.properties.title === TAB);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: TAB } } }] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `'${TAB}'!A1:C1`,
      valueInputOption: 'RAW',
      requestBody: { values: [['key', 'value', 'updated']] },
    });
  }
  tabReady = true;
}

async function loadSettings(force = false) {
  if (!force && cache && Date.now() - cacheAt < 30000) return cache;
  await ensureTab();
  const res = await getSheets().spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `'${TAB}'!A2:B`,
  });
  const map = {};
  for (const row of res.data.values || []) if (row[0]) map[row[0]] = row[1] || '';
  cache = map;
  cacheAt = Date.now();
  return map;
}

// Sheet value first, then .env value as a fallback.
export async function getSetting(key) {
  const s = await loadSettings();
  return s[key] || process.env[key] || '';
}

export async function getAllSettings() {
  const s = await loadSettings(true);
  return KEYS.map((k) => ({ ...k, value: s[k.key] || '' }));
}

export async function saveSettings(values) {
  const current = await loadSettings(true);
  const merged = { ...current };

  for (const { key, label, type } of KEYS) {
    if (typeof values[key] !== 'string') continue;
    const v = values[key].trim();
    if (type === 'url' && v) {
      let u;
      try {
        u = new URL(v);
      } catch {
        throw new Error(`${label}: enter a full link starting with https://`);
      }
      if (!['http:', 'https:'].includes(u.protocol)) {
        throw new Error(`${label}: link must start with http:// or https://`);
      }
    }
    merged[key] = v;
  }

  const now = new Date().toISOString();
  const rows = Object.entries(merged).map(([k, v]) => [k, v, now]);
  const sheets = getSheets();
  await sheets.spreadsheets.values.clear({ spreadsheetId: SHEET_ID, range: `'${TAB}'!A2:C` });
  if (rows.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `'${TAB}'!A2`,
      valueInputOption: 'RAW',
      requestBody: { values: rows },
    });
  }
  cache = merged;
  cacheAt = Date.now();
}
