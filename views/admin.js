'use strict';

const { html, raw, number, price } = require('../lib/html');
const { business, categories, categoryBySlug, statuses, specFields, whatsappLink } = require('../lib/site');
const { icon } = require('./icons');
const { vehicleTitle } = require('./components');

const LEAD_TYPES = { contact: 'פנייה כללית', quote: 'התעניינות בכלי', buy: 'רוצה לקנות', sell: 'רוצה למכור', trade: 'טרייד אין' };

const NAV = [
  { href: '/admin', label: 'סקירה', key: 'dash', icon: 'gauge' },
  { href: '/admin/vehicles', label: 'כלים', key: 'vehicles', icon: 'tag' },
  { href: '/admin/leads', label: 'פניות', key: 'leads', icon: 'inbox' },
  { href: '/admin/testimonials', label: 'המלצות', key: 'testimonials', icon: 'quote' },
  { href: '/admin/settings', label: 'הגדרות', key: 'settings', icon: 'image' },
];

function layout({ title, active, body, csrf, flash, newLeads = 0 }) {
  return html`<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>${title} | ניהול האתר</title>
  <link rel="icon" href="/img/favicon.png" type="image/png">
  <link rel="stylesheet" href="/css/site.css">
  <link rel="stylesheet" href="/css/admin.css">
</head>
<body class="admin">
  <a class="skip-link" href="#main">דילוג לתוכן</a>
  ${csrf !== undefined
    ? html`<header class="admin-bar">
        <a class="admin-bar__brand" href="/admin"><img src="/img/logo-emblem-sm.webp" width="66" height="40" alt="">ניהול האתר</a>
        <nav class="admin-nav" aria-label="ניהול">
          ${NAV.map(
            (n) => html`<a href="${n.href}" ${active === n.key ? raw('aria-current="page"') : ''}>${icon(n.icon, { size: 18 })}${n.label}${n.key === 'leads' && newLeads ? html`<span class="pill">${newLeads}</span>` : ''}</a>`
          )}
        </nav>
        <div class="admin-bar__end">
          <a href="/" target="_blank" rel="noopener">${icon('eye', { size: 18 })}לאתר</a>
          <form method="post" action="/admin/logout"><input type="hidden" name="_csrf" value="${csrf}"><button type="submit">${icon('logout', { size: 18 })}יציאה</button></form>
        </div>
      </header>`
    : ''}
  <main id="main" class="admin-main" tabindex="-1">
    ${flash ? html`<p class="flash" role="status">${icon('check', { size: 18 })}${flash}</p>` : ''}
    ${body}
  </main>
  <script src="/js/admin.js" defer></script>
</body>
</html>`;
}

function login({ error, next, configured }) {
  const body = html`<div class="login">
    <img src="/img/logo-full.webp" width="220" height="202" alt="${business.fullName}">
    <h1>כניסה לניהול האתר</h1>
    ${!configured
      ? html`<p class="form-error" role="alert">לא הוגדרה סיסמת ניהול. הגדירו את משתנה הסביבה ADMIN_PASSWORD והפעילו את השרת מחדש.</p>`
      : ''}
    ${error ? html`<p class="form-error" role="alert">${error}</p>` : ''}
    <form method="post" action="/admin/login">
      <input type="hidden" name="next" value="${next || '/admin'}">
      <input type="text" name="username" value="admin" autocomplete="username" hidden>
      <div class="field">
        <label for="password">סיסמה</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required autofocus>
      </div>
      <button class="btn btn--primary btn--block" type="submit">כניסה</button>
    </form>
  </div>`;
  return layout({ title: 'כניסה', body });
}

