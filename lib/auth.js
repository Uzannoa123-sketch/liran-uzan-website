'use strict';
// Single-admin login. The password comes from ADMIN_PASSWORD; the session is
// an HMAC-signed cookie, so no session storage is needed.

const crypto = require('crypto');

const COOKIE = 'lu_admin';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

const SECRET =
  process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update(`lu:${process.env.ADMIN_PASSWORD || ''}`).digest('hex');

function sign(value) {
  return crypto.createHmac('sha256', SECRET).update(value).digest('base64url');
}

function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function isAuthed(req) {
  const raw = parseCookies(req.headers.cookie)[COOKIE];
  if (!raw) return false;
  const [expires, sig] = raw.split('.');
  if (!expires || !sig || !safeEqual(sig, sign(expires))) return false;
  return Number(expires) > Date.now();
}

function cookieFlags(req) {
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  return `Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
}

function login(req, res, password) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !safeEqual(password || '', expected)) return false;
  const expires = String(Date.now() + MAX_AGE_MS);
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${expires}.${sign(expires)}; Max-Age=${MAX_AGE_MS / 1000}; ${cookieFlags(req)}`
  );
  return true;
}

function logout(req, res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Max-Age=0; ${cookieFlags(req)}`);
}

// Very small in-memory throttle for the login form.
const attempts = new Map();
function tooManyAttempts(ip) {
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter((t) => now - t < 15 * 60 * 1000);
  attempts.set(ip, recent);
  return recent.length >= 10;
}
function recordFailure(ip) {
  attempts.set(ip, [...(attempts.get(ip) || []), Date.now()]);
}

function requireAdmin(req, res, next) {
  if (isAuthed(req)) return next();
  res.redirect(`/admin/login?next=${encodeURIComponent(req.originalUrl)}`);
}

// CSRF token derived from the session cookie: forms in the admin carry it,
// and every admin POST checks it.
function csrfToken(req) {
  const raw = parseCookies(req.headers.cookie)[COOKIE] || '';
  return sign(`csrf:${raw}`).slice(0, 32);
}

function checkCsrf(req, res, next) {
  const token = (req.body && req.body._csrf) || req.query._csrf || req.headers['x-csrf-token'];
  if (token && safeEqual(token, csrfToken(req))) return next();
  res.status(403).send('הטופס פג תוקף. רעננו את העמוד ונסו שוב.');
}

module.exports = { isAuthed, login, logout, requireAdmin, tooManyAttempts, recordFailure, csrfToken, checkCsrf };
