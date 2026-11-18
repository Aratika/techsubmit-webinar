import 'dotenv/config';
import fs from 'fs';
import { google } from 'googleapis';

const creds = JSON.parse(fs.readFileSync(new URL('./google-credentials.json', import.meta.url)));
console.log('Robot email:', creds.client_email);
console.log('Sheet ID   :', process.env.GOOGLE_SHEET_ID);

const auth = new google.auth.JWT({
  email: creds.client_email,
  key: creds.private_key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

try {
  const r = await sheets.spreadsheets.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID });
  console.log('OK. Sheet title:', r.data.properties.title);
} catch (e) {
  console.log('FAILED:', e.code, e.message);
}