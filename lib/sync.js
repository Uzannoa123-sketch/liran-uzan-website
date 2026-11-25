'use strict';
// Keeps the inventory in step with Liran's ads on machine.co.il.
//
//   - A new ad becomes a new vehicle on the site, with its photos.
//   - When an ad disappears, its vehicle is hidden from the site (not deleted,
//     not marked sold – the ad may have come down for another reason).
//     If the ad comes back, the vehicle reappears.
//   - Vehicles edited in the admin are never overwritten.
//   - Vehicles deleted in the admin are remembered and never re-imported.
//
// Safety: if the ad list can't be read, nothing changes. If an unusually
// large share of vehicles would disappear at once, hiding is skipped and the
// admin sees a warning instead.

const store = require('./store');
const { UPLOAD_DIR } = require('./images');
const { listAdIds, buildVehicle } = require('./machine');

const SITE = 'machine.co.il';
let running = null;

const isSynced = (v) => v.source && v.source.site === SITE;
const titleOf = (v) => v.title || [v.make, v.model, v.year].filter(Boolean).join(' ');

async function runSync(trigger = 'auto') {
  if (running) return running;
  running = (async () => {
    const result = { at: new Date().toISOString(), trigger, ok: false, added: [], hidden: [], restored: [], errors: [] };
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

      // 2. Ads that came back after being hidden by the sync.
      for (const v of known.values()) {
        if (live.has(v.source.adid) && v.status === 'hidden' && v.syncHidden) {
          store.upsertVehicle({ id: v.id, status: 'available', syncHidden: false });
          result.restored.push(titleOf(v));
        }
      }

      // 3. Ads that disappeared: hide their vehicles (sold ones stay as they are).
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
      ? `+${result.added.length} added, ${result.hidden.length} hidden, ${result.restored.length} restored, ${result.errors.length} errors`
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
