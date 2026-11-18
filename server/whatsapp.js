// Sends the OTP with the WhatsApp Cloud API (Meta).
export async function sendWhatsAppOtp(phone, code) {
  if (process.env.DEV_SHOW_OTP === 'true') {
    console.log(`[DEV] WhatsApp OTP for +${phone}: ${code}`);
    return;
  }

  // trim() removes accidental spaces/newlines copied into .env
  const token = (process.env.WHATSAPP_TOKEN || '').trim();
  const phoneId = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  const templateName = (process.env.WHATSAPP_TEMPLATE_NAME || 'hello_world').trim();
  const lang = (process.env.WHATSAPP_TEMPLATE_LANG || 'en_US').trim();

  if (!token || !phoneId) {
    console.error('WhatsApp settings missing in server/.env', {
      hasToken: !!token,
      hasPhoneId: !!phoneId,
    });
    throw new Error('Could not send the WhatsApp OTP.');
  }

  // WhatsApp wants digits only, with country code, no "+" or spaces
  const to = String(phone).replace(/\D/g, '');

  let payload;

  if (templateName === 'text') {
    // Plain text: works only within 24 hours after the user messaged your number.
    payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: `Your TechSummit webinar OTP is ${code}. It is valid for 5 minutes.` },
    };
  } else {
    const template = { name: templateName, language: { code: lang } };

    if (templateName !== 'hello_world') {
      template.components = [
        { type: 'body', parameters: [{ type: 'text', text: String(code) }] },
      ];

      // Only add the button if your template is an "Authentication" template
      // with a copy-code / URL button. Set WHATSAPP_TEMPLATE_BUTTON=true in .env.
      if (process.env.WHATSAPP_TEMPLATE_BUTTON === 'true') {
        template.components.push({
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [{ type: 'text', text: String(code) }],
        });
      }
    }

    payload = { messaging_product: 'whatsapp', to, type: 'template', template };
  }

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const e = data.error || {};
    console.error('WhatsApp error:', {
      status: res.status,
      message: e.message,
      type: e.type,
      code: e.code,
      subcode: e.error_subcode,
      details: e.error_data?.details,
      fbtrace_id: e.fbtrace_id,
    });
    throw new Error('Could not send the WhatsApp OTP.');
  }

  console.log(`WhatsApp OTP sent to ${to}`);
}