function dashboard({ vehicles, leads, csrf, flash }) {
  const available = vehicles.filter((v) => v.status === 'available').length;
  const sold = vehicles.filter((v) => v.status === 'sold').length;
  const open = leads.filter((l) => !l.handled);
  const body = html`
  <div class="admin-head"><h1>סקירה</h1><a class="btn btn--primary" href="/admin/vehicles/new">+ הוספת כלי</a></div>
  <div class="stats">
    <a class="stat" href="/admin/vehicles"><span class="stat__num">${available}</span><span>כלים זמינים</span></a>
    <a class="stat" href="/admin/vehicles?status=sold"><span class="stat__num">${sold}</span><span>נמכרו</span></a>
    <a class="stat" href="/admin/leads"><span class="stat__num">${open.length}</span><span>פניות שלא טופלו</span></a>
  </div>
  <section class="panel">
    <h2>פניות אחרונות</h2>
    ${open.length ? leadsTable(open.slice(0, 8), { csrf, vehicles }) : html`<p class="muted">אין פניות פתוחות.</p>`}
  </section>`;
  return layout({ title: 'סקירה', active: 'dash', body, csrf, flash, newLeads: open.length });
}

function syncPanel(sync, csrf) {
  if (!sync) return '';
  const last = sync.last;
  const fmt = new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Jerusalem' });
  const list = (items) => (items.length > 5 ? `${items.slice(0, 5).join(', ')} ועוד ${items.length - 5}` : items.join(', '));
  return html`<section class="panel sync-panel" aria-labelledby="sync-title">
    <div class="sync-panel__head">
      <div>
        <h2 id="sync-title">סנכרון עם משין</h2>
        <p class="muted small">${sync.enabled
          ? `האתר בודק את המודעות של לירן ב-machine.co.il ${sync.hours === 1 ? 'כל שעה' : `כל ${sync.hours} שעות`}. מודעה חדשה נוספת לאתר, שינויים במודעה מתעדכנים, ומודעה שירדה מוסתרת.`
          : 'הסנכרון האוטומטי כבוי. אפשר לסנכרן ידנית.'}</p>
      </div>
      <form method="post" action="/admin/sync">
        <input type="hidden" name="_csrf" value="${csrf}">
        <button class="btn btn--outline btn--small" type="submit" ${sync.running ? raw('disabled') : ''}>${sync.running ? 'מסנכרן…' : 'סנכרון עכשיו'}</button>
      </form>
    </div>
    ${last
      ? html`<div class="sync-panel__last ${last.ok ? '' : 'is-error'}">
          <p><strong>סנכרון אחרון:</strong> ${fmt.format(new Date(last.at))}${last.ok ? ` · ${last.ads} מודעות במשין` : ''}</p>
          ${last.ok
            ? html`<ul class="small">
                <li>נוספו: ${last.added.length ? list(last.added) : 'אין'}</li>
                <li>עודכנו לפי משין (תמונות או פרטים): ${last.updated && last.updated.length ? list(last.updated) : 'אין'}</li>
                <li>הוסתרו כי המודעה ירדה: ${last.hidden.length ? list(last.hidden) : 'אין'}</li>
                ${last.photosKept && last.photosKept.length ? html`<li>התמונות לא הוחלפו כי שונו בממשק הניהול: ${list(last.photosKept)}</li>` : ''}
                ${last.restored.length ? html`<li>חזרו לאתר: ${list(last.restored)}</li>` : ''}
              </ul>`
            : html`<p class="small">הסנכרון נכשל: ${last.error}. לא בוצעו שינויים, והסנכרון הבא ינסה שוב.</p>`}
          ${last.warning ? html`<p class="small sync-warning">${last.warning}</p>` : ''}
          ${last.errors && last.errors.length ? html`<p class="small sync-warning">לא הצלחנו לייבא ${last.errors.length} מודעות. הן ינוסו שוב בסנכרון הבא.</p>` : ''}
        </div>`
      : html`<p class="small">עוד לא בוצע סנכרון.</p>`}
  </section>`;
}

