'use strict';
// Small JSON-file store. Each collection lives in data/<name>.json and is
// written atomically (write to temp file, then rename) so a crash mid-write
// never leaves a half-written file behind.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const cache = new Map();

function file(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function read(name, fallback) {
  if (cache.has(name)) return cache.get(name);
  let value = fallback;
  try {
    value = JSON.parse(fs.readFileSync(file(name), 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  cache.set(name, value);
  return value;
}

function write(name, value) {
  const target = file(name);
  const tmp = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, target);
  cache.set(name, value);
}

function id() {
  return crypto.randomBytes(6).toString('hex');
}

// ---------- vehicles ----------

function vehicles() {
  return read('vehicles', []);
}

function saveVehicles(list) {
  write('vehicles', list);
}

function getVehicle(vid) {
  return vehicles().find((v) => v.id === vid);
}

function getVehicleBySlug(slug) {
  return vehicles().find((v) => v.slug === slug);
}

function slugify(text, taken) {
  const base =
    String(text)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'item';
  let slug = base;
  let n = 2;
  while (taken.has(slug)) slug = `${base}-${n++}`;
  return slug;
}

function upsertVehicle(data) {
  const list = vehicles().slice();
  const now = new Date().toISOString();
  if (data.id) {
    const i = list.findIndex((v) => v.id === data.id);
    if (i === -1) return null;
    list[i] = { ...list[i], ...data, updatedAt: now };
    saveVehicles(list);
    return list[i];
  }
  const taken = new Set(list.map((v) => v.slug));
  const vehicle = {
    id: id(),
    slug: slugify(`${data.make || ''} ${data.model || ''} ${data.year || ''}`, taken),
    images: [],
    status: 'available',
    createdAt: now,
    updatedAt: now,
    ...data,
  };
  list.unshift(vehicle);
  saveVehicles(list);
  return vehicle;
}

function deleteVehicle(vid) {
  const list = vehicles();
  const vehicle = list.find((v) => v.id === vid);
  saveVehicles(list.filter((v) => v.id !== vid));
  return vehicle;
}

// ---------- leads ----------

function leads() {
  return read('leads', []);
}

function addLead(lead) {
  const list = leads().slice();
  const entry = { id: id(), createdAt: new Date().toISOString(), handled: false, ...lead };
  list.unshift(entry);
  write('leads', list.slice(0, 2000));
  return entry;
}

function updateLead(lid, patch) {
  const list = leads().map((l) => (l.id === lid ? { ...l, ...patch } : l));
  write('leads', list);
}

function deleteLead(lid) {
  write('leads', leads().filter((l) => l.id !== lid));
}

// ---------- testimonials ----------

function testimonials() {
  return read('testimonials', []);
}

function saveTestimonial(t) {
  const list = testimonials().slice();
  if (t.id) {
    const i = list.findIndex((x) => x.id === t.id);
    if (i !== -1) list[i] = { ...list[i], ...t };
  } else {
    list.push({ id: id(), createdAt: new Date().toISOString(), ...t });
  }
  write('testimonials', list);
}

function deleteTestimonial(tid) {
  write('testimonials', testimonials().filter((t) => t.id !== tid));
}

// ---------- settings ----------

const DEFAULT_SETTINGS = {
  heroImage: '',
  aboutImage: '',
};

function settings() {
  return { ...DEFAULT_SETTINGS, ...read('settings', {}) };
}

function saveSettings(patch) {
  write('settings', { ...settings(), ...patch });
}

module.exports = {
  vehicles,
  getVehicle,
  getVehicleBySlug,
  upsertVehicle,
  deleteVehicle,
  leads,
  addLead,
  updateLead,
  deleteLead,
  testimonials,
  saveTestimonial,
  deleteTestimonial,
  settings,
  saveSettings,
};
