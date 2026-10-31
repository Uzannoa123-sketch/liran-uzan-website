'use strict';
// Business details and fixed taxonomy. Edit here to change contact details
// across the whole site.

const business = {
  name: 'לירן אוזן',
  tagline: 'טרקטורים ומעמיסים חקלאיים',
  fullName: 'לירן אוזן – טרקטורים ומעמיסים חקלאיים',
  phoneDisplay: '052-6003333',
  phoneTel: '+972526003333',
  whatsapp: '972526003333',
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
];

const categoryBySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));

const statuses = {
  available: 'זמין',
  reserved: 'בתהליך מכירה',
  sold: 'נמכר',
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

module.exports = { business, categories, categoryBySlug, statuses, specFields, whatsappLink };