function vehiclesList({ vehicles, filter, sync, csrf, flash, newLeads }) {
  const list = filter ? vehicles.filter((v) => v.status === filter) : vehicles;
  const body = html`
  <div class="admin-head">
    <h1>כלים <span class="muted">(${vehicles.length})</span></h1>
    <a class="btn btn--primary" href="/admin/vehicles/new">+ הוספת כלי</a>
  </div>
  ${syncPanel(sync, csrf)}
  <nav class="tabs" aria-label="סינון לפי מצב">
    <a href="/admin/vehicles" ${!filter ? raw('aria-current="page"') : ''}>הכול</a>
    ${Object.entries(statuses).map(([k, l]) => html`<a href="/admin/vehicles?status=${k}" ${filter === k ? raw('aria-current="page"') : ''}>${l}</a>`)}
  </nav>
  ${list.length
    ? html`<div class="table-wrap"><table class="table">
        <thead><tr><th scope="col">תמונה</th><th scope="col">כלי</th><th scope="col">קטגוריה</th><th scope="col">שנה</th><th scope="col">מחיר</th><th scope="col">מצב</th><th scope="col"><span class="sr-only">פעולות</span></th></tr></thead>
        <tbody>
          ${list.map(
            (v) => html`<tr class="${v.status === 'sold' ? 'is-sold' : ''}">
              <td>${v.images && v.images[0] ? html`<img class="thumb" src="${v.images[0].sm}" alt="" width="96" height="72">` : html`<span class="thumb thumb--empty">${icon('image', { size: 20 })}</span>`}</td>
              <td><a class="strong" href="/admin/vehicles/${v.id}">${vehicleTitle(v)}</a><div class="muted small">${(v.images || []).length} תמונות${v.source && v.source.site === 'machine.co.il' ? html` · <a href="https://www.machine.co.il/adpage?adid=${v.source.adid}" target="_blank" rel="noopener">ממשין</a>` : ''}${v.syncHidden ? ' · המודעה ירדה ממשין' : ''}</div></td>
              <td>${categoryBySlug[v.category] ? categoryBySlug[v.category].short : '—'}</td>
              <td>${v.year || '—'}</td>
              <td>${v.price ? price(v.price) : '—'}</td>
              <td>
                <form method="post" action="/admin/vehicles/${v.id}/status" class="inline-form">
                  <input type="hidden" name="_csrf" value="${csrf}">
                  <label class="sr-only" for="st-${v.id}">מצב ${vehicleTitle(v)}</label>
                  <select id="st-${v.id}" name="status" data-autosubmit>
                    ${Object.entries(statuses).map(([k, l]) => html`<option value="${k}" ${v.status === k ? raw('selected') : ''}>${l}</option>`)}
                  </select>
                  <noscript><button type="submit">עדכון</button></noscript>
                </form>
              </td>
              <td class="actions">
                <a href="/admin/vehicles/${v.id}" class="icon-btn" title="עריכה">${icon('edit', { size: 18 })}<span class="sr-only">עריכת ${vehicleTitle(v)}</span></a>
                ${v.status !== 'hidden' ? html`<a href="/catalog/${v.slug}" class="icon-btn" target="_blank" rel="noopener" title="צפייה באתר">${icon('eye', { size: 18 })}<span class="sr-only">צפייה באתר</span></a>` : ''}
              </td>
            </tr>`
          )}
        </tbody>
      </table></div>`
    : html`<div class="panel empty-admin"><p>${filter ? 'אין כלים במצב הזה.' : 'עוד לא הוספתם כלים.'}</p><a class="btn btn--primary" href="/admin/vehicles/new">+ הוספת הכלי הראשון</a></div>`}`;
  return layout({ title: 'כלים', active: 'vehicles', body, csrf, flash, newLeads });
}

