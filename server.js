'use strict';

const path = require('path');
const express = require('express');
const multer = require('multer');

const store = require('./lib/store');
const auth = require('./lib/auth');
const { processImage, removeImage, UPLOAD_DIR } = require('./lib/images');
const { business, categories, categoryBySlug, statuses, specFields } = require('./lib/site');
const pages = require('./views/pages');
const admin = require('./views/admin');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

app.use(express.urlencoded({ extended: false, limit: '200kb' }));
app.use(express.json({ limit: '50kb' }));

const staticOpts = { maxAge: '7d' };
app.use(express.static(path.join(__dirname, 'public'), staticOpts));
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '30d', immutable: true }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 30 },
  fileFilter: (req, file, cb) => cb(null, /^image\//.test(file.mimetype)),
});

const send = (res, markup, status = 200) => res.status(status).type('html').send(String(markup));

// ------------------------------------------------------------------ helpers

function publicVehicles() {
  return store.vehicles().filter((v) => !v.hidden);
}

function categoryCounts(list) {
  const counts = {};
  for (const v of list) if (v.status !== 'sold') counts[v.category] = (counts[v.category] || 0) + 1;
  return counts;
}

const uniqSorted = (arr) => [...new Set(arr.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'he'));

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[׳'"`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickFilters(q) {
  const f = {};
  for (const k of ['category', 'make', 'model', 'yearFrom', 'yearTo', 'q', 'sort']) {
    if (typeof q[k] === 'string' && q[k].trim()) f[k] = q[k].trim().slice(0, 80);
  }
  if (q.sold === '1') f.sold = '1';
  if (f.category && !categoryBySlug[f.category]) delete f.category;
  return f;
}

function applyFilters(list, f) {
  let out = list.filter((v) => (f.sold ? true : v.status !== 'sold'));
  if (f.category) out = out.filter((v) => v.category === f.category);
  if (f.make) out = out.filter((v) => norm(v.make) === norm(f.make));
  if (f.model) out = out.filter((v) => norm(v.model) === norm(f.model));
  if (f.yearFrom) out = out.filter((v) => Number(v.year) >= Number(f.yearFrom));
  if (f.yearTo) out = out.filter((v) => Number(v.year) <= Number(f.yearTo));
  if (f.q) {
    const terms = norm(f.q).split(' ');
    out = out.filter((v) => {
      const hay = norm(
        [v.title, v.make, v.makeHe, v.model, v.year, v.description, categoryBySlug[v.category] && categoryBySlug[v.category].name, ...Object.values(v.specs || {})].join(' ')
      );
      return terms.every((t) => hay.includes(t));
    });
  }
  const num = (x, dflt) => (x === '' || x === undefined || x === null || isNaN(Number(x)) ? dflt : Number(x));
  const sorters = {
    'year-desc': (a, b) => num(b.year, 0) - num(a.year, 0),
    'year-asc': (a, b) => num(a.year, 9999) - num(b.year, 9999),
    'price-asc': (a, b) => num(a.price, Infinity) - num(b.price, Infinity),
    'price-desc': (a, b) => num(b.price, -1) - num(a.price, -1),
    'hours-asc': (a, b) => num(a.hours, Infinity) - num(b.hours, Infinity),
  };
  if (sorters[f.sort]) out = out.slice().sort(sorters[f.sort]);
  // Sold vehicles always go last.
  return out.slice().sort((a, b) => (a.status === 'sold') - (b.status === 'sold'));
}

// ------------------------------------------------------------------ public routes

app.get('/', (req, res) => {
  const vehicles = publicVehicles();
  send(res, pages.home({ vehicles, testimonials: store.testimonials(), settings: store.settings(), counts: categoryCounts(vehicles) }));
});

app.get('/about', (req, res) => send(res, pages.about({ settings: store.settings() })));

app.get('/categories', (req, res) => {
  const vehicles = publicVehicles();
  const covers = {};
  for (const v of vehicles) if (!covers[v.category] && v.status !== 'sold' && v.images && v.images[0]) covers[v.category] = v.images[0];
  send(res, pages.categoriesPage({ counts: categoryCounts(vehicles), covers }));
});

app.get('/catalog', (req, res) => {
  const all = publicVehicles();
  const filters = pickFilters(req.query);
  const scope = all.filter((v) => (filters.sold ? true : v.status !== 'sold'));
  const inCat = filters.category ? scope.filter((v) => v.category === filters.category) : scope;
  const options = {
    makes: uniqSorted(inCat.map((v) => v.make)),
    models: filters.make ? uniqSorted(inCat.filter((v) => norm(v.make) === norm(filters.make)).map((v) => v.model)) : [],
    years: uniqSorted(scope.map((v) => v.year)).sort((a, b) => b - a),
  };
  const results = applyFilters(all, filters);
  send(res, pages.catalog({ results, filters, options, total: scope.length }));
});

