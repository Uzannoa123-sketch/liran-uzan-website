'use strict';
// Keeps the inventory in step with Liran's ads on machine.co.il.
//
//   - A new ad becomes a new vehicle on the site, with its photos.
//   - When an ad disappears, its vehicle is hidden from the site (not deleted,
//     not marked sold – the ad may have come down for another reason).
//     If the ad comes back, the vehicle reappears.
//   - Changes made in an ad (photos, hours, description...) reach the site,
//     field by field. A field edited in the admin is never overwritten, and
//     photos changed in the admin are left alone.
//   - Vehicles deleted in the admin are remembered and never re-imported.
//
// Safety: if the ad list can't be read, nothing changes. If an unusually
// large share of vehicles would disappear at once, hiding is skipped and the
// admin sees a warning instead.

const store = require('./store');
const { UPLOAD_DIR, removeImage } = require('./images');
const { listAdIds, fetchAd, buildVehicle, downloadImages, pickFields, SYNC_FIELDS } = require('./machine');

const SITE = 'machine.co.il';
let running = null;

const isSynced = (v) => v.source && v.source.site === SITE;
const titleOf = (v) => v.title || [v.make, v.model, v.year].filter(Boolean).join(' ');
const same = (a, b) => JSON.stringify(a ?? '') === JSON.stringify(b ?? '');
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// Brings one existing vehicle in line with its ad. Returns what changed.
async function refreshVehicle(v, id) {
  const ad = await fetchAd(id);
  const fresh = pickFields(ad);
  const base = v.source.fields; // what the ad looked like at the last sync
  const patch = {};
  const changed = [];

  // Details: update a field only if the admin hasn't changed it since the
  // last sync. Vehicles imported before this existed have no baseline yet:
  // that first time nothing is overwritten, only the baseline is recorded.
  if (base) {
    for (const f of SYNC_FIELDS) {
      if (!same(fresh[f], base[f]) && same(v[f], base[f])) {
        patch[f] = fresh[f];
        changed.push(f);
      }
    }
  }

  // Photos: replace them when the ad's photos changed, unless the admin
  // has uploaded, removed or reordered photos for this vehicle.
  const photosChanged = !same(ad.remoteImages, v.source.images);
  let photos = 'same';
  if (photosChanged) {
    const ownPhotos = !v.imagesEditedInAdmin && (v.images || []).every((img) => String(img.key).startsWith(`m${id}-`));
    if (ownPhotos && ad.remoteImages.length) {
      const images = await downloadImages(ad.remoteImages, id, UPLOAD_DIR, Date.now().toString(36));
      (v.images || []).forEach(removeImage);
      patch.images = images;
      photos = 'updated';
    } else if (!ownPhotos) {
      photos = 'kept';
    }
  }

  const source = { ...v.source, fields: fresh, images: ad.remoteImages };
  if (changed.length || photos !== 'same' || !same(source, v.source)) {
    store.upsertVehicle({ id: v.id, ...patch, source });
  }
  return { changed, photos };
}

async function runSync(trigger = 'auto') {
  if (running) return running;
  running = (async () => {
    const result = { at: new Date().toISOString(), trigger, ok: false, added: [], updated: [], photosKept: [], hidden: [], restored: [], errors: [] };
    store.saveSettings({ syncRunning: true });
    try {
      const ids = await listAdIds();
      if (!ids.length) throw new Error('לא נמצאו מודעות בדף של משין – לא בוצעו שינויים');
      const live = new Set(ids);
      const ignored = new Set(store.settings().syncIgnored || []);
      const known = new Map(store.vehicles().filter(isSynced).map((v) => [v.source.adid, v]));

      // 1. New ads, oldest first so the newest ends up at the top.
      for (const id of ids.filter((x) => !known.has(x) && !ignored.has(x)).reverse()) {
        try {
          const v = await buildVehicle(id, UPLOAD_DIR);
          store.addVehicle(v);
          result.added.push(titleOf(v));
        } catch (err) {
          result.errors.push(`מודעה ${id}: ${err.message}`);
        }
      }

      // 2. Changes inside ads that are already on the site.
      for (const v of known.values()) {
        const id = v.source.adid;
        if (!live.has(id) || ignored.has(id)) continue;
        try {
          const r = await refreshVehicle(store.getVehicle(v.id) || v, id);
          if (r.photos === 'updated' || r.changed.length) result.updated.push(titleOf(v));
          if (r.photos === 'kept') result.photosKept.push(titleOf(v));
        } catch (err) {
          result.errors.push(`מודעה ${id}: ${err.message}`);
        }
        await pause(250); // be gentle with machine.co.il
      }

      // 3. Ads that came back after being hidden by the sync.
      for (const v of known.values()) {
        if (live.has(v.source.adid) && v.status === 'hidden' && v.syncHidden) {
          store.upsertVehicle({ id: v.id, status: 'available', syncHidden: false });
          result.restored.push(titleOf(v));
        }
      }

      // 4. Ads that disappeared: hide their vehicles (sold ones stay as they are).
      const gone = [...known.values()].filter((v) => !live.has(v.source.adid) && !['hidden', 'sold'].includes(v.status));
      const visibleSynced = [...known.values()].filter((v) => !['hidden', 'sold'].includes(v.status)).length;
      if (gone.length > 3 && gone.length > visibleSynced / 2) {
        result.warning = `${gone.length} כלים נעלמו ממשין בבת אחת, ולכן לא הוסתרו אוטומטית. בדקו את הדף במשין, ואם זה נכון הסתירו אותם ידנית.`;
      } else {
        for (const v of gone) {
          store.upsertVehicle({ id: v.id, status: 'hidden', syncHidden: true });
          result.hidden.push(titleOf(v));
        }
      }
      result.ok = true;
      result.ads = ids.length;
    } catch (err) {
      result.error = err.message;
    }
    store.saveSettings({ lastSync: result, syncRunning: false });
    const summary = result.ok
      ? `+${result.added.length} added, ${result.updated.length} updated, ${result.hidden.length} hidden, ${result.restored.length} restored, ${result.errors.length} errors`
      : `failed: ${result.error}`;
    console.log(`[sync] ${trigger}: ${summary}`);
    return result;
  })().finally(() => {
    running = null;
  });
  return running;
}

function isRunning() {
  return Boolean(running);
}

// Remember an ad whose vehicle the admin deleted, so the sync won't bring it back.
function forget(vehicle) {
  if (!vehicle || !isSynced(vehicle)) return;
  const ignored = new Set(store.settings().syncIgnored || []);
  ignored.add(vehicle.source.adid);
  store.saveSettings({ syncIgnored: [...ignored] });
}

function schedule() {
  const hours = Number(process.env.MACHINE_SYNC_HOURS ?? 1);
  if (!hours || hours < 0) {
    console.log('[sync] automatic sync is off (MACHINE_SYNC_HOURS=0)');
    return;
  }
  // A sync interrupted by a restart must not leave the flag stuck.
  if (store.settings().syncRunning) store.saveSettings({ syncRunning: false });
  setTimeout(() => runSync('startup'), 2 * 60 * 1000).unref();
  setInterval(() => runSync('auto'), hours * 60 * 60 * 1000).unref();
  console.log(`[sync] automatic sync every ${hours}h`);
}

module.exports = { runSync, isRunning, forget, schedule };
