import { appendRow, TABS, nowIST } from './sheets.js';

const GRAPH = 'https://graph.facebook.com/v21.0';

// Facebook and Instagram lead ads both arrive through the same "leadgen" webhook.
export async function handleLeadgen(body) {
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'leadgen') continue;
      try {
        await processLead(change.value);
      } catch (e) {
        console.error('Lead failed:', change.value?.leadgen_id, e.message);
      }
    }
  }
}

async function processLead(v) {
  const url =
    `${GRAPH}/${v.leadgen_id}?fields=created_time,field_data,platform,campaign_name,ad_name,form_id` +
    `&access_token=${process.env.FB_PAGE_ACCESS_TOKEN}`;
  const res = await fetch(url);
  const lead = await res.json();
  if (!res.ok) throw new Error(lead.error?.message || 'Graph API error');

  const field = (...names) => {
    for (const n of names) {
      const f = lead.field_data?.find((x) => x.name === n);
      if (f?.values?.[0]) return f.values[0];
    }
    return '';
  };

  const source =
    lead.platform === 'ig' ? 'Instagram' : lead.platform === 'fb' ? 'Facebook' : 'Facebook/Instagram';

  await appendRow(TABS.fb.name, [
    nowIST(),
    source,
    v.leadgen_id,
    field('full_name', 'name'),
    field('email'),
    field('phone_number', 'phone'),
    lead.campaign_name || '',
    lead.ad_name || '',
    lead.form_id || v.form_id || '',
  ]);
}
