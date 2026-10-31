'use strict';

const { html, raw, paragraphs, number, price } = require('../lib/html');
const { business, categories, categoryBySlug, statuses, specFields, whatsappLink } = require('../lib/site');
const { page } = require('./layout');
const { icon } = require('./icons');
const { vehicleCard, vehicleTitle, vehicleName, photo, dataPlate, statusBadge, leadForm, contactButtons, pageHead } = require('./components');

// ------------------------------------------------------------------ home

function home({ vehicles, testimonials, settings, counts }) {
  const available = vehicles.filter((v) => v.status !== 'sold');
  const latest = available.slice(0, 6);
  const hero = settings.heroImage;

  const body = html`
  <section class="hero ${hero ? 'hero--photo' : 'hero--emblem'}">
    ${hero
      ? html`<img class="hero__bg" src="${hero.lg}" srcset="${hero.sm} 720w, ${hero.lg} ${hero.w || 1800}w" sizes="100vw" alt="" fetchpriority="high">`
      : html`<img class="hero__emblem" src="/img/logo-emblem.webp" width="660" height="397" alt="" fetchpriority="high">`}
    <div class="wrap hero__inner">
      <p class="hero__place">${icon('pin', { size: 18 })}${business.location}</p>
      <h1 class="hero__title">
        <span class="hero__line">טרקטורים ומעמיסים</span>
        <span class="hero__line hero__line--accent">קנייה, מכירה וטרייד אין</span>
      </h1>
      <p class="hero__lead">טרקטורים חקלאיים, מיני מעמיסים, בובקטים, שופלים וציוד מכני כבד. רואים את הכלי, מדברים ישירות עם לירן וסוגרים עסקה.</p>
      ${contactButtons({ text: 'היי לירן, אשמח לשמוע מה יש במלאי' })}
      <a class="hero__stock" href="/catalog">
        <span class="hero__stock-num">${available.length}</span>
        <span class="hero__stock-label">${available.length === 1 ? 'כלי זמין במלאי' : 'כלים זמינים במלאי'}</span>
        ${icon('arrowEnd', { size: 20 })}
      </a>
    </div>
  </section>

  <section class="cat-band" aria-labelledby="cat-band-title">
    <h2 class="sr-only" id="cat-band-title">קטגוריות</h2>
    <ul class="cat-band__list wrap-wide">
      ${categories.map(
        (c) => html`<li><a class="cat-band__item" href="/catalog?category=${c.slug}">
          <span class="cat-band__name">${c.name}</span>
          <span class="cat-band__count">${counts[c.slug] ? `${counts[c.slug]} במלאי` : 'לבירור מלאי'}</span>
        </a></li>`
      )}
    </ul>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="section-head">
        <h2 class="section-title">נכנסו עכשיו למלאי</h2>
        <a class="link-arrow" href="/catalog">לכל המלאי ${icon('arrowEnd', { size: 18 })}</a>
      </div>
      ${latest.length
        ? html`<div class="vgrid">${latest.map((v) => vehicleCard(v))}</div>`
        : html`<div class="empty">
            <p class="empty__title">המלאי מתעדכן כל הזמן</p>
            <p>הכלים הזמינים יעלו לכאן בקרוב. בינתיים אפשר לשאול את לירן מה יש במגרש ומה עומד להגיע.</p>
            ${contactButtons({ text: 'היי לירן, מה יש כרגע במלאי?', dark: false })}
          </div>`}
    </div>
  </section>

  <section class="section section--dark trade-split" aria-labelledby="trade-title">
    <div class="wrap">
      <h2 class="section-title" id="trade-title">שלוש דרכים לעשות עסקה</h2>
      <div class="trade-split__grid">
        <a class="trade-card" href="/catalog">
          ${icon('cart', { size: 28 })}
          <h3>קונים כלי</h3>
          <p>בוחרים מהמלאי או מספרים ללירן מה צריך, והוא מאתר את הכלי המתאים.</p>
          <span class="link-arrow">למלאי ${icon('arrowEnd', { size: 18 })}</span>
        </a>
        <a class="trade-card" href="/trade#form">
          ${icon('coins', { size: 28 })}
          <h3>מוכרים כלי</h3>
          <p>שולחים פרטים ותמונות של הטרקטור או המעמיס ומקבלים הצעה.</p>
          <span class="link-arrow">להצעה על הכלי שלכם ${icon('arrowEnd', { size: 18 })}</span>
        </a>
        <a class="trade-card" href="/trade#trade-in">
          ${icon('swap', { size: 28 })}
          <h3>טרייד אין</h3>
          <p>הכלי הישן נכנס כחלק מהתשלום על כלי אחר מהמלאי.</p>
          <span class="link-arrow">איך זה עובד ${icon('arrowEnd', { size: 18 })}</span>
        </a>
      </div>
    </div>
  </section>

  <section class="section about-teaser">
    <div class="wrap about-teaser__grid">
      <div class="about-teaser__media">
        ${settings.aboutImage
          ? photo(settings.aboutImage, { alt: 'לירן אוזן במגרש הכלים', sizes: '(min-width: 900px) 45vw, 100vw' })
          : html`<img src="/img/logo-full.webp" width="660" height="606" alt="" loading="lazy" class="about-teaser__logo">`}
      </div>
      <div class="about-teaser__text">
        <h2 class="section-title">מגרש כלים בעולש, ומדברים ישירות עם לירן</h2>
        <p>לירן אוזן קונה, מוכר ומחליף טרקטורים ומעמיסים מתוך מושב עולש שבשרון. חקלאים, בעלי משקים וקבלנים מגיעים למגרש כדי לראות את הכלי, להתניע אותו ולקבל תשובות ישירות.</p>
        <a class="btn btn--outline" href="/about">עוד על העסק</a>
      </div>
    </div>
  </section>

  ${testimonials.length
    ? html`<section class="section section--concrete">
        <div class="wrap">
          <div class="section-head">
            <h2 class="section-title">לקוחות מספרים</h2>
            <a class="link-arrow" href="/testimonials">לכל ההמלצות ${icon('arrowEnd', { size: 18 })}</a>
          </div>
          <div class="quotes">${testimonials.slice(0, 3).map(quoteCard)}</div>
        </div>
      </section>`
    : ''}

  ${contactBand()}`;

  return page({ active: 'home', body, canonical: '/' });
}

