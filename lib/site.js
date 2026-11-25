'use strict';
// Business details and fixed taxonomy. Edit here to change contact details
// across the whole site.

const business = {
  name: 'לירן אוזן',
  tagline: 'טרקטורים ומעמיסים חקלאיים',
  fullName: 'לירן אוזן – טרקטורים ומעמיסים חקלאיים',
  phoneDisplay: '054-9825525',
  phoneTel: '+972549825525',
  whatsapp: '972549825525',
  location: 'מושב עולש, אזור השרון',
  mapQuery: 'עולש',
  siteUrl: process.env.SITE_URL || '',
};

const categories = [
  {
    slug: 'tractors',
    name: 'טרקטורים חקלאיים',
    short: 'טרקטורים',
    blurb: 'טרקטורים לעיבוד, ריסוס וגרירה, ממשקים קטנים ועד גידולי שדה.',
  },
  {
    slug: 'mini-loaders',
    name: 'מיני מעמיסים',
    short: 'מיני מעמיסים',
    blurb: 'מעמיסים קומפקטיים לרפתות, לולים ומשקים, שנכנסים לכל מקום.',
  },
  {
    slug: 'bobcats',
    name: 'בובקטים',
    short: 'בובקטים',
    blurb: 'מעמיסי החלקה לעבודות עפר, ניקיון שטחים ותשתיות.',
  },
  {
    slug: 'wheel-loaders',
    name: 'שופלים',
    short: 'שופלים',
    blurb: 'מעמיסי גלגלים להעמסה, הזזת חומר ועבודה רציפה בשטח.',
  },
  {
    slug: 'heavy-equipment',
    name: 'ציוד מכני כבד',
    short: 'ציוד כבד',
    blurb: 'מחפרים, מחפרונים וכלים נוספים לעבודות תשתית ובנייה.',
  },
  {
    slug: 'forklifts',
    name: 'מלגזות',
    short: 'מלגזות',
    blurb: 'מלגזות להרמה, העמסה ושינוע במחסן, בחצר ובשטח.',
  },
  {
    slug: 'trailers',
    name: 'נגררים',
    short: 'נגררים',
    blurb: 'נגררים ועגלות להובלת ציוד, כלים ותוצרת.',
  },
  {
    slug: 'offroad',
    name: 'טרקטורונים ורכבי שטח',
    short: 'רכבי שטח',
    blurb: 'טרקטורונים, RZR, ריינג\'רים, רכבים תפעוליים ואופנועים, לעבודה במשק ולשטח.',
    subtypes: [
      { slug: 'atv', name: 'טרקטורונים' },
      { slug: 'rzr', name: 'RZR ובאגי' },
      { slug: 'ranger', name: 'ריינג\'רים' },
      { slug: 'utility', name: 'רכבים תפעוליים' },
      { slug: 'motorcycle', name: 'אופנועים' },
    ],
  },
  {
    slug: 'attachments',
    name: 'ציוד נלווה לטרקטור',
    short: 'ציוד נלווה',
    blurb: 'זרועות חפירה, כפות ואביזרים שמתחברים לטרקטור ומרחיבים את מה שהוא יודע לעשות.',
  },
];

const categoryBySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));

// Label of a vehicle's sub-type (e.g. "RZR ובאגי"), or '' when it has none.
function subtypeName(categorySlug, subtypeSlug) {
  const c = categoryBySlug[categorySlug];
  const st = c && c.subtypes && c.subtypes.find((x) => x.slug === subtypeSlug);
  return st ? st.name : '';
}

const statuses = {
  available: 'זמין',
  reserved: 'בתהליך מכירה',
  sold: 'נמכר',
  hidden: 'מוסתר מהאתר',
};

// Spec fields shown on every vehicle page (in this order). Free-form extra
// specs can be added per vehicle in the admin.
const specFields = [
  { key: 'horsepower', label: 'כוח סוס' },
  { key: 'drive', label: 'הנעה' },
  { key: 'transmission', label: 'תיבת הילוכים' },
  { key: 'weight', label: 'משקל עצמי' },
  { key: 'liftCapacity', label: 'כושר הרמה' },
  { key: 'cabin', label: 'תא נהג' },
  { key: 'tires', label: 'מצב צמיגים' },
  { key: 'attachments', label: 'אביזרים כלולים' },
];

function whatsappLink(text) {
  const base = `https://wa.me/${business.whatsapp}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

module.exports = { business, categories, categoryBySlug, subtypeName, statuses, specFields, whatsappLink };
