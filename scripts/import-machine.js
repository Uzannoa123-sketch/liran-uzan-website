#!/usr/bin/env node
'use strict';
// Rebuilds seed/ (the inventory a brand-new install starts with) from
// Liran Uzan's listings on machine.co.il. Run:  node scripts/import-machine.js
// It never touches live data; the running site keeps itself up to date with
// the automatic sync in lib/sync.js.

const fs = require('fs');
const path = require('path');
const { listAdIds, buildVehicle } = require('../lib/machine');

const SEED = path.join(__dirname, '..', 'seed');
const IMG_DIR = path.join(SEED, 'images');

(async () => {
  const ids = await listAdIds();
  console.log(`Found ${ids.length} ads`);
  fs.rmSync(SEED, { recursive: true, force: true });
  fs.mkdirSync(IMG_DIR, { recursive: true });
  const vehicles = [];
  const now = Date.now();
  for (const [i, id] of ids.entries()) {
    const v = await buildVehicle(id, IMG_DIR);
    // Keep the site's "newest first" order identical to the ad order.
    v.createdAt = v.updatedAt = new Date(now - i * 60000).toISOString();
    vehicles.push(v);
    console.log(`  ${id}  ${v.category.padEnd(15)} ${[v.make, v.model, v.year].join(' ')}  (${v.images.length} images)`);
  }
  fs.writeFileSync(path.join(SEED, 'vehicles.json'), JSON.stringify(vehicles, null, 2));
  console.log(`Wrote ${vehicles.length} vehicles to seed/`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