function quoteCard(t) {
  return html`<figure class="quote">
    ${icon('quote', { size: 28, cls: 'quote__mark' })}
    <blockquote>${paragraphs(t.text)}</blockquote>
    <figcaption><span class="quote__name">${t.name}</span>${t.role ? html`<span class="quote__role">${t.role}</span>` : ''}</figcaption>
  </figure>`;
}

function contactBand() {
  return html`<section class="contact-band" aria-labelledby="contact-band-title">
    <div class="wrap contact-band__grid">
      <div class="contact-band__text">
        <h2 class="contact-band__title" id="contact-band-title">מחפשים כלי, או רוצים למכור?</h2>
        <p>השאירו שם וטלפון ולירן יחזור אליכם. אפשר גם להתקשר או לשלוח הודעה.</p>
        <ul class="contact-list">
          <li><a href="tel:${business.phoneTel}">${icon('phone')}<span dir="ltr">${business.phoneDisplay}</span></a></li>
          <li><a href="${whatsappLink()}" target="_blank" rel="noopener">${icon('whatsapp')}WhatsApp</a></li>
          <li><span>${icon('pin')}${business.location}</span></li>
        </ul>
      </div>
      <div class="contact-band__form">${leadForm({ idPrefix: 'band', submitLabel: 'שליחת פרטים' })}</div>
    </div>
  </section>`;
}

// ------------------------------------------------------------------ about