app.get('/catalog/:slug', (req, res, next) => {
  const v = store.getVehicleBySlug(req.params.slug);
  if (!v || v.hidden) return next();
  const related = publicVehicles()
    .filter((r) => r.id !== v.id && r.category === v.category && r.status !== 'sold')
    .slice(0, 3);
  send(res, pages.vehicle({ v, related }));
});

app.get('/trade', (req, res) => send(res, pages.trade()));
app.get('/testimonials', (req, res) => send(res, pages.testimonialsPage({ testimonials: store.testimonials() })));
app.get('/contact', (req, res) => send(res, pages.contact()));
app.get('/thanks', (req, res) => send(res, pages.thanks()));

// Lead submissions: JSON (from site.js) or a regular form post.
const leadHits = new Map();
app.post('/api/leads', (req, res) => {
  const wantsJson = (req.headers.accept || '').includes('application/json');
  const b = req.body || {};
  const fail = (status, error, fields) =>
    wantsJson ? res.status(status).json({ ok: false, error, fields }) : res.status(status).type('text').send(error);

  if (b.website) return wantsJson ? res.json({ ok: true }) : res.redirect(303, '/thanks'); // honeypot

  const ip = req.ip;
  const now = Date.now();
  const hits = (leadHits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (hits.length >= 8) return fail(429, 'נשלחו יותר מדי פניות. נסו שוב בעוד כמה דקות, או התקשרו.');
  leadHits.set(ip, [...hits, now]);

  const clean = (s, n = 300) => String(s || '').trim().slice(0, n);
  const lead = {
    type: ['contact', 'quote', 'buy', 'sell', 'trade'].includes(b.type) ? b.type : 'contact',
    name: clean(b.name, 80),
    phone: clean(b.phone, 30),
    message: clean(b.message, 2000),
    machine: clean(b.machine, 120),
    machineYear: clean(b.machineYear, 10),
    machineHours: clean(b.machineHours, 12),
    vehicleId: clean(b.vehicleId, 20),
  };
  const fields = {};
  if (lead.name.length < 2) fields.name = 'כתבו את השם שלכם.';
  const digits = lead.phone.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 13) fields.phone = 'מספר הטלפון צריך לכלול 9–10 ספרות, למשל 050-1234567.';
  if (Object.keys(fields).length) return fail(400, 'יש לתקן את השדות המסומנים.', fields);

  if (lead.vehicleId && !store.getVehicle(lead.vehicleId)) lead.vehicleId = '';
  store.addLead(lead);
  console.log(`[lead] ${lead.type} from ${lead.name}`);
  return wantsJson ? res.json({ ok: true }) : res.redirect(303, '/thanks');
});

app.get('/healthz', (req, res) => res.type('text').send('ok'));

app.get('/robots.txt', (req, res) => {
  res.type('text').send(`User-agent: *\nDisallow: /admin\n${business.siteUrl ? `Sitemap: ${business.siteUrl}/sitemap.xml\n` : ''}`);
});

