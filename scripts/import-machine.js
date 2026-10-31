#!/usr/bin/env node
'use strict';
// Imports Liran Uzan's listings from machine.co.il into seed/ so the site
// starts with the real inventory. Run:  node scripts/import-machine.js
//
// Writes seed/vehicles.json and seed/images/*.webp. On first start the
// server copies the seed into DATA_DIR / UPLOAD_DIR (see lib/store.js).
// Re-running replaces the seed; it never touches live data.

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const USER_ID = process.env.MACHINE_USER_ID || '18783';
const BASE = 'https://www.machine.co.il';
const SEED = path.join(__dirname, '..', 'seed');
const IMG_DIR = path.join(SEED, 'images');

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
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (site import)' } });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return as === 'buffer' ? Buffer.from(await res.arrayBuffer()) : res.text();
    } catch (err) {
      if (attempt >= 3) throw err;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

async function listAdIds() {
  const ids = new Set();
  for (let page = 1; page < 20; page++) {
    const html = await get(`${BASE}/ads?userid=${USER_ID}${page > 1 ? `&page=${page}` : ''}`);
    const found = [...html.matchAll(/adpage\?adid=(\d+)/g)].map((m) => m[1]);
    const before = ids.size;
    found.forEach((id) => ids.add(id));
    if (ids.size === before) break;
  }
  return [...ids].sort((a, b) => Number(b) - Number(a)); // newest first
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
  if (!year) year = ((descLines.join(' ').match(/שנת (\d{4})/) || [])[1]) || '';

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

  const description = descLines.filter((l) => !BOILERPLATE.test(l)).join('\n');
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
    price: '',
    status: 'available',
    specs,
    extraSpecs,
    description,
    remoteImages: images,
  };
}

async function saveImage(remotePath, key) {
  const buf = await get(BASE + remotePath, 'buffer');
  // trim() removes solid black/white bars around screenshots.
  let img = sharp(buf).rotate().flatten({ background: '#000' });
  try {
    const trimmed = await img.clone().trim({ threshold: 20 }).toBuffer({ resolveWithObject: true });
    if (trimmed.info.width > 200 && trimmed.info.height > 200) img = sharp(trimmed.data);
  } catch {
    /* image had nothing to trim */
  }
  const out = { key };
  for (const [size, width, q] of [['lg', 1800, 84], ['sm', 720, 78]]) {
    const name = `${key}-${size}.webp`;
    const info = await img.clone().resize({ width, withoutEnlargement: true }).webp({ quality: q }).toFile(path.join(IMG_DIR, name));
    out[size] = `/uploads/${name}`;
    if (size === 'lg') Object.assign(out, { w: info.width, h: info.height });
  }
  return out;
}

(async () => {
  fs.rmSync(SEED, { recursive: true, force: true });
  fs.mkdirSync(IMG_DIR, { recursive: true });
  const ids = await listAdIds();
  console.log(`Found ${ids.length} ads`);
  const vehicles = [];
  const now = Date.now();
  for (const [i, id] of ids.entries()) {
    const ad = parseAd(id, await get(`${BASE}/adpage?adid=${id}`));
    const images = [];
    for (const [n, remote] of ad.remoteImages.entries()) images.push(await saveImage(remote, `m${id}-${n + 1}`));
    delete ad.remoteImages;
    const slugBase = [ad.make || ad.title, ad.model, ad.year].filter(Boolean).join(' ');
    const slug = `${slugBase}`.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') + `-${id}`;
    const ts = new Date(now - i * 60000).toISOString();
    vehicles.push({ id: `m${id}`, slug, ...ad, images, createdAt: ts, updatedAt: ts });
    console.log(`  ${id}  ${ad.category.padEnd(15)} ${[ad.make, ad.model, ad.year].join(' ')}  (${images.length} images)`);
  }
  fs.writeFileSync(path.join(SEED, 'vehicles.json'), JSON.stringify(vehicles, null, 2));
  console.log(`Wrote ${vehicles.length} vehicles to seed/`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
