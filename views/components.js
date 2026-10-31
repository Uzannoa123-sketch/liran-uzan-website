'use strict';

const { html, raw, number, price } = require('../lib/html');
const { business, categoryBySlug, statuses, whatsappLink } = require('../lib/site');
const { icon } = require('./icons');

function vehicleName(v) {
  return [v.make, v.model].filter(Boolean).join(' ') || v.title || 'כלי';
}

function vehicleTitle(v) {
  return v.title || [vehicleName(v), v.year].filter(Boolean).join(' ');
}

function statusBadge(v) {
  if (!v.status || v.status === 'available') return '';
  return html`<span class="status status--${v.status}">${statuses[v.status]}</span>`;
}

function photo(img, { alt, sizes = '(min-width: 1100px) 33vw, (min-width: 700px) 50vw, 100vw', eager = false, cls = '' } = {}) {
  if (!img) {
    return html`<div class="photo-missing ${cls}" role="img" aria-label="${alt ? `${alt} – אין עדיין תמונה` : 'אין עדיין תמונה'}">
      ${icon('image', { size: 32 })}<span>תמונות בקרוב</span>
    </div>`;
  }
  return html`<img class="${cls}" src="${img.sm}" srcset="${img.sm} 720w, ${img.lg} ${img.w || 1800}w" sizes="${sizes}"
    width="${img.w || 1600}" height="${img.h || 1200}" alt="${alt || ''}" ${eager ? raw('fetchpriority="high"') : raw('loading="lazy" decoding="async"')}>`;
}

// "Data plate": the key numbers of a machine, laid out like the stamped
// identification plate riveted onto real equipment.
function dataPlate(v, { compact = false } = {}) {
  const cells = [
    { label: 'שנה', value: v.year || '—' },
    { label: 'שעות עבודה', value: v.hours ? number(v.hours) : '—' },
    { label: compact ? 'יצרן' : 'יצרן', value: v.make || '—' },
  ];
  return html`<dl class="plate ${compact ? 'plate--compact' : ''}">
    ${cells.map((c) => html`<div class="plate__cell"><dt>${c.label}</dt><dd>${c.value}</dd></div>`)}
  </dl>`;
}

function vehicleCard(v, { headingLevel = 3 } = {}) {
  const cat = categoryBySlug[v.category];
  const title = vehicleTitle(v);
  const h = `h${headingLevel}`;
  return html`<article class="vcard ${v.status === 'sold' ? 'is-sold' : ''}">
    <a class="vcard__link" href="/catalog/${v.slug}">
      <div class="vcard__media">
        ${photo(v.images && v.images[0], { alt: title })}
        ${v.status === 'sold' ? html`<span class="sold-stamp" aria-hidden="true">נמכר</span>` : ''}
      </div>
      <div class="vcard__body">
        <p class="vcard__cat">${cat ? cat.name : ''} ${statusBadge(v)}</p>
        ${raw(`<${h} class="vcard__title">`)}${title}${raw(`</${h}>`)}
        ${dataPlate(v, { compact: true })}
        <p class="vcard__price">${v.status === 'sold' ? 'נמכר' : v.price ? price(v.price) : 'מחיר בשיחה'}</p>
      </div>
    </a>
  </article>`;
}

