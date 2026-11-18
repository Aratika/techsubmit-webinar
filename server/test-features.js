import 'dotenv/config';
import { getContacts, isVerified } from './contacts.js';
import { sendWebinarEmail } from './webinar-mail.js';
import { sendText } from './wa.js';
import { analyzeLeads } from './analyze.js';

const [, , cmd, arg] = process.argv;

try {
  if (cmd === 'sheet') {
    const contacts = await getContacts();
    console.log('Rows read from sheet:', contacts.length);
    console.log('Verified rows:', contacts.filter(isVerified).length);
    if (contacts[0]) {
      const c = contacts[0];
      console.log('First row (hidden details):', {
        row: c.row,
        source: c.source,
        name: c.name,
        city: c.city,
        verified: c.verified,
        phone: '***' + c.phone.slice(-4),
        email: c.email ? 'yes' : 'missing',
      });
    }
  } else if (cmd === 'email') {
    if (!arg) throw new Error('Give an email: node test-features.js email you@gmail.com');
    await sendWebinarEmail({ to: arg, name: 'Test User' });
    console.log('Email sent to', arg, '- check Inbox and Spam');
  } else if (cmd === 'whatsapp') {
    if (!arg) throw new Error('Give a number: node test-features.js whatsapp 9876543210');
    const r = await sendText(arg, 'Test message from the TechSummit server');
    console.log('WhatsApp accepted the message:', JSON.stringify(r.messages?.[0] || r));
  } else if (cmd === 'analyze') {
    const r = await analyzeLeads();
    console.log('STATS:', r.stats);
    console.log('\nINSIGHTS:\n' + r.insights);
  } else {
    console.log('Use one of:');
    console.log('  node test-features.js sheet');
    console.log('  node test-features.js email you@gmail.com');
    console.log('  node test-features.js whatsapp 9876543210');
    console.log('  node test-features.js analyze');
  }
} catch (e) {
  console.error('FAILED:', e.message);
}