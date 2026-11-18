import nodemailer from 'nodemailer';
import { getSetting } from './settings.js';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export async function sendWebinarEmail({ to, name }) {
  const link = await getSetting('WEBINAR_LINK');
  const when = (await getSetting('WEBINAR_TIME_TEXT')) || 'the scheduled time';
  if (!link) throw new Error('Webinar link is not set. Add it on the /admin page.');

  await transporter.sendMail({
    from: `"TechSummit" <${process.env.SMTP_USER}>`,
    to,
    subject: 'You are registered for the TechSummit webinar',
    text:
      `Hi ${name},\n\nYou are registered for the webinar on ${when}.\n\n` +
      `Join link: ${link}\n\nSee you there!\nTechSummit`,
    html:
      `<p>Hi ${esc(name)},</p>` +
      `<p>You are registered for the webinar on <b>${esc(when)}</b>.</p>` +
      `<p><a href="${esc(link)}">Join the webinar</a></p>` +
      `<p>See you there!<br>TechSummit</p>`,
  });
}