const GRAPH = 'https://graph.facebook.com/v21.0';

// 10-digit Indian numbers get the 91 prefix. Change if you serve other countries.
function normalize(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  return d.length === 10 ? `91${d}` : d;
}

async function call(body) {
  const res = await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messaging_product: 'whatsapp', ...body }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `WhatsApp error ${res.status}`);
  return data;
}

// Free-form text. Only delivered if the user messaged you in the last 24 hours.
export const sendText = (to, text) =>
  call({
    to: normalize(to),
    type: 'text',
    text: { body: text, preview_url: true },
  });

// Approved template. Required for reminders and post-webinar messages.
export const sendTemplate = (to, name, params = [], lang = 'en') =>
  call({
    to: normalize(to),
    type: 'template',
    template: {
      name,
      language: { code: lang },
      components: params.length
        ? [{ type: 'body', parameters: params.map((p) => ({ type: 'text', text: String(p) })) }]
        : [],
    },
  });

// Uses the template named in process.env[templateEnvKey] if set, otherwise plain text.
export function notify(to, templateEnvKey, params, fallbackText) {
  const template = process.env[templateEnvKey];
  return template ? sendTemplate(to, template, params) : sendText(to, fallbackText);
}