function about({ settings }) {
  const body = html`
  ${pageHead({ title: 'אודות', crumbs: [{ label: 'אודות' }] })}
  <section class="section">
    <div class="wrap about">
      <div class="about__text prose">
        <p class="lead">העסק של לירן אוזן נמצא במושב עולש שבשרון ועוסק בטרקטורים, מעמיסים וציוד מכני.</p>
        <p>לירן קונה כלים מחקלאים, ממשקים ומקבלנים, מוכר אותם למי שצריך כלי לעבודה, ומחליף כלי ישן בכלי שמתאים יותר. במלאי יש טרקטורים חקלאיים, מיני מעמיסים, בובקטים, שופלים וציוד מכני כבד.</p>
        <p>עם לירן מדברים ישירות. מגיעים למגרש, רואים את הכלי ומתניעים אותו, שואלים על השעות וההיסטוריה שלו, ומקבלים תשובה ברורה לפני שסוגרים.</p>
        <h2>למי זה מתאים</h2>
        <ul class="ticks">
          <li>${icon('check', { size: 18 })}חקלאים ובעלי משקים שצריכים טרקטור או מעמיס לעבודה השוטפת</li>
          <li>${icon('check', { size: 18 })}קבלנים ומפעילי ציוד שמחפשים בובקט, שופל או כלי כבד</li>
          <li>${icon('check', { size: 18 })}מי שרוצה למכור כלי או להחליף אותו בכלי אחר מהמלאי</li>
        </ul>
        ${contactButtons({ text: 'היי לירן, אשמח לדבר', dark: false })}
      </div>
      <div class="about__media">
        ${settings.aboutImage
          ? photo(settings.aboutImage, { alt: 'לירן אוזן במגרש הכלים', sizes: '(min-width: 900px) 40vw, 100vw' })
          : html`<img src="/img/logo-full.webp" width="660" height="606" alt="הלוגו של לירן אוזן – טרקטורים ומעמיסים חקלאיים" class="about__logo">`}
      </div>
    </div>
  </section>
  ${contactBand()}`;
  return page({ title: 'אודות', active: 'about', body, canonical: '/about' });
}

// ------------------------------------------------------------------ categories

function categoriesPage({ counts, covers }) {
  const body = html`
  ${pageHead({ title: 'קטגוריות', intro: 'בחרו סוג כלי כדי לראות מה זמין עכשיו במלאי.', crumbs: [{ label: 'קטגוריות' }] })}
  <section class="section">
    <div class="wrap">
      <ul class="cat-grid">
        ${categories.map(
          (c) => html`<li><a class="cat-tile" href="/catalog?category=${c.slug}">
            <div class="cat-tile__media">${photo(covers[c.slug], { alt: '', sizes: '(min-width: 900px) 33vw, 100vw' })}</div>
            <div class="cat-tile__body">
              <h2 class="cat-tile__name">${c.name}</h2>
              <p>${c.blurb}</p>
              <span class="cat-tile__count">${counts[c.slug] ? `${counts[c.slug]} כלים במלאי` : 'שאלו אותנו על המלאי'} ${icon('arrowEnd', { size: 18 })}</span>
            </div>
          </a></li>`
        )}
      </ul>
    </div>
  </section>`;
  return page({ title: 'קטגוריות', active: 'categories', body, canonical: '/categories' });
}

// ------------------------------------------------------------------ catalog

const SORTS = [
  ['new', 'חדש במלאי'],
  ['year-desc', 'שנה: מהחדש לישן'],
  ['year-asc', 'שנה: מהישן לחדש'],
  ['price-asc', 'מחיר: מהנמוך לגבוה'],
  ['price-desc', 'מחיר: מהגבוה לנמוך'],
  ['hours-asc', 'שעות עבודה: מהמעט להרבה'],
];

