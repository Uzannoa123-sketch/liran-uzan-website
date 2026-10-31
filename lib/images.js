'use strict';
// Converts uploaded photos to two WebP sizes: a large one for galleries and
// a small one for cards. Originals are not kept.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const SIZES = { lg: 1800, sm: 720 };

async function processImage(buffer) {
  const key = crypto.randomBytes(8).toString('hex');
  const base = sharp(buffer, { failOn: 'error' }).rotate(); // honour EXIF orientation
  const meta = await base.metadata();
  const out = { key };
  for (const [size, width] of Object.entries(SIZES)) {
    const name = `${key}-${size}.webp`;
    const info = await base
      .clone()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: size === 'lg' ? 82 : 78 })
      .toFile(path.join(UPLOAD_DIR, name));
    out[size] = `/uploads/${name}`;
    if (size === 'lg') {
      out.w = info.width;
      out.h = info.height;
    }
  }
  if (!out.w && meta.width) {
    out.w = meta.width;
    out.h = meta.height;
  }
  return out;
}

function removeImage(img) {
  if (!img) return;
  for (const size of Object.keys(SIZES)) {
    if (!img[size]) continue;
    const file = path.join(UPLOAD_DIR, path.basename(img[size]));
    fs.rm(file, { force: true }, () => {});
  }
}

module.exports = { processImage, removeImage, UPLOAD_DIR };