function vehicleForm({ v, csrf, flash, errors = {}, newLeads }) {
  const isNew = !v.id;
  const val = (k) => (v[k] === undefined || v[k] === null ? '' : v[k]);
  const spec = (k) => (v.specs && v.specs[k]) || '';
  const extra = (v.extraSpecs || []).map((s) => `${s.label}: ${s.value}`).join('\n');
  const images = v.images || [];
  const err = (k) => (errors[k] ? html`<p class="field__error" id="err-${k}">${errors[k]}</p>` : '');

  const body = html`
  <div class="admin-head">
    <h1>${isNew ? 'הוספת כלי' : `עריכה: ${vehicleTitle(v)}`}</h1>
    ${!isNew && v.status !== 'hidden' ? html`<a class="btn btn--outline" href="/catalog/${v.slug}" target="_blank" rel="noopener">${icon('eye', { size: 18 })}צפייה באתר</a>` : ''}
  </div>
  ${v.source && v.source.site === 'machine.co.il'
    ? html`<p class="muted small">הכלי יובא מ<a href="https://www.machine.co.il/adpage?adid=${v.source.adid}" target="_blank" rel="noopener">מודעה ${v.source.adid} במשין</a>. שינויים במודעה (תמונות, שעות, תיאור) מתעדכנים כאן אוטומטית, אבל שדה שתשנו כאן לא יידרס.${v.imagesEditedInAdmin ? ' התמונות של הכלי נערכו כאן, ולכן הסנכרון לא מחליף אותן.' : ''}${v.syncHidden ? ' המודעה ירדה ממשין, ולכן הכלי מוסתר מהאתר. כדי להחזיר אותו, שנו את המצב ל"זמין".' : ''}</p>`
    : ''}
  ${Object.keys(errors).length ? html`<p class="form-error" role="alert" tabindex="-1" data-error-summary>יש לתקן את השדות המסומנים.</p>` : ''}
  <form class="vform" method="post" action="${isNew ? '/admin/vehicles/new' : `/admin/vehicles/${v.id}`}" enctype="multipart/form-data">
    <input type="hidden" name="_csrf" value="${csrf}">

    <section class="panel">
      <h2>פרטי הכלי</h2>
      <div class="grid-2">
        <div class="field">
          <label for="category">קטגוריה <span class="req">*</span></label>
          <select id="category" name="category" required ${errors.category ? raw('aria-invalid="true" aria-describedby="err-category"') : ''}>
            <option value="">בחרו קטגוריה</option>
            ${categories.map((c) => html`<option value="${c.slug}" ${v.category === c.slug ? raw('selected') : ''}>${c.name}</option>`)}
          </select>
          ${err('category')}
        </div>
        <div class="field">
          <label for="status">מצב</label>
          <select id="status" name="status">
            ${Object.entries(statuses).map(([k, l]) => html`<option value="${k}" ${(v.status || 'available') === k ? raw('selected') : ''}>${l}</option>`)}
          </select>
        </div>
        <div class="field">
          <label for="make">יצרן <span class="req">*</span></label>
          <input id="make" name="make" value="${val('make')}" required list="makes" ${errors.make ? raw('aria-invalid="true" aria-describedby="err-make"') : ''}>
          ${err('make')}
        </div>
        <div class="field">
          <label for="model">דגם</label>
          <input id="model" name="model" value="${val('model')}">
        </div>
        <div class="field">
          <label for="year">שנת ייצור</label>
          <input id="year" name="year" value="${val('year')}" inputmode="numeric" dir="ltr" ${errors.year ? raw('aria-invalid="true" aria-describedby="err-year"') : ''}>
          ${err('year')}
        </div>
        <div class="field">
          <label for="hours">שעות עבודה</label>
          <input id="hours" name="hours" value="${val('hours')}" inputmode="numeric" dir="ltr">
        </div>
        <div class="field">
          <label for="price">מחיר בש"ח</label>
          <input id="price" name="price" value="${val('price')}" inputmode="numeric" dir="ltr" aria-describedby="price-help">
          <p class="field__help" id="price-help">השאירו ריק כדי שלא יוצג מחיר באתר.</p>
        </div>
        <div class="field">
          <label for="priceNote">הערה למחיר</label>
          <input id="priceNote" name="priceNote" value="${val('priceNote')}" placeholder='למשל: לא כולל מע"מ'>
        </div>
        <div class="field grid-span">
          <label for="title">כותרת מותאמת</label>
          <input id="title" name="title" value="${val('title')}" aria-describedby="title-help">
          <p class="field__help" id="title-help">לא חובה. ברירת המחדל היא יצרן + דגם + שנה.</p>
        </div>
      </div>
    </section>

    <section class="panel">
      <h2>תמונות</h2>
      <p class="muted">התמונה הראשונה היא התמונה הראשית בכרטיס ובעמוד הכלי.</p>
      ${images.length
        ? html`<ul class="img-list">
            ${images.map(
              (img, i) => html`<li class="img-item">
                <img src="${img.sm}" alt="תמונה ${i + 1}" width="200" height="150">
                ${i === 0 ? html`<span class="img-item__cover">ראשית</span>` : ''}
                <div class="img-item__actions">
                  <button type="submit" name="imageAction" value="up:${img.key}" class="icon-btn" ${i === 0 ? raw('disabled') : ''}>${icon('chevronStart', { size: 18 })}<span class="sr-only">הזזת תמונה ${i + 1} קדימה</span></button>
                  <button type="submit" name="imageAction" value="down:${img.key}" class="icon-btn" ${i === images.length - 1 ? raw('disabled') : ''}>${icon('chevronEnd', { size: 18 })}<span class="sr-only">הזזת תמונה ${i + 1} אחורה</span></button>
                  <button type="submit" name="imageAction" value="delete:${img.key}" class="icon-btn icon-btn--danger" data-confirm="למחוק את התמונה?">${icon('trash', { size: 18 })}<span class="sr-only">מחיקת תמונה ${i + 1}</span></button>
                </div>
              </li>`
            )}
          </ul>`
        : ''}
      <div class="field">
        <label for="photos" class="upload">${icon('upload', { size: 22 })}<span>הוספת תמונות</span><span class="muted small">אפשר לבחור כמה תמונות יחד. JPG, PNG או WebP, עד 15MB לתמונה.</span></label>
        <input id="photos" name="photos" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple class="upload__input" data-upload-preview>
        <ul class="upload__preview" data-preview></ul>
      </div>
    </section>

    <section class="panel">
      <h2>מפרט טכני</h2>
      <div class="grid-2">
        ${specFields.map(
          (f) => html`<div class="field"><label for="spec-${f.key}">${f.label}</label><input id="spec-${f.key}" name="spec_${f.key}" value="${spec(f.key)}"></div>`
        )}
        <div class="field grid-span">
          <label for="extraSpecs">נתונים נוספים</label>
          <textarea id="extraSpecs" name="extraSpecs" rows="4" aria-describedby="extra-help">${extra}</textarea>
          <p class="field__help" id="extra-help">שורה לכל נתון, בפורמט "שם: ערך". למשל: מזגן: יש</p>
        </div>
      </div>
    </section>

    <section class="panel">
      <h2>תיאור</h2>
      <div class="field">
        <label for="description">תיאור הכלי</label>
        <textarea id="description" name="description" rows="7">${val('description')}</textarea>
      </div>
    </section>

    <div class="form-actions">
      <button class="btn btn--primary" type="submit">${isNew ? 'הוספת הכלי' : 'שמירת השינויים'}</button>
      <a class="btn btn--text" href="/admin/vehicles">ביטול</a>
    </div>
  </form>

  ${!isNew
    ? html`<form method="post" action="/admin/vehicles/${v.id}/delete" class="danger-zone">
        <input type="hidden" name="_csrf" value="${csrf}">
        <h2>הסרת הכלי מהאתר</h2>
        <p class="muted">הכלי והתמונות שלו יימחקו לצמיתות. כדי להשאיר אותו באתר כ"נמכר", שנו את המצב במקום למחוק.</p>
        <button class="btn btn--danger" type="submit" data-confirm="למחוק את ${vehicleTitle(v)} לצמיתות?">${icon('trash', { size: 18 })}מחיקת הכלי</button>
      </form>`
    : ''}
  <datalist id="makes">
    ${['John Deere', 'New Holland', 'Massey Ferguson', 'Case IH', 'Kubota', 'Fendt', 'Claas', 'Deutz-Fahr', 'Landini', 'Valtra', 'Bobcat', 'CAT', 'JCB', 'Volvo', 'Komatsu', 'Hitachi', 'Doosan', 'Avant', 'Weidemann', 'Schäffer', 'Gehl', 'Manitou', 'Merlo'].map((m) => html`<option value="${m}">`)}
  </datalist>`;
  return layout({ title: isNew ? 'הוספת כלי' : 'עריכת כלי', active: 'vehicles', body, csrf, flash, newLeads });
}

