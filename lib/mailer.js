'use strict';
// Email notification for every new lead. Works with any SMTP provider
// (Gmail with an app password, Outlook, Resend, the domain's mail host...).
//
// Settings (environment variables):
//   SMTP_HOST, SMTP_PORT (465 = SSL, 587 = STARTTLS), SMTP_USER, SMTP_PASS
//   LEAD_EMAIL_TO    where notifications go (comma-separated for several)
//   LEAD_EMAIL_FROM  optional sender; defaults to SMTP_USER
// When any required setting is missing, email is simply off.

const nodemailer = require('nodemailer');
const { business } = require('./site');
const { escape } = require('./html');

const TYPE_LABELS = { contact: 'פנייה כללית', quote: 'התעניינות בכלי', buy: 'רוצה לקנות', sell: 'רוצה למכור', trade: 'טרייד אין' };

let transport = null;

function config() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, LEAD_EMAIL_TO, LEAD_EMAIL_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !LEAD_EMAIL_TO) return null;
  const port = Number(SMTP_PORT) || 465;
  return {
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    to: LEAD_EMAIL_TO,
    from: LEAD_EMAIL_FROM || SMTP_USER,
  };
}

function isConfigured() {
  return Boolean(config());
}

// "l***@gmail.com" – enough to recognise the address without exposing it.
function maskedRecipients() {
  const c = config();
  if (!c) return '';
  return c.to
    .split(',')
    .map((a) => a.trim().replace(/^(.)[^@]*(@.*)$/, '$1***$2'))
    .join(', ');
}

function getTransport() {
  const c = config();
  if (!c) return null;
  if (!transport) {
    transport = nodemailer.createTransport({
      host: c.host,
      port: c.port,
      secure: c.secure,
      auth: c.auth,
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    });
  }
  return transport;
}

function siteBase() {
  return business.siteUrl || '';
}

function leadEmail(lead, vehicle) {
  const type = TYPE_LABELS[lead.type] || 'פנייה';
  const phoneDigits = String(lead.phone || '').replace(/\D/g, '');
  const intl = phoneDigits.replace(/^0/, '972');
  const vehicleTitle = vehicle ? vehicle.title || [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ') : '';
  const base = siteBase();
  const rows = [
    ['סוג הפנייה', type],
    ['שם', lead.name],
    ['טלפון', lead.phone],
    vehicle ? ['כלי', vehicleTitle] : null,
    lead.machine || lead.machineYear || lead.machineHours
      ? ['הכלי של הלקוח', [lead.machine, lead.machineYear, lead.machineHours ? `${lead.machineHours} שעות` : ''].filter(Boolean).join(', ')]
      : null,
    lead.message ? ['הודעה', lead.message] : null,
  ].filter(Boolean);

  const subject = `פנייה חדשה מהאתר: ${type} – ${lead.name}${vehicle ? ` (${vehicleTitle})` : ''}`;
  const text = [
    `${subject}`,
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    phoneDigits ? `חיוג: tel:${phoneDigits}` : '',
    phoneDigits ? `WhatsApp: https://wa.me/${intl}` : '',
    vehicle && base ? `הכלי באתר: ${base}/catalog/${encodeURI(vehicle.slug)}` : '',
    base ? `כל הפניות: ${base}/admin/leads` : '',
  ]
    .filter((l) => l !== undefined)
    .join('\n');

  const btn = (href, label, bg) =>
    `<a href="${escape(href)}" style="display:inline-block;padding:12px 18px;margin:0 0 8px 8px;background:${bg};color:#000;text-decoration:none;font-weight:700;border-radius:4px">${escape(label)}</a>`;
  const html = `<!doctype html><html lang="he" dir="rtl"><body style="margin:0;background:#f2f2f0;font-family:Arial,Helvetica,sans-serif;color:#000">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">
    <div style="background:#000;color:#fff;padding:18px 20px;border-bottom:4px solid #f07a1a">
      <div style="font-size:13px;color:#a3a8ad">${escape(business.fullName)}</div>
      <div style="font-size:22px;font-weight:700;margin-top:4px">פנייה חדשה: ${escape(type)}</div>
    </div>
    <div style="background:#fff;padding:20px">
      <table role="presentation" style="width:100%;border-collapse:collapse;font-size:16px">
        ${rows
          .map(
            ([k, v]) =>
              `<tr><td style="padding:8px 0;color:#5b6065;width:120px;vertical-align:top">${escape(k)}</td><td style="padding:8px 0;font-weight:600;white-space:pre-line">${escape(v)}</td></tr>`
          )
          .join('')}
      </table>
      <div style="margin-top:18px">
        ${phoneDigits ? btn(`tel:${phoneDigits}`, `חיוג ל${lead.name}`, '#f07a1a') : ''}
        ${phoneDigits ? btn(`https://wa.me/${intl}`, 'WhatsApp', '#25d366') : ''}
      </div>
      ${vehicle && base ? `<p style="margin:12px 0 0"><a href="${escape(`${base}/catalog/${encodeURI(vehicle.slug)}`)}" style="color:#b04f0b">לעמוד הכלי באתר</a></p>` : ''}
      ${base ? `<p style="margin:8px 0 0"><a href="${escape(`${base}/admin/leads`)}" style="color:#b04f0b">לכל הפניות בממשק הניהול</a></p>` : ''}
    </div>
  </div></body></html>`;
  return { subject, text, html };
}

async function send({ subject, text, html, replyTo }) {
  const c = config();
  const t = getTransport();
  if (!c || !t) return { sent: false, reason: 'not-configured' };
  await t.sendMail({ from: { name: business.fullName, address: c.from }, to: c.to, subject, text, html, replyTo });
  return { sent: true };
}

// Fire-and-forget: a mail problem must never break the lead form.
function notifyLead(lead, vehicle) {
  if (!isConfigured()) return;
  const msg = leadEmail(lead, vehicle);
  send(msg)
    .then(() => console.log(`[mail] lead notification sent (${lead.type})`))
    .catch((err) => console.error('[mail] lead notification failed:', err.message));
}

async function sendTest() {
  const msg = leadEmail(
    { type: 'contact', name: 'בדיקה מממשק הניהול', phone: business.phoneDisplay, message: 'זו הודעת בדיקה. אם היא הגיעה, ההתראות במייל עובדות.' },
    null
  );
  return send({ ...msg, subject: `בדיקה: ${msg.subject}` });
}

module.exports = { notifyLead, sendTest, isConfigured, maskedRecipients, leadEmail };