function catalog({ results, filters, options, total }) {
  const cat = categoryBySlug[filters.category];
  const sel = (a, b) => (String(a) === String(b) ? raw('selected') : '');
  const activeCount = ['category', 'make', 'model', 'yearFrom', 'yearTo', 'q'].filter((k) => filters[k]).length + (filters.sold ? 1 : 0);
  const title = cat ? cat.name : 'מלאי כלים';

  const body = html`
  ${pageHead({
    title,
    intro: cat ? cat.blurb : 'כל הכלים שזמינים עכשיו. סננו לפי סוג כלי, יצרן, דגם ושנה.',
    crumbs: cat ? [{ label: 'מלאי כלים', href: '/catalog' }, { label: cat.name }] : [{ label: 'מלאי כלים' }],
  })}
  <section class="section section--tight">
    <div class="wrap catalog">
      <details class="filters" ${activeCount ? raw('open') : ''} data-filters>
        <summary class="filters__toggle">${icon('sliders', { size: 18 })}סינון וחיפוש${activeCount ? html` <span class="pill">${activeCount}</span>` : ''}</summary>
        <form class="filters__form" method="get" action="/catalog" data-filter-form>
          <div class="field field--search">
            <label for="f-q">חיפוש חופשי</label>
            <div class="input-icon">${icon('search', { size: 18 })}<input id="f-q" name="q" type="search" value="${filters.q || ''}" placeholder="למשל: ג'ון דיר 4x4"></div>
          </div>
          <div class="field">
            <label for="f-category">קטגוריה</label>
            <select id="f-category" name="category">
              <option value="">כל הקטגוריות</option>
              ${categories.map((c) => html`<option value="${c.slug}" ${sel(filters.category, c.slug)}>${c.name}</option>`)}
            </select>
          </div>
          <div class="field">
            <label for="f-make">יצרן</label>
            <select id="f-make" name="make">
              <option value="">כל היצרנים</option>
              ${options.makes.map((m) => html`<option ${sel(filters.make, m)}>${m}</option>`)}
            </select>
          </div>
          <div class="field">
            <label for="f-model">דגם</label>
            <select id="f-model" name="model" ${options.models.length ? '' : raw('disabled')}>
              <option value="">${filters.make ? 'כל הדגמים' : 'בחרו יצרן קודם'}</option>
              ${options.models.map((m) => html`<option ${sel(filters.model, m)}>${m}</option>`)}
            </select>
          </div>
          <div class="field field--years">
            <span class="field__label" id="years-label">שנת ייצור</span>
            <div class="range" role="group" aria-labelledby="years-label">
              <label class="sr-only" for="f-yfrom">משנה</label>
              <select id="f-yfrom" name="yearFrom"><option value="">משנה</option>${options.years.map((y) => html`<option ${sel(filters.yearFrom, y)}>${y}</option>`)}</select>
              <span aria-hidden="true">–</span>
              <label class="sr-only" for="f-yto">עד שנה</label>
              <select id="f-yto" name="yearTo"><option value="">עד שנה</option>${options.years.map((y) => html`<option ${sel(filters.yearTo, y)}>${y}</option>`)}</select>
            </div>
          </div>
          <label class="check">
            <input type="checkbox" name="sold" value="1" ${filters.sold ? raw('checked') : ''}>
            <span>להציג גם כלים שנמכרו</span>
          </label>
          <div class="filters__actions">
            <button class="btn btn--primary" type="submit">הצגת תוצאות</button>
            ${activeCount ? html`<a class="btn btn--text" href="/catalog">ניקוי הסינון</a>` : ''}
          </div>
        </form>
      </details>

      <div class="results">
        <div class="results__bar">
          <p class="results__count" role="status">${results.length === total && !activeCount ? `${total} כלים` : `${results.length} מתוך ${total} כלים`}</p>
          <form method="get" action="/catalog" class="sort" data-sort-form>
            ${Object.entries(filters)
              .filter(([k, v]) => v && k !== 'sort')
              .map(([k, v]) => html`<input type="hidden" name="${k}" value="${v}">`)}
            <label for="f-sort">מיון</label>
            <select id="f-sort" name="sort" data-autosubmit>
              ${SORTS.map(([v, l]) => html`<option value="${v}" ${sel(filters.sort || 'new', v)}>${l}</option>`)}
            </select>
            <noscript><button class="btn btn--text" type="submit">מיון</button></noscript>
          </form>
        </div>
        ${results.length
          ? html`<div class="vgrid vgrid--catalog">${results.map((v) => vehicleCard(v, { headingLevel: 2 }))}</div>`
          : html`<div class="empty">
              <p class="empty__title">${total ? 'אין כלים שמתאימים לסינון הזה' : 'המלאי מתעדכן כל הזמן'}</p>
              <p>${total ? 'נסו להרחיב את טווח השנים או לנקות חלק מהסינון. אפשר גם לספר ללירן מה אתם מחפשים, והוא יעדכן כשכלי כזה מגיע.' : 'הכלים הזמינים יעלו לכאן בקרוב. ספרו ללירן מה אתם מחפשים והוא יחזור אליכם.'}</p>
              <div class="cta-row">
                ${total ? html`<a class="btn btn--outline" href="/catalog">ניקוי הסינון</a>` : ''}
                <a class="btn btn--whatsapp" href="${whatsappLink(`היי לירן, אני מחפש ${cat ? cat.name : 'כלי'}`)}" target="_blank" rel="noopener">${icon('whatsapp')}לספר מה אני מחפש</a>
              </div>
            </div>`}
      </div>
    </div>
  </section>`;
  return page({
    title,
    active: 'catalog',
    body,
    canonical: cat ? `/catalog?category=${cat.slug}` : '/catalog',
    description: cat ? `${cat.name} למכירה – ${business.fullName}. ${cat.blurb}` : undefined,
  });
}