function leadsTable(leads, { csrf, vehicles }) {
  const byId = Object.fromEntries(vehicles.map((v) => [v.id, v]));
  const fmt = new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Jerusalem' });
  return html`<ul class="leads">
    ${leads.map((l) => {
      const v = l.vehicleId && byId[l.vehicleId];
      const phoneIntl = String(l.phone || '').replace(/\D/g, '').replace(/^0/, '972');
      return html`<li class="lead ${l.handled ? 'is-handled' : ''}">
        <div class="lead__head">
          <span class="lead__type">${LEAD_TYPES[l.type] || l.type}</span>
          <time class="muted small" datetime="${l.createdAt}">${fmt.format(new Date(l.createdAt))}</time>
        </div>
        <p class="lead__who"><strong>${l.name}</strong> · <a href="tel:${l.phone}" dir="ltr">${l.phone}</a> · <a href="https://wa.me/${phoneIntl}" target="_blank" rel="noopener">WhatsApp</a></p>
        ${v ? html`<p class="small">כלי: <a href="/catalog/${v.slug}" target="_blank" rel="noopener">${vehicleTitle(v)}</a></p>` : ''}
        ${l.machine || l.machineYear || l.machineHours
          ? html`<p class="small">הכלי של הלקוח: ${[l.machine, l.machineYear, l.machineHours ? `${l.machineHours} שעות` : ''].filter(Boolean).join(', ')}</p>`
          : ''}
        ${l.message ? html`<p class="lead__msg">${l.message}</p>` : ''}
        <div class="lead__actions">
          <form method="post" action="/admin/leads/${l.id}/handled"><input type="hidden" name="_csrf" value="${csrf}"><input type="hidden" name="handled" value="${l.handled ? '0' : '1'}"><button class="btn btn--small ${l.handled ? 'btn--outline' : 'btn--primary'}" type="submit">${l.handled ? 'סימון כפתוחה' : 'סימון כטופלה'}</button></form>
          <form method="post" action="/admin/leads/${l.id}/delete"><input type="hidden" name="_csrf" value="${csrf}"><button class="btn btn--small btn--text" type="submit" data-confirm="למחוק את הפנייה?">מחיקה</button></form>
        </div>
      </li>`;
    })}
  </ul>`;
}

