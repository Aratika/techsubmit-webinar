
import { sendWebinarEmail } from './webinar-mail.js';
import { notify } from './wa.js';
import { getSetting } from './settings.js';

export async function onRegistered({ name, email, phone }) {

  let emailSent = false;
  let whatsappSent = false;

  // 1. Send confirmation email
  try {
    await sendWebinarEmail({
      to: email,
      name
    });

    emailSent = true;
    console.log('Email sent successfully:', email);

  } catch (error) {
    console.error('Email failed:', error.message);
  }

  // 2. Send WhatsApp community invitation
  try {
    const communityLink = await getSetting('COMMUNITY_LINK');

    if (communityLink) {
      await notify(
        phone,
        'WA_TEMPLATE_WELCOME',
        [name, communityLink],
        `Hi ${name}, you are registered! Join our community: ${communityLink}`
      );

      whatsappSent = true;
      console.log('WhatsApp invitation sent:', phone);
    }

  } catch (error) {
    console.error('WhatsApp failed:', error.message);
  }

  return {
    emailSent,
    whatsappSent
  };
}