// ------------------------------------------------------------------ vehicle

function vehicle({ v, related }) {
  const cat = categoryBySlug[v.category];
  const title = vehicleTitle(v);
  const images = v.images || [];
  const specs = [
    { label: 'קטגוריה', value: cat ? cat.name : '' },
    { label: 'יצרן', value: v.make },
    { label: 'דגם', value: v.model },
    { label: 'שנת ייצור', value: v.year },
    { label: 'שעות עבודה', value: v.hours ? number(v.hours) : '' },
    ...specFields.map((f) => ({ label: f.label, value: v.specs && v.specs[f.key] })),
    ...((v.extraSpecs || []).map((s) => ({ label: s.label, value: s.value }))),
  ].filter((s) => s.value);
  const waText = `היי לירן, אני מתעניין ב${title} שראיתי באתר`;
  const sold = v.status === 'sold';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: title,
    brand: v.make ? { '@type': 'Brand', name: v.make } : undefined,
    model: v.model || undefined,
    category: cat ? cat.name : undefined,
    image: images.map((i) => (business.siteUrl || '') + i.lg),
    description: v.description || undefined,
    offers: v.price
      ? {
          '@type': 'Offer',
          price: Number(v.price),
          priceCurrency: 'ILS',
          availability: sold ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
          itemCondition: 'https://schema.org/UsedCondition',
        }
      : undefined,
  };

  const body = html`
  <div class="wrap vpage">
    <nav class="crumbs crumbs--light" aria-label="מיקום באתר"><ol>
      <li><a href="/">בית</a></li>
      <li><a href="/catalog">מלאי כלים</a></li>
      ${cat ? html`<li><a href="/catalog?category=${cat.slug}">${cat.name}</a></li>` : ''}
      <li><span aria-current="page">${title}</span></li>
    </ol></nav>

    <div class="vpage__grid">
      <section class="gallery" aria-label="תמונות" data-gallery>
        <div class="gallery__main">
          ${images.length
            ? html`<button class="gallery__stage" type="button" data-gallery-open aria-label="הגדלת התמונה">
                ${images.map(
                  (img, i) => html`<img src="${img.lg}" width="${img.w || 1600}" height="${img.h || 1200}" alt="${title} – תמונה ${i + 1} מתוך ${images.length}"
                    class="gallery__img ${i === 0 ? 'is-active' : ''}" data-index="${i}" ${i === 0 ? raw('fetchpriority="high"') : raw('loading="lazy"')}>`
                )}
                <span class="gallery__zoom">${icon('expand', { size: 18 })}</span>
              </button>
              ${images.length > 1
                ? html`<button class="gallery__nav gallery__nav--prev" type="button" data-gallery-prev>${icon('chevronStart', { size: 22 })}<span class="sr-only">התמונה הקודמת</span></button>
                  <button class="gallery__nav gallery__nav--next" type="button" data-gallery-next>${icon('chevronEnd', { size: 22 })}<span class="sr-only">התמונה הבאה</span></button>
                  <p class="gallery__counter" aria-live="polite"><span data-gallery-current>1</span> / ${images.length}</p>`
                : ''}`
            : photo(null, { alt: title, cls: 'gallery__missing' })}
          ${sold ? html`<span class="sold-stamp sold-stamp--lg" aria-hidden="true">נמכר</span>` : ''}
        </div>
        ${images.length > 1
          ? html`<ul class="gallery__thumbs">
              ${images.map(
                (img, i) => html`<li><button type="button" class="gallery__thumb ${i === 0 ? 'is-active' : ''}" data-gallery-thumb="${i}" aria-label="תמונה ${i + 1}" ${i === 0 ? raw('aria-current="true"') : ''}>
                  <img src="${img.sm}" alt="" loading="lazy" width="160" height="120">
                </button></li>`
              )}
            </ul>`
          : ''}
      </section>

      <aside class="vpage__panel">
        <p class="vpage__cat">${cat ? cat.name : ''} ${statusBadge(v)}</p>
        <h1 class="vpage__title">${title}</h1>
        ${dataPlate(v)}
        <p class="vpage__price">${sold ? 'הכלי נמכר' : v.price ? price(v.price) : 'מחיר בשיחה עם לירן'}${v.price && !sold && v.priceNote ? html`<span class="vpage__price-note">${v.priceNote}</span>` : ''}</p>
        ${sold
          ? html`<p class="vpage__sold-note">הכלי הזה כבר נמכר. יש לנו כלים דומים במלאי, ולירן יכול לאתר עבורכם כלי כזה.</p>
              <div class="cta-row cta-row--stack">
                <a class="btn btn--primary" href="/catalog?category=${v.category || ''}">לכלים דומים במלאי</a>
                <a class="btn btn--whatsapp" href="${whatsappLink(`היי לירן, אני מחפש כלי כמו ${title}`)}" target="_blank" rel="noopener">${icon('whatsapp')}לבקש כלי דומה</a>
              </div>`
          : html`<div class="cta-row cta-row--stack">
                <a class="btn btn--primary" href="tel:${business.phoneTel}">${icon('phone')}<span>חיוג <span dir="ltr">${business.phoneDisplay}</span></span></a>
                <a class="btn btn--whatsapp" href="${whatsappLink(waText)}" target="_blank" rel="noopener">${icon('whatsapp')}שאלה על הכלי ב-WhatsApp</a>
              </div>
              <div class="quote-box" id="quote">
                ${leadForm({ type: 'quote', vehicle: v, heading: 'בקשת הצעת מחיר', submitLabel: 'קבלת הצעת מחיר', compact: true, idPrefix: 'quote' })}
              </div>`}
      </aside>
    </div>

    <div class="vpage__details">
      ${specs.length
        ? html`<section class="specs" aria-labelledby="specs-title">
            <h2 class="section-title section-title--sm" id="specs-title">מפרט טכני</h2>
            <dl class="specs__list">
              ${specs.map((s) => html`<div class="specs__row"><dt>${s.label}</dt><dd>${s.value}</dd></div>`)}
            </dl>
          </section>`
        : ''}
      ${v.description
        ? html`<section class="prose vpage__desc" aria-labelledby="desc-title">
            <h2 class="section-title section-title--sm" id="desc-title">על הכלי</h2>
            ${paragraphs(v.description)}
          </section>`
        : ''}
    </div>
  </div>

  ${related.length
    ? html`<section class="section section--concrete">
        <div class="wrap">
          <div class="section-head">
            <h2 class="section-title">עוד ${cat ? cat.name : 'כלים'} במלאי</h2>
            <a class="link-arrow" href="/catalog${cat ? `?category=${cat.slug}` : ''}">לכולם ${icon('arrowEnd', { size: 18 })}</a>
          </div>
          <div class="vgrid">${related.map((r) => vehicleCard(r))}</div>
        </div>
      </section>`
    : ''}

  <dialog class="lightbox" data-lightbox aria-label="תמונות ${title}">
    <button class="lightbox__close" type="button" data-lightbox-close>${icon('close', { size: 26 })}<span class="sr-only">סגירה</span></button>
    <img class="lightbox__img" alt="" data-lightbox-img>
    ${images.length > 1
      ? html`<button class="lightbox__nav lightbox__nav--prev" type="button" data-lightbox-prev>${icon('chevronStart', { size: 30 })}<span class="sr-only">הקודמת</span></button>
        <button class="lightbox__nav lightbox__nav--next" type="button" data-lightbox-next>${icon('chevronEnd', { size: 30 })}<span class="sr-only">הבאה</span></button>`
      : ''}
  </dialog>
  <script type="application/json" data-gallery-data>${raw(JSON.stringify(images.map((i) => ({ lg: i.lg, alt: title }))).replace(/</g, '\\u003c'))}</script>`;

  return page({
    title,
    active: 'catalog',
    body,
    jsonLd,
    image: images[0] && images[0].lg,
    canonical: `/catalog/${v.slug}`,
    description: `${title} ${sold ? '(נמכר)' : 'למכירה'}${v.hours ? `, ${number(v.hours)} שעות עבודה` : ''}. ${business.fullName}, ${business.location}. ${business.phoneDisplay}`,
    bodyClass: 'page-vehicle',
  });
}

