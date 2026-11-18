import 'dotenv/config';

const token = (process.env.WHATSAPP_TOKEN || '').trim();
const id = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();

console.log('Token length:', token.length, '| Phone ID:', id);

const res = await fetch(
  `https://graph.facebook.com/v21.0/${id}?fields=display_phone_number,verified_name`,
  { headers: { Authorization: `Bearer ${token}` } }
);

console.log('Status:', res.status);
console.log(JSON.stringify(await res.json(), null, 2));