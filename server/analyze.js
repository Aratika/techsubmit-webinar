import Anthropic from '@anthropic-ai/sdk';
import { getContacts, isVerified } from './contacts.js';

const client = new Anthropic(); // reads ANTHROPIC_API_KEY

// Only aggregated numbers go to the LLM. No names, phones or emails are sent.
export async function analyzeLeads() {
  const contacts = await getContacts();
  const total = contacts.length;
  const verified = contacts.filter(isVerified).length;

  const countBy = (fn) =>
    contacts.reduce((m, c) => {
      const k = fn(c) || 'unknown';
      m[k] = (m[k] || 0) + 1;
      return m;
    }, {});

  const stats = {
    total,
    verified,
    verifiedRatePercent: total ? +((verified / total) * 100).toFixed(1) : 0,
    bySource: countBy((c) => c.source),
    byDay: countBy((c) => String(c.timestamp).slice(0, 10)),
    emailsCollected: contacts.filter((c) => c.email).length,
    byCity: countBy((c) => c.city),
    postWebinarSent: contacts.filter((c) => c.postSent).length,
  };

  const msg = await client.messages.create({
    model: 'claude-sonnet-5-5',
    max_tokens: 1000,
    messages: [
      {
        role: 'user',
        content:
          'You analyse webinar registration data for a course marketing team. ' +
          'Using these aggregated stats, give: 1) key findings, 2) which source performs best, ' +
          '3) where users drop off, 4) three concrete actions. Be brief.\n\n' +
          JSON.stringify(stats, null, 2),
      },
    ],
  });

  const insights = msg.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');

  return { stats, insights };
}
