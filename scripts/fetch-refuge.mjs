/**
 * Download Refuge Restrooms records for Philadelphia into
 * data/raw/refuge-restrooms.json. When that file exists, build-data.mjs uses
 * it instead of the smaller refuge-restrooms.psv snapshot.
 *
 * Usage:  node scripts/fetch-refuge.mjs && node scripts/build-data.mjs
 *
 * API documentation: https://www.refugerestrooms.org/api/docs/
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'raw', 'refuge-restrooms.json');
const API = 'https://www.refugerestrooms.org/api/v1/restrooms';
const PER_PAGE = 100;
const MAX_MILES = 15; // Philadelphia County fits within about 15 miles of City Hall.

async function getPage(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }
  return response.json();
}

const records = new Map();

// Restrooms sorted by distance from City Hall, until they get too far away.
for (let page = 1; page < 60; page += 1) {
  const url = `${API}/by_location?lat=39.9526&lng=-75.1652&per_page=${PER_PAGE}&page=${page}`;
  const batch = await getPage(url);
  batch.forEach((r) => records.set(r.id, r));
  const farthest = Math.max(...batch.map((r) => r.distance));
  console.log(`by_location page ${page}: ${batch.length} records, up to ${farthest.toFixed(1)} mi`);
  if (batch.length < PER_PAGE || farthest > MAX_MILES) {
    break;
  }
}

// Text search catches records whose coordinates are slightly off.
for (let page = 1; page < 30; page += 1) {
  const url = `${API}/search?query=Philadelphia&per_page=${PER_PAGE}&page=${page}`;
  const batch = await getPage(url);
  batch.forEach((r) => records.set(r.id, r));
  console.log(`search page ${page}: ${batch.length} records`);
  if (batch.length < PER_PAGE) {
    break;
  }
}

writeFileSync(OUT, JSON.stringify([...records.values()], null, 1));
console.log(`Saved ${records.size} records to data/raw/refuge-restrooms.json`);