app.get('/sitemap.xml', (req, res) => {
  const base = business.siteUrl || `${req.protocol}://${req.get('host')}`;
  const urls = ['/', '/catalog', '/categories', '/trade', '/about', '/testimonials', '/contact']
    .concat(categories.map((c) => `/catalog?category=${c.slug}`))
    .concat(publicVehicles().map((v) => `/catalog/${encodeURIComponent(v.slug)}`));
  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls
      .map((u) => `<url><loc>${base}${u.replace(/&/g, '&amp;')}</loc></url>`)
      .join('')}</urlset>`
  );
});

// ------------------------------------------------------------------ admin

const adminRouter = express.Router();
const openLeads = () => store.leads().filter((l) => !l.handled).length;
const flashFrom = (req) =>
  ({ saved: 'השינויים נשמרו', created: 'הכלי נוסף', deleted: 'נמחק', status: 'המצב עודכן', uploaded: 'התמונה הועלתה' })[req.query.ok];

adminRouter.get('/login', (req, res) => {
  if (auth.isAuthed(req)) return res.redirect('/admin');
  send(res, admin.login({ next: req.query.next, configured: Boolean(process.env.ADMIN_PASSWORD) }));
});

adminRouter.post('/login', (req, res) => {
  const next = typeof req.body.next === 'string' && req.body.next.startsWith('/admin') ? req.body.next : '/admin';
  if (auth.tooManyAttempts(req.ip)) {
    return send(res, admin.login({ error: 'יותר מדי ניסיונות. נסו שוב בעוד רבע שעה.', next, configured: true }), 429);
  }
  if (auth.login(req, res, req.body.password)) return res.redirect(303, next);
  auth.recordFailure(req.ip);
  send(res, admin.login({ error: 'הסיסמה שגויה. נסו שוב.', next, configured: Boolean(process.env.ADMIN_PASSWORD) }), 401);
});

adminRouter.use(auth.requireAdmin);
adminRouter.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.locals.csrf = auth.csrfToken(req);
  next();
});

// multipart bodies are parsed by multer before the CSRF check runs
const withUpload = (field) => (req, res, next) =>
  upload.array(field, 30)(req, res, (err) => {
    if (err) return res.status(400).send(err.code === 'LIMIT_FILE_SIZE' ? 'אחת התמונות גדולה מ-15MB.' : 'העלאת הקבצים נכשלה.');
    next();
  });

adminRouter.post('/logout', auth.checkCsrf, (req, res) => {
  auth.logout(req, res);
  res.redirect(303, '/admin/login');
});

adminRouter.get('/', (req, res) =>
  send(res, admin.dashboard({ vehicles: store.vehicles(), leads: store.leads(), csrf: res.locals.csrf, flash: flashFrom(req) }))
);

adminRouter.get('/vehicles', (req, res) =>
  send(
    res,
    admin.vehiclesList({
      vehicles: store.vehicles(),
      filter: statuses[req.query.status] ? req.query.status : '',
      csrf: res.locals.csrf,
      flash: flashFrom(req),
      newLeads: openLeads(),
    })
  )
);

adminRouter.get('/vehicles/new', (req, res) =>
  send(res, admin.vehicleForm({ v: {}, csrf: res.locals.csrf, newLeads: openLeads() }))
);

function vehicleFromBody(b) {
  const digits = (s, max) => String(s || '').replace(/[^\d]/g, '').slice(0, max);
  const specs = {};
  for (const f of specFields) {
    const val = String(b[`spec_${f.key}`] || '').trim().slice(0, 200);
    if (val) specs[f.key] = val;
  }
  const extraSpecs = String(b.extraSpecs || '')
    .split('\n')
    .map((line) => {
      const i = line.indexOf(':');
      return i > 0 ? { label: line.slice(0, i).trim().slice(0, 60), value: line.slice(i + 1).trim().slice(0, 200) } : null;
    })
    .filter((s) => s && s.label && s.value)
    .slice(0, 30);
  return {
    category: categoryBySlug[b.category] ? b.category : '',
    status: statuses[b.status] ? b.status : 'available',
    make: String(b.make || '').trim().slice(0, 60),
    model: String(b.model || '').trim().slice(0, 80),
    year: digits(b.year, 4),
    hours: digits(b.hours, 7),
    price: digits(b.price, 9),
    priceNote: String(b.priceNote || '').trim().slice(0, 80),
    title: String(b.title || '').trim().slice(0, 120),
    description: String(b.description || '').trim().slice(0, 6000),
    specs,
    extraSpecs,
  };
}

function validateVehicle(v) {
  const errors = {};
  if (!v.category) errors.category = 'בחרו קטגוריה.';
  if (!v.make) errors.make = 'כתבו את שם היצרן.';
  const y = Number(v.year);
  if (v.year && (y < 1950 || y > new Date().getFullYear() + 1)) errors.year = 'שנת הייצור לא תקינה.';
  return errors;
}

async function addPhotos(files) {
  const added = [];
  for (const f of files || []) {
    try {
      added.push(await processImage(f.buffer));
    } catch (err) {
      console.error('[image] failed to process', f.originalname, err.message);
    }
  }
  return added;
}

adminRouter.post('/vehicles/new', withUpload('photos'), auth.checkCsrf, async (req, res) => {
  const data = vehicleFromBody(req.body);
  const errors = validateVehicle(data);
  if (Object.keys(errors).length) {
    return send(res, admin.vehicleForm({ v: data, errors, csrf: res.locals.csrf, newLeads: openLeads() }), 400);
  }
  data.images = await addPhotos(req.files);
  const v = store.upsertVehicle(data);
  res.redirect(303, `/admin/vehicles/${v.id}?ok=created`);
});

adminRouter.get('/vehicles/:id', (req, res, next) => {
  const v = store.getVehicle(req.params.id);
  if (!v) return next();
  send(res, admin.vehicleForm({ v, csrf: res.locals.csrf, flash: flashFrom(req), newLeads: openLeads() }));
});

adminRouter.post('/vehicles/:id', withUpload('photos'), auth.checkCsrf, async (req, res, next) => {
  const existing = store.getVehicle(req.params.id);
  if (!existing) return next();
  const data = vehicleFromBody(req.body);
  const errors = validateVehicle(data);
  if (Object.keys(errors).length) {
    return send(res, admin.vehicleForm({ v: { ...existing, ...data }, errors, csrf: res.locals.csrf, newLeads: openLeads() }), 400);
  }
  let images = (existing.images || []).slice();
  const action = String(req.body.imageAction || '');
  if (action) {
    const [op, key] = action.split(':');
    const i = images.findIndex((img) => img.key === key);
    if (i > -1) {
      if (op === 'delete') {
        removeImage(images[i]);
        images.splice(i, 1);
      } else if (op === 'up' && i > 0) {
        [images[i - 1], images[i]] = [images[i], images[i - 1]];
      } else if (op === 'down' && i < images.length - 1) {
        [images[i + 1], images[i]] = [images[i], images[i + 1]];
      }
    }
  }
  images = images.concat(await addPhotos(req.files));
  store.upsertVehicle({ ...data, id: existing.id, images });
  res.redirect(303, `/admin/vehicles/${existing.id}?ok=saved${action ? '#photos' : ''}`);
});

adminRouter.post('/vehicles/:id/status', auth.checkCsrf, (req, res, next) => {
  const v = store.getVehicle(req.params.id);
  if (!v) return next();
  if (statuses[req.body.status]) store.upsertVehicle({ id: v.id, status: req.body.status });
  res.redirect(303, '/admin/vehicles?ok=status');
});

adminRouter.post('/vehicles/:id/delete', auth.checkCsrf, (req, res) => {
  const v = store.deleteVehicle(req.params.id);
  if (v) (v.images || []).forEach(removeImage);
  res.redirect(303, '/admin/vehicles?ok=deleted');
});

adminRouter.get('/leads', (req, res) =>
  send(res, admin.leadsPage({ leads: store.leads(), vehicles: store.vehicles(), csrf: res.locals.csrf, flash: flashFrom(req), show: req.query.show }))
);

adminRouter.post('/leads/:id/handled', auth.checkCsrf, (req, res) => {
  store.updateLead(req.params.id, { handled: req.body.handled === '1' });
  res.redirect(303, req.get('referer') && req.get('referer').includes('/admin') ? req.get('referer') : '/admin/leads');
});

adminRouter.post('/leads/:id/delete', auth.checkCsrf, (req, res) => {
  store.deleteLead(req.params.id);
  res.redirect(303, '/admin/leads?ok=deleted');
});

adminRouter.get('/testimonials', (req, res) =>
  send(res, admin.testimonialsPage({ testimonials: store.testimonials(), csrf: res.locals.csrf, flash: flashFrom(req), newLeads: openLeads() }))
);

function testimonialFromBody(b) {
  return {
    name: String(b.name || '').trim().slice(0, 80),
    role: String(b.role || '').trim().slice(0, 120),
    text: String(b.text || '').trim().slice(0, 1500),
  };
}

adminRouter.post('/testimonials', auth.checkCsrf, (req, res) => {
  const t = testimonialFromBody(req.body);
  if (t.name && t.text) store.saveTestimonial(t);
  res.redirect(303, '/admin/testimonials?ok=saved');
});

adminRouter.post('/testimonials/:id', auth.checkCsrf, (req, res) => {
  const t = testimonialFromBody(req.body);
  if (t.name && t.text) store.saveTestimonial({ ...t, id: req.params.id });
  res.redirect(303, '/admin/testimonials?ok=saved');
});

adminRouter.post('/testimonials/:id/delete', auth.checkCsrf, (req, res) => {
  store.deleteTestimonial(req.params.id);
  res.redirect(303, '/admin/testimonials?ok=deleted');
});

adminRouter.get('/settings', (req, res) =>
  send(res, admin.settingsPage({ settings: store.settings(), csrf: res.locals.csrf, flash: flashFrom(req), newLeads: openLeads() }))
);

const SETTING_IMAGES = ['heroImage', 'aboutImage'];

adminRouter.post('/settings/:key', withUpload('photo'), auth.checkCsrf, async (req, res, next) => {
  const key = req.params.key;
  if (!SETTING_IMAGES.includes(key)) return next();
  const [img] = await addPhotos(req.files);
  if (img) {
    removeImage(store.settings()[key]);
    store.saveSettings({ [key]: img });
  }
  res.redirect(303, `/admin/settings?ok=${img ? 'uploaded' : 'saved'}`);
});

adminRouter.post('/settings/:key/delete', auth.checkCsrf, (req, res, next) => {
  const key = req.params.key;
  if (!SETTING_IMAGES.includes(key)) return next();
  removeImage(store.settings()[key]);
  store.saveSettings({ [key]: '' });
  res.redirect(303, '/admin/settings?ok=deleted');
});

app.use('/admin', adminRouter);

// ------------------------------------------------------------------ errors

app.use((req, res) => send(res, pages.notFound(), 404));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).type('text').send('אירעה שגיאה בשרת. נסו שוב בעוד רגע.');
});

const PORT = Number(process.env.PORT) || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Site running on http://localhost:${PORT}`);
    if (!process.env.ADMIN_PASSWORD) console.warn('ADMIN_PASSWORD is not set – the admin area is locked.');
  });
}

module.exports = app;
