'use strict';

const { html, raw } = require('../lib/html');
const { business, whatsappLink, categories } = require('../lib/site');
const { icon } = require('./icons');

const NAV = [
  { href: '/', label: 'בית', key: 'home' },
  { href: '/catalog', label: 'מלאי כלים', key: 'catalog' },
  { href: '/categories', label: 'קטגוריות', key: 'categories' },
  { href: '/trade', label: 'קנייה, מכירה וטרייד אין', key: 'trade' },
  { href: '/about', label: 'אודות', key: 'about' },
  { href: '/testimonials', label: 'המלצות', key: 'testimonials' },
  { href: '/contact', label: 'צור קשר', key: 'contact' },
];

function header(active) {
  return html`
  <header class="site-header" data-header>
    <div class="wrap site-header__bar">
      <a class="brand" href="/" aria-label="${business.fullName} – לדף הבית">
        <img class="brand__mark" src="/img/logo-emblem-sm.webp" width="110" height="66" alt="">
        <span class="brand__text">
          <span class="brand__name">${business.name}</span>
          <span class="brand__tag">${business.tagline}</span>
        </span>
      </a>
      <nav class="main-nav" aria-label="ניווט ראשי">
        <ul>
          ${NAV.map(
            (n) => html`<li><a href="${n.href}" ${active === n.key ? raw('aria-current="page"') : ''}>${n.label}</a></li>`
          )}
        </ul>
      </nav>
      <div class="site-header__actions">
        <a class="header-phone" href="tel:${business.phoneTel}">
          ${icon('phone', { size: 18 })}<span dir="ltr">${business.phoneDisplay}</span>
        </a>
        <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-menu" data-menu-toggle>
          ${icon('menu', { size: 24 })}<span class="sr-only">פתיחת תפריט</span>
        </button>
      </div>
    </div>
    <div class="mobile-menu" id="mobile-menu" hidden data-menu>
      <nav aria-label="ניווט במובייל">
        <ul>
          ${NAV.map(
            (n) => html`<li><a href="${n.href}" ${active === n.key ? raw('aria-current="page"') : ''}>${n.label}</a></li>`
          )}
        </ul>
      </nav>
      <div class="mobile-menu__contact">
        <a class="btn btn--primary btn--block" href="tel:${business.phoneTel}">${icon('phone')}חיוג ל${business.name.split(' ')[0]}</a>
        <a class="btn btn--whatsapp btn--block" href="${whatsappLink()}" target="_blank" rel="noopener">${icon('whatsapp')}הודעה ב-WhatsApp</a>
      </div>
    </div>
  </header>`;
}

function footer() {
  const year = new Date().getFullYear();
  return html`
  <footer class="site-footer">
    <div class="wrap site-footer__grid">
      <div class="site-footer__brand">
        <img src="/img/logo-full.webp" width="220" height="202" alt="${business.fullName}" loading="lazy">
      </div>
      <div>
        <h2 class="footer-title">הכלים במלאי</h2>
        <ul class="footer-links">
          ${categories.map((c) => html`<li><a href="/catalog?category=${c.slug}">${c.name}</a></li>`)}
        </ul>
      </div>
      <div>
        <h2 class="footer-title">האתר</h2>
        <ul class="footer-links">
          ${NAV.slice(1).map((n) => html`<li><a href="${n.href}">${n.label}</a></li>`)}
        </ul>
      </div>
      <div>
        <h2 class="footer-title">דברו איתנו</h2>
        <ul class="footer-contact">
          <li><a href="tel:${business.phoneTel}">${icon('phone', { size: 18 })}<span dir="ltr">${business.phoneDisplay}</span></a></li>
          <li><a href="${whatsappLink()}" target="_blank" rel="noopener">${icon('whatsapp', { size: 18 })}WhatsApp</a></li>
          <li><span>${icon('pin', { size: 18 })}${business.location}</span></li>
        </ul>
      </div>
    </div>
    <div class="wrap site-footer__legal">
      <p>© ${year} ${business.fullName}</p>
    </div>
  </footer>`;
}

function floatingActions() {
  return html`
  <div class="float-actions">
    <a class="float-btn float-btn--whatsapp" href="${whatsappLink('היי לירן, הגעתי מהאתר ואשמח לפרטים')}" target="_blank" rel="noopener">
      ${icon('whatsapp', { size: 30 })}<span class="sr-only">שליחת הודעה ב-WhatsApp</span>
    </a>
  </div>`;
}

function localBusinessJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'AutoDealer',
    name: business.fullName,
    telephone: business.phoneTel,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'עולש',
      addressRegion: 'השרון',
      addressCountry: 'IL',
    },
    image: business.siteUrl ? `${business.siteUrl}/img/logo-full.webp` : undefined,
    url: business.siteUrl || undefined,
  };
}

function page({ title, description, active, body, jsonLd, image, canonical, bodyClass = '' }) {
  const fullTitle = title ? `${title} | ${business.fullName}` : business.fullName;
  const desc =
    description ||
    'קנייה, מכירה וטרייד אין של טרקטורים חקלאיים, מיני מעמיסים, בובקטים, שופלים וציוד מכני כבד. מושב עולש, השרון. 052-6003333';
  const ld = [localBusinessJsonLd(), ...(jsonLd ? [jsonLd] : [])];
  const ogImage = image || '/img/logo-full.webp';
  const abs = (p) => (business.siteUrl && p.startsWith('/') ? business.siteUrl + p : p);
  return html`<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${fullTitle}</title>
  <meta name="description" content="${desc}">
  <meta name="theme-color" content="#000000">
  ${canonical && business.siteUrl ? html`<link rel="canonical" href="${business.siteUrl + canonical}">` : ''}
  <meta property="og:type" content="website">
  <meta property="og:locale" content="he_IL">
  <meta property="og:title" content="${fullTitle}">
  <meta property="og:description" content="${desc}">
  <meta property="og:image" content="${abs(ogImage)}">
  <link rel="icon" href="/img/favicon.png" type="image/png">
  <link rel="apple-touch-icon" href="/img/apple-touch-icon.png">
  <link rel="preload" href="/fonts/karantina-hebrew-700-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/ibm-plex-sans-hebrew-hebrew-400-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/css/site.css?v=${raw(ASSET_VERSION)}">
  <script type="application/ld+json">${raw(JSON.stringify(ld).replace(/</g, '\\u003c'))}</script>
</head>
<body class="${bodyClass}">
  <a class="skip-link" href="#main">דילוג לתוכן</a>
  ${header(active)}
  <main id="main" tabindex="-1">
    ${body}
  </main>
  ${footer()}
  ${floatingActions()}
  <script src="/js/site.js?v=${raw(ASSET_VERSION)}" defer></script>
</body>
</html>`;
}

const ASSET_VERSION = String(Date.now());

module.exports = { page };