function leadsPage({ leads, vehicles, csrf, flash, show }) {
  const open = leads.filter((l) => !l.handled);
  const list = show === 'all' ? leads : open;
  const body = html`
  <div class="admin-head"><h1>פניות</h1></div>
  <nav class="tabs" aria-label="סינון פניות">
    <a href="/admin/leads" ${show !== 'all' ? raw('aria-current="page"') : ''}>פתוחות (${open.length})</a>
    <a href="/admin/leads?show=all" ${show === 'all' ? raw('aria-current="page"') : ''}>הכול (${leads.length})</a>
  </nav>
  ${list.length ? leadsTable(list, { csrf, vehicles }) : html`<div class="panel"><p class="muted">אין פניות להצגה.</p></div>`}`;
  return layout({ title: 'פניות', active: 'leads', body, csrf, flash, newLeads: open.length });
}

function testimonialsPage({ testimonials, csrf, flash, newLeads }) {
  const form = (t = {}) => html`<form method="post" action="/admin/testimonials${t.id ? `/${t.id}` : ''}" class="panel tform">
    <input type="hidden" name="_csrf" value="${csrf}">
    <h2>${t.id ? `המלצה של ${t.name}` : 'הוספת המלצה'}</h2>
    <div class="grid-2">
      <div class="field"><label for="tn-${t.id || 'new'}">שם הממליץ <span class="req">*</span></label><input id="tn-${t.id || 'new'}" name="name" value="${t.name || ''}" required></div>
      <div class="field"><label for="tr-${t.id || 'new'}">תיאור (לא חובה)</label><input id="tr-${t.id || 'new'}" name="role" value="${t.role || ''}" placeholder="למשל: רפת בעמק חפר"></div>
      <div class="field grid-span"><label for="tt-${t.id || 'new'}">ההמלצה <span class="req">*</span></label><textarea id="tt-${t.id || 'new'}" name="text" rows="4" required>${t.text || ''}</textarea></div>
    </div>
    <div class="form-actions">
      <button class="btn btn--primary" type="submit">${t.id ? 'שמירה' : 'הוספה'}</button>
      ${t.id ? html`<button class="btn btn--text" type="submit" formaction="/admin/testimonials/${t.id}/delete" data-confirm="למחוק את ההמלצה?">מחיקה</button>` : ''}
    </div>
  </form>`;
  const body = html`
  <div class="admin-head"><h1>המלצות</h1></div>
  <p class="muted">פרסמו רק המלצות אמיתיות, באישור הלקוח.</p>
  ${form()}
  ${testimonials.map((t) => form(t))}`;
  return layout({ title: 'המלצות', active: 'testimonials', body, csrf, flash, newLeads });
}