// Lead form, used for contact, quotes, selling and trade-in.
function leadForm({ type = 'contact', vehicle, heading, submitLabel = 'שליחת פרטים', showType = false, compact = false, idPrefix = 'lead' } = {}) {
  const id = (n) => `${idPrefix}-${n}`;
  return html`<form class="lead-form ${compact ? 'lead-form--compact' : ''}" method="post" action="/api/leads" data-lead-form novalidate>
    ${heading ? html`<h2 class="lead-form__title">${heading}</h2>` : ''}
    ${showType ? '' : html`<input type="hidden" name="type" value="${type}">`}
    ${vehicle ? html`<input type="hidden" name="vehicleId" value="${vehicle.id}">` : ''}
    <div class="hp" aria-hidden="true"><label>אל תמלאו שדה זה<input name="website" tabindex="-1" autocomplete="off"></label></div>
    ${showType
      ? html`<fieldset class="field field--choices">
          <legend>מה תרצו לעשות?</legend>
          <div class="choices">
            ${[
              ['buy', 'לקנות כלי'],
              ['sell', 'למכור כלי'],
              ['trade', 'טרייד אין'],
            ].map(
              ([val, label], i) => html`<label class="choice"><input type="radio" name="type" value="${val}" ${i === 0 ? raw('checked') : ''} data-type-radio><span>${label}</span></label>`
            )}
          </div>
        </fieldset>`
      : ''}
    <div class="field-row">
      <div class="field">
        <label for="${id('name')}">שם מלא <span class="req" aria-hidden="true">*</span></label>
        <input id="${id('name')}" name="name" autocomplete="name" required aria-describedby="${id('name')}-err">
        <p class="field__error" id="${id('name')}-err" aria-live="polite"></p>
      </div>
      <div class="field">
        <label for="${id('phone')}">טלפון <span class="req" aria-hidden="true">*</span></label>
        <input id="${id('phone')}" name="phone" type="tel" inputmode="tel" autocomplete="tel" dir="ltr" required aria-describedby="${id('phone')}-err">
        <p class="field__error" id="${id('phone')}-err" aria-live="polite"></p>
      </div>
    </div>
    ${showType
      ? html`<div class="field-row field-row--3" data-machine-fields hidden>
          <div class="field"><label for="${id('make')}">יצרן ודגם הכלי שלכם</label><input id="${id('make')}" name="machine"></div>
          <div class="field"><label for="${id('year')}">שנת ייצור</label><input id="${id('year')}" name="machineYear" inputmode="numeric" dir="ltr"></div>
          <div class="field"><label for="${id('hours')}">שעות עבודה</label><input id="${id('hours')}" name="machineHours" inputmode="numeric" dir="ltr"></div>
        </div>`
      : ''}
    <div class="field">
      <label for="${id('message')}">${vehicle ? 'הודעה (לא חובה)' : 'במה נוכל לעזור?'}</label>
      <textarea id="${id('message')}" name="message" rows="${compact ? 3 : 4}">${vehicle ? `אשמח לקבל הצעת מחיר על ${vehicleTitle(vehicle)}` : ''}</textarea>
    </div>
    <button class="btn btn--primary btn--block" type="submit" data-submit>
      <span data-label>${submitLabel}</span>
    </button>
    <p class="lead-form__status" role="status" aria-live="polite" data-status></p>
    <p class="lead-form__alt">מעדיפים לדבר עכשיו? <a href="tel:${business.phoneTel}" dir="ltr">${business.phoneDisplay}</a></p>
  </form>`;
}

function contactButtons({ text, dark = true } = {}) {
  return html`<div class="cta-row">
    <a class="btn btn--primary" href="tel:${business.phoneTel}">${icon('phone')}<span>חיוג <span dir="ltr">${business.phoneDisplay}</span></span></a>
    <a class="btn ${dark ? 'btn--ghost' : 'btn--outline'}" href="${whatsappLink(text)}" target="_blank" rel="noopener">${icon('whatsapp')}<span>WhatsApp</span></a>
  </div>`;
}

function pageHead({ title, intro, crumbs }) {
  return html`<section class="page-head">
    <div class="wrap">
      ${crumbs
        ? html`<nav class="crumbs" aria-label="מיקום באתר"><ol>
            <li><a href="/">בית</a></li>
            ${crumbs.map((c, i) =>
              i === crumbs.length - 1
                ? html`<li><span aria-current="page">${c.label}</span></li>`
                : html`<li><a href="${c.href}">${c.label}</a></li>`
            )}
          </ol></nav>`
        : ''}
      <h1 class="page-head__title">${title}</h1>
      ${intro ? html`<p class="page-head__intro">${intro}</p>` : ''}
    </div>
  </section>`;
}

module.exports = { vehicleCard, vehicleName, vehicleTitle, photo, dataPlate, statusBadge, leadForm, contactButtons, pageHead };