// ------------------------------------------------------------------ trade

function trade() {
  const body = html`
  ${pageHead({
    title: 'קנייה, מכירה וטרייד אין',
    intro: 'קונים כלי מהמלאי, מוכרים כלי שכבר לא צריך, או מחליפים אחד בשני.',
    crumbs: [{ label: 'קנייה, מכירה וטרייד אין' }],
  })}
  <section class="section">
    <div class="wrap trade">
      <div class="trade__options">
        <article class="trade-option">
          ${icon('cart', { size: 28 })}
          <h2>רוצים לקנות</h2>
          <p>עברו על המלאי ובחרו כלי, או ספרו ללירן איזה כלי אתם צריכים ולאיזו עבודה. אם הוא לא במגרש, לירן יאתר אותו.</p>
          <a class="link-arrow" href="/catalog">למלאי הכלים ${icon('arrowEnd', { size: 18 })}</a>
        </article>
        <article class="trade-option">
          ${icon('coins', { size: 28 })}
          <h2>רוצים למכור</h2>
          <p>לירן קונה טרקטורים, מעמיסים וציוד מכני. מלאו את הטופס עם יצרן, דגם, שנה ושעות עבודה, ושלחו תמונות ב-WhatsApp.</p>
          <a class="link-arrow" href="#form">לטופס ${icon('arrowEnd', { size: 18 })}</a>
        </article>
        <article class="trade-option">
          ${icon('swap', { size: 28 })}
          <h2>טרייד אין</h2>
          <p>מביאים את הכלי הנוכחי ומקבלים את שוויו כחלק מהתשלום על כלי אחר מהמלאי.</p>
          <a class="link-arrow" href="#trade-in">איך זה עובד ${icon('arrowEnd', { size: 18 })}</a>
        </article>
      </div>

      <section class="steps" id="trade-in" aria-labelledby="steps-title">
        <h2 class="section-title" id="steps-title">איך עובד טרייד אין</h2>
        <ol class="steps__list">
          <li><h3>שולחים פרטים</h3><p>יצרן, דגם, שנה, שעות עבודה ותמונות של הכלי שלכם.</p></li>
          <li><h3>מקבלים הערכה</h3><p>לירן בודק את הפרטים, ובמידת הצורך רואה את הכלי, ונותן הערכת שווי.</p></li>
          <li><h3>בוחרים כלי חדש</h3><p>בוחרים כלי מהמלאי, והשווי של הכלי שלכם יורד מהמחיר.</p></li>
          <li><h3>סוגרים ומחליפים</h3><p>חותמים, מעבירים בעלות ויוצאים לעבוד עם הכלי החדש.</p></li>
        </ol>
      </section>

      <section class="trade__form" id="form" aria-label="טופס קנייה, מכירה וטרייד אין">
        ${leadForm({ showType: true, heading: 'ספרו לנו מה אתם צריכים', submitLabel: 'שליחת פרטים', idPrefix: 'trade' })}
        <p class="trade__photos">${icon('whatsapp', { size: 18 })}רוצים לצרף תמונות של הכלי? <a href="${whatsappLink('היי לירן, אני רוצה למכור / להחליף כלי. מצרף תמונות:')}" target="_blank" rel="noopener">שלחו אותן ב-WhatsApp</a></p>
      </section>
    </div>
  </section>`;
  return page({
    title: 'קנייה, מכירה וטרייד אין',
    active: 'trade',
    body,
    canonical: '/trade',
    description: 'מוכרים טרקטור או מעמיס? רוצים טרייד אין? לירן אוזן קונה, מוכר ומחליף כלים חקלאיים וציוד מכני. 052-6003333',
  });
}