function settingsPage({ settings, mail = {}, csrf, flash, newLeads }) {
  const slot = (key, title, help) => html`<section class="panel">
    <h2>${title}</h2>
    <p class="muted">${help}</p>
    ${settings[key] ? html`<img class="setting-img" src="${settings[key].sm}" alt="${title} – נוכחית" width="360">` : html`<p class="small">לא הועלתה תמונה.</p>`}
    <form method="post" action="/admin/settings/${key}" enctype="multipart/form-data" class="setting-form">
      <input type="hidden" name="_csrf" value="${csrf}">
      <label class="sr-only" for="file-${key}">קובץ תמונה</label>
      <input id="file-${key}" name="photo" type="file" accept="image/jpeg,image/png,image/webp" required>
      <button class="btn btn--primary" type="submit">${settings[key] ? 'החלפת התמונה' : 'העלאה'}</button>
    </form>
    ${settings[key]
      ? html`<form method="post" action="/admin/settings/${key}/delete"><input type="hidden" name="_csrf" value="${csrf}"><button class="btn btn--text" type="submit" data-confirm="להסיר את התמונה?">הסרת התמונה</button></form>`
      : ''}
  </section>`;
  const mailPanel = html`<section class="panel" id="email" aria-labelledby="email-title">
    <h2 id="email-title">התראות במייל על פניות</h2>
    ${mail.configured
      ? html`<p>כל פנייה חדשה מהאתר נשלחת במייל אל <strong dir="ltr">${mail.to}</strong>.</p>`
      : html`<p>ההתראות כבויות. כדי להפעיל אותן מגדירים ב-Render את פרטי המייל (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS ו-LEAD_EMAIL_TO). ההסבר המלא נמצא בקובץ README.</p>`}
    ${mail.error ? html`<p class="form-error" role="alert">שליחת מייל הבדיקה נכשלה: ${mail.error}</p>` : ''}
    ${mail.configured
      ? html`<form method="post" action="/admin/settings/test-email">
          <input type="hidden" name="_csrf" value="${csrf}">
          <button class="btn btn--outline btn--small" type="submit">שליחת מייל בדיקה</button>
        </form>`
      : ''}
  </section>`;
  const body = html`
  <div class="admin-head"><h1>הגדרות</h1></div>
  ${mailPanel}
  ${slot('heroImage', 'תמונה ראשית בדף הבית', 'תמונה רחבה ואיכותית של כלי בשטח. מומלץ לפחות 1800 פיקסלים ברוחב. בלי תמונה, מוצג הלוגו.')}
  ${slot('aboutImage', 'תמונה לעמוד אודות', 'למשל לירן במגרש או ליד כלי. בלי תמונה, מוצג הלוגו.')}`;
  return layout({ title: 'הגדרות', active: 'settings', body, csrf, flash, newLeads });
}

module.exports = { login, dashboard, vehiclesList, vehicleForm, leadsPage, testimonialsPage, settingsPage, LEAD_TYPES };
