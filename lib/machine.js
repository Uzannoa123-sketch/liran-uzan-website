'use strict';
// Reads Liran Uzan's listings on machine.co.il: the list of ads, each ad's
// details, and its photos. Used by the automatic sync (lib/sync.js) and by
// scripts/import-machine.js, which builds the initial inventory in seed/.

const sharp = require('sharp');
const path = require('path');

const BASE = 'https://www.machine.co.il';
const USER_ID = process.env.MACHINE_USER_ID || '18783';

const decode = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#039;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&');

const text = (h) =>
  decode(h.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''))
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

async function get(url, as = 'text') {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (liran-uzan-website inventory sync)' },
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return as === 'buffer' ? Buffer.from(await res.arrayBuffer()) : res.text();
    } catch (err) {
      if (attempt >= 3) throw err;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
}

// All ad ids on the seller's page, newest first. Throws if the page could
// not be read, so callers never mistake an outage for "no ads".
async function listAdIds(userId = USER_ID) {
  const ids = new Set();
  for (let page = 1; page < 30; page++) {
    const html = await get(`${BASE}/ads?userid=${userId}${page > 1 ? `&page=${page}` : ''}`);
    if (page === 1 && !/machine/i.test(html)) throw new Error('Unexpected response from machine.co.il');
    const before = ids.size;
    for (const m of html.matchAll(/adpage\?adid=(\d+)/g)) ids.add(m[1]);
    if (ids.size === before) break;
  }
  return [...ids].sort((a, b) => Number(b) - Number(a));
}

const CATEGORY_MAP = [
  [/מיני מעמיס|בובקט|יעה אופני זעיר/, 'mini-loaders'],
  [/שופל|יעה אופני(?! זעיר)/, 'wheel-loaders'],
  [/מחפר|מחפרון|ציוד מכני הנדסי/, 'heavy-equipment'],
  [/טרקטור/, 'tractors'],
  [/ציוד חקלאי|שונות/, 'attachments'],
];

// Lines that repeat the business's own boilerplate in every ad.
const BOILERPLATE = /לירן אוזן|אולם תצוגה|קנייה|מכירה|החלפה|טרייד|איכות ושירות|מחכים לכם|^שנת \d{4}$/;

function parseAd(id, html) {
  const rows = {};
  for (const m of html.matchAll(/<td>\s*([^<]{1,40}?):?\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/g)) {
    rows[m[1].trim().replace(/:$/, '')] = text(m[2]);
  }
  const lines = text(html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ''));
  const home = lines.indexOf('ראשי');
  if (home === -1) throw new Error(`Ad ${id}: page layout not recognised`);
  const crumbs = lines.slice(home + 1, home + 4);
  const model = lines[home + 6] || '';
  const images = [];
  for (const m of html.matchAll(/resize3\.ashx\?path=(\/Sites\/machine\/UserContent\/users_images\/[^&"]+)/g)) {
    if (!images.includes(m[1])) images.push(m[1]);
  }

  const one = (k) => (rows[k] ? rows[k].join(' ') : '');
  const [makeEn, makeHe] = one('יצרן').split(/\s+-\s+/).map((s) => (s || '').replace(/\s+/g, ' ').trim());
  const descLines = rows['תיאור'] || [];
  let year = (one('שנה').match(/\d{4}/) || [])[0] || '';
  if (!year) year = (descLines.join(' ').match(/שנת (\d{4})/) || [])[1] || '';

  const crumbText = crumbs.slice(1).join(' '); // sub-category, not the top-level section
  const category = (CATEGORY_MAP.find(([re]) => re.test(crumbText)) || [, 'heavy-equipment'])[1];
  const hp = (crumbs[2] || '').match(/(\d+)-(\d+) כוח סוס/);
  const hpMax = (crumbs[2] || '').match(/עד (\d+) כוח סוס/);

  const specs = {};
  if (hp) specs.horsepower = `${hp[2]}–${hp[1]} כ"ס`;
  else if (hpMax) specs.horsepower = `עד ${hpMax[1]} כ"ס`;
  if (one('הנעה')) specs.drive = one('הנעה').toLowerCase();
  const extraSpecs = [];
  if (one('מצב מכונה')) extraSpecs.push({ label: 'מצב הכלי', value: one('מצב מכונה') });
  if (one('יד')) extraSpecs.push({ label: 'יד', value: one('יד') });
  if (one('מזגן') === 'כן') extraSpecs.push({ label: 'מזגן', value: 'יש' });
  if (one('באחריות יבואן/יצרן') === 'כן') extraSpecs.push({ label: 'אחריות יבואן', value: 'כן' });

  const priceDigits = one('מחיר').replace(/[^\d]/g, '');
  const isAttachment = category === 'attachments';

  return {
    source: { site: 'machine.co.il', adid: id },
    category,
    make: isAttachment && !makeEn ? '' : makeEn,
    makeHe: makeHe || '',
    model: isAttachment && model === 'שונות' ? '' : model,
    title: isAttachment ? (descLines[0] || 'ציוד נלווה').split(/ ריתום| מופעל/)[0].trim() + ' לטרקטור' : '',
    year,
    hours: one('שעות עבודה').replace(/\D/g, ''),
    price: priceDigits.length >= 3 ? priceDigits : '',
    status: 'available',
    specs,
    extraSpecs,
    description: descLines.filter((l) => !BOILERPLATE.test(l)).join('\n'),
    remoteImages: images,
  };
}

async function fetchAd(id) {
  return parseAd(id, await get(`${BASE}/adpage?adid=${id}`));
}

// Downloads one photo, trims black/white bars around screenshots and saves
// two WebP sizes into dir. Returns the image record the site stores.
async function saveImage(remotePath, key, dir) {
  const buf = await get(BASE + remotePath, 'buffer');
  let img = sharp(buf).rotate().flatten({ background: '#000' });
  try {
    const trimmed = await img.clone().trim({ threshold: 20 }).toBuffer({ resolveWithObject: true });
    if (trimmed.info.width > 200 && trimmed.info.height > 200) img = sharp(trimmed.data);
  } catch {
    /* nothing to trim */
  }
  const out = { key };
  for (const [size, width, q] of [['lg', 1800, 84], ['sm', 720, 78]]) {
    const name = `${key}-${size}.webp`;
    const info = await img.clone().resize({ width, withoutEnlargement: true }).webp({ quality: q }).toFile(path.join(dir, name));
    out[size] = `/uploads/${name}`;
    if (size === 'lg') Object.assign(out, { w: info.width, h: info.height });
  }
  return out;
}

function slugFor(ad, id) {
  const base = [ad.make || ad.title, ad.model, ad.year].filter(Boolean).join(' ');
  return `${base}`.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') + `-${id}`;
}

// Fetches an ad and its photos and returns a complete vehicle record.
async function buildVehicle(id, imageDir) {
  const ad = await fetchAd(id);
  const images = [];
  for (const [n, remote] of ad.remoteImages.entries()) images.push(await saveImage(remote, `m${id}-${n + 1}`, imageDir));
  delete ad.remoteImages;
  const now = new Date().toISOString();
  return { id: `m${id}`, slug: slugFor(ad, id), ...ad, images, createdAt: now, updatedAt: now };
}

module.exports = { listAdIds, fetchAd, buildVehicle, BASE, USER_ID };