// ------------------------------------------------------------------ testimonials

function testimonialsPage({ testimonials }) {
  const body = html`
  ${pageHead({ title: 'המלצות', intro: 'מה אומרים לקוחות שקנו, מכרו והחליפו כלים אצל לירן.', crumbs: [{ label: 'המלצות' }] })}
  <section class="section">
    <div class="wrap">
      ${testimonials.length
        ? html`<div class="quotes quotes--page">${testimonials.map(quoteCard)}</div>`
        : html`<div class="empty">
            <p class="empty__title">ההמלצות יעלו לכאן בקרוב</p>
            <p>קניתם, מכרתם או החלפתם כלי אצל לירן? נשמח לשמוע איך היה.</p>
            <a class="btn btn--whatsapp" href="${whatsappLink('היי לירן, רציתי לכתוב המלצה:')}" target="_blank" rel="noopener">${icon('whatsapp')}שליחת המלצה</a>
          </div>`}
    </div>
  </section>
  ${contactBand()}`;
  return page({ title: 'המלצות', active: 'testimonials', body, canonical: '/testimonials' });
}

// ------------------------------------------------------------------ contact

function contact() {
  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(business.mapQuery)}&hl=he&z=13&output=embed`;
  const body = html`
  ${pageHead({ title: 'צור קשר', intro: 'הדרך הכי מהירה היא טלפון או WhatsApp. אפשר גם להשאיר פרטים ולירן יחזור אליכם.', crumbs: [{ label: 'צור קשר' }] })}
  <section class="section">
    <div class="wrap contact">
      <div class="contact__info">
        <a class="contact-card" href="tel:${business.phoneTel}">
          ${icon('phone', { size: 26 })}
          <span class="contact-card__label">טלפון</span>
          <span class="contact-card__value" dir="ltr">${business.phoneDisplay}</span>
        </a>
        <a class="contact-card" href="${whatsappLink('היי לירן, הגעתי מהאתר')}" target="_blank" rel="noopener">
          ${icon('whatsapp', { size: 26 })}
          <span class="contact-card__label">WhatsApp</span>
          <span class="contact-card__value" dir="ltr">${business.phoneDisplay}</span>
        </a>
        <div class="contact-card">
          ${icon('pin', { size: 26 })}
          <span class="contact-card__label">כתובת</span>
          <span class="contact-card__value">${business.location}</span>
          <a class="link-arrow" href="https://waze.com/ul?q=${encodeURIComponent(business.mapQuery)}" target="_blank" rel="noopener">ניווט ב-Waze ${icon('arrowEnd', { size: 16 })}</a>
        </div>
      </div>
      <div class="contact__form">${leadForm({ heading: 'השארת פרטים', idPrefix: 'contact' })}</div>
      <div class="contact__map">
        <iframe title="מפה: ${business.location}" src="${mapSrc}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
      </div>
    </div>
  </section>`;
  return page({ title: 'צור קשר', active: 'contact', body, canonical: '/contact' });
}

// ------------------------------------------------------------------ misc

function thanks() {
  const body = html`<section class="section"><div class="wrap empty">
    <p class="empty__title">הפרטים התקבלו</p>
    <p>לירן יחזור אליכם בהקדם. אם זה דחוף, אפשר להתקשר עכשיו.</p>
    ${contactButtons({ dark: false })}
  </div></section>`;
  return page({ title: 'הפרטים התקבלו', body });
}

function notFound() {
  const body = html`<section class="section"><div class="wrap empty">
    <p class="empty__title">העמוד לא נמצא</p>
    <p>ייתכן שהכלי כבר הוסר מהמלאי או שהקישור שגוי.</p>
    <div class="cta-row"><a class="btn btn--primary" href="/catalog">למלאי הכלים</a><a class="btn btn--outline" href="/">לדף הבית</a></div>
  </div></section>`;
  return page({ title: 'העמוד לא נמצא', body });
}

module.exports = { home, about, categoriesPage, catalog, vehicle, trade, testimonialsPage, contact, thanks, notFound };
