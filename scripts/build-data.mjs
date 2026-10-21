/**
 * Build data/restrooms.geojson from the raw source files in data/raw/.
 *
 * Usage:  node scripts/build-data.mjs
 *
 * Sources (see README.md for full citations):
 *   - public-sites.json        City of Philadelphia "Philly Phlush" restrooms + Visit Philly's list
 *   - libraries.csv            Free Library of Philadelphia branch pages + City Facilities locations
 *   - osm-toilets-stores.geojson  OpenStreetMap public toilets, malls, stores (Overpass export)
 *   - osm-food.geojson         OpenStreetMap chain cafes and fast-food restaurants (Overpass export)
 *   - refuge-restrooms.psv     Refuge Restrooms community reports (or refuge-restrooms.json if present)
 *
 * The script has no dependencies beyond Node.js 18+.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseOpeningHours } from '../js/opening-hours.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW = join(ROOT, 'data', 'raw');
const OUT = join(ROOT, 'data', 'restrooms.geojson');
const CHECKED = '2026-10-21';

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

// Chains that are mostly takeout counters without customer restrooms.
const EXCLUDED_FOOD_BRANDS = new Set([
  'Domino\'s', 'Little Caesars', 'Papa John\'s', 'Philly Pretzel Factory',
  'Auntie Anne\'s', 'Checkers', 'Kung Fu Tea', 'Insomnia Cookies', 'Cinnabon',
  'Chicha San Chen', 'Yi Fang Tea', 'Gong Cha',
]);

// Stores kept on the map but whose restrooms are often staff-only.
const UNCERTAIN_STORE_BRANDS = new Set([
  'Aldi', 'Trader Joe\'s', 'Ross', 'TJ Maxx', 'Marshalls', 'dd\'s Discounts',
  'Forman Mills', 'Burlington',
]);

// Philadelphia International Airport (restrooms are inside the terminals).
const AIRPORT_BOX = { south: 39.865, north: 39.902, west: -75.258, east: -75.222 };
const AIRPORT = {
  name: 'Philadelphia International Airport',
  address: '8000 Essington Ave',
  lat: 39.8744,
  lng: -75.2424,
};

// Rough Philadelphia County bounding box, plus a cut for Camden, NJ.
function inPhiladelphia(lat, lng) {
  if (!(lat > 39.86 && lat < 40.14 && lng > -75.29 && lng < -74.95)) {
    return false;
  }
  const inCamden = lat < 39.96 && lng > -75.138;
  return !inCamden;
}

function inAirport(lat, lng) {
  return lat > AIRPORT_BOX.south && lat < AIRPORT_BOX.north &&
    lng > AIRPORT_BOX.west && lng < AIRPORT_BOX.east;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function metersBetween(a, b) {
  const toRad = (deg) => deg * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

function firstWord(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ')[0];
}

function yesNo(value) {
  if (value === 'yes' || value === 'designated' || value === true || value === 'true') {
    return true;
  }
  if (value === 'no' || value === false || value === 'false') {
    return false;
  }
  return null;
}

function osmAddress(props) {
  const street = [props['addr:housenumber'], props['addr:street']].filter(Boolean).join(' ');
  return street || null;
}

function osmUrl(props) {
  const id = props['@id'] || props.id;
  return id ? `https://www.openstreetmap.org/${id}` : null;
}

function readGeoJSON(name) {
  return JSON.parse(readFileSync(join(RAW, name), 'utf8')).features;
}

function pointOf(feature) {
  const [lng, lat] = feature.geometry.coordinates;
  return { lat, lng };
}

let nextId = 1;
const places = [];

function addPlace(place) {
  const hours = place.hours || null;
  if (hours && !parseOpeningHours(hours)) {
    console.warn(`  ! Could not parse hours for ${place.name}: "${hours}" (marked unknown)`);
  }
  places.push({
    id: nextId++,
    name: place.name,
    kind: place.kind,
    access: place.access,
    address: place.address || null,
    hours: hours && parseOpeningHours(hours) ? hours : null,
    verified: Boolean(place.verified),
    wheelchair: place.wheelchair ?? null,
    changingTable: place.changingTable ?? null,
    genderNeutral: place.genderNeutral ?? null,
    note: place.note || null,
    source: place.source,
    url: place.url || null,
    updated: place.updated || null,
    lat: Number(place.lat.toFixed(6)),
    lng: Number(place.lng.toFixed(6)),
  });
}

function nearPlace(point, maxMeters, predicate = () => true) {
  return places.find((place) => predicate(place) && metersBetween(point, place) <= maxMeters);
}

// ---------------------------------------------------------------------------
// 1. Official city restrooms and Visit Philly's public list
// ---------------------------------------------------------------------------

const publicSites = JSON.parse(readFileSync(join(RAW, 'public-sites.json'), 'utf8')).sites;
for (const site of publicSites) {
  const isCity = site.source === 'City of Philadelphia';
  addPlace({
    ...site,
    kind: isCity ? 'city' : 'public',
    access: 'free',
    url: site.url || 'https://www.visitphilly.com/articles/philadelphia/public-restrooms/',
    note: site.approx ? `${site.note} Map location is approximate.` : site.note,
    updated: isCity ? CHECKED : '2026-01-28',
  });
}

// ---------------------------------------------------------------------------
// 2. Free Library branches
// ---------------------------------------------------------------------------

const libraryRows = readFileSync(join(RAW, 'libraries.csv'), 'utf8').trim().split('\n');
const libraryHeader = libraryRows.shift().split(',');
for (const row of libraryRows) {
  const values = row.split(',');
  const lib = Object.fromEntries(libraryHeader.map((key, i) => [key, values[i]]));
  const notes = ['Free public library; restrooms are for library visitors.'];
  if (lib.restroom_listed !== 'yes') {
    notes.push('The library\'s page doesn\'t list a public restroom, so ask staff.');
  }
  addPlace({
    name: lib.name,
    kind: 'library',
    access: 'free',
    address: lib.address,
    lat: Number(lib.lat),
    lng: Number(lib.lng),
    hours: lib.hours,
    verified: true,
    wheelchair: lib.accessible_entrance === 'yes' ? true : null,
    note: notes.join(' '),
    source: 'Free Library of Philadelphia',
    url: lib.url,
    updated: CHECKED,
  });
}

// ---------------------------------------------------------------------------
// 3. OpenStreetMap: public toilets, malls, stores, and a few other places
// ---------------------------------------------------------------------------

const toiletClusters = [];
let airportCount = 0;

for (const feature of readGeoJSON('osm-toilets-stores.geojson')) {
  const p = feature.properties;
  const point = pointOf(feature);
  if (!inPhiladelphia(point.lat, point.lng)) {
    continue;
  }

  if (p.amenity === 'toilets') {
    if (p.access === 'private') {
      continue;
    }
    if (inAirport(point.lat, point.lng)) {
      airportCount += 1;
      continue;
    }
    // Skip toilets that belong to a site we already have from an official list.
    if (nearPlace(point, 90, (place) => place.kind === 'city' || place.kind === 'public')) {
      continue;
    }
    // Men's and women's rooms tagged separately become one place.
    const cluster = toiletClusters.find((c) => metersBetween(point, c.point) < 35);
    if (cluster) {
      cluster.tags.push(p);
    } else {
      toiletClusters.push({ point, tags: [p] });
    }
    continue;
  }

  const name = p.name || p.brand;
  if (!name) {
    continue;
  }

  if (p.shop === 'mall') {
    if (nearPlace(point, 250, (place) => firstWord(place.name) === firstWord(name))) {
      continue;
    }
    addPlace({
      name, kind: 'store', access: 'free', address: osmAddress(p), ...point,
      hours: p.opening_hours, wheelchair: yesNo(p.wheelchair),
      note: 'Shopping center; restrooms are usually in the public areas and follow mall hours.',
      source: 'OpenStreetMap', url: osmUrl(p), updated: p.check_date,
    });
    continue;
  }

  if (['supermarket', 'department_store', 'variety_store'].includes(p.shop)) {
    const uncertain = UNCERTAIN_STORE_BRANDS.has(p.brand);
    addPlace({
      name, kind: 'store', access: 'customers', address: osmAddress(p), ...point,
      hours: p.opening_hours, wheelchair: yesNo(p.wheelchair),
      note: uncertain ?
        'This store\'s restroom may not be open to customers. Ask staff.' :
        'Customer restroom; you may need to ask staff.',
      source: 'OpenStreetMap', url: osmUrl(p), updated: p.check_date,
    });
    continue;
  }

  // Other places explicitly tagged with a restroom (a station, a few bars...).
  if (p.amenity === 'doctors') {
    continue;
  }
  const isStation = p.railway === 'station' || p.public_transport === 'station';
  const isPublic = isStation || p['toilets:access'] === 'public' || p.leisure || (!p.amenity && !p.shop);
  addPlace({
    name: isStation ? `${name} (${p.operator || 'SEPTA'})` : name,
    kind: isPublic ? 'public' : 'business',
    access: isPublic ? 'free' : 'customers',
    address: osmAddress(p), ...point,
    hours: p.opening_hours, wheelchair: yesNo(p['toilets:wheelchair'] ?? p.wheelchair),
    note: isStation ? 'Restroom inside the rail station.' : 'Tagged as having a restroom.',
    source: 'OpenStreetMap', url: osmUrl(p), updated: p.check_date,
  });
}

for (const cluster of toiletClusters) {
  const merged = Object.assign({}, ...cluster.tags);
  const any = (key, values) => cluster.tags.some((t) => values.includes(t[key]));
  const notes = [];
  if (merged.description) {
    notes.push(merged.description.replace(/\.?$/, '.'));
  }
  if (any('fee', ['yes'])) {
    notes.push('A fee may be charged.');
  }
  if (any('portable', ['yes'])) {
    notes.push('Portable toilet.');
  }
  if (any('toilets:disposal', ['pitlatrine', 'chemical'])) {
    notes.push('Basic (non-flush) toilet.');
  }
  if (any('wheelchair', ['limited'])) {
    notes.push('Limited wheelchair access.');
  }
  if (any('seasonal', ['winter', 'summer', 'yes'])) {
    notes.push('May be seasonal.');
  }
  const customersOnly = cluster.tags.every((t) => t.access === 'customers');
  const hasName = merged.name && !/^(men|women)'?s room$/i.test(merged.name);
  addPlace({
    name: hasName ? merged.name : 'Public restroom',
    kind: 'osm-toilet',
    access: customersOnly ? 'customers' : 'free',
    address: osmAddress(merged),
    ...cluster.point,
    hours: merged.opening_hours,
    wheelchair: any('wheelchair', ['yes', 'designated']) ? true : (any('wheelchair', ['no']) ? false : null),
    changingTable: any('changing_table', ['yes']) ? true : (any('changing_table', ['no']) ? false : null),
    genderNeutral: any('unisex', ['yes']) || any('gender_segregated', ['no']) ? true : null,
    note: notes.join(' ') || 'Standalone restroom mapped by OpenStreetMap volunteers.',
    source: 'OpenStreetMap',
    url: osmUrl(cluster.tags[0]),
    updated: merged.check_date,
  });
}

// ---------------------------------------------------------------------------
// 4. OpenStreetMap: chain cafes and fast-food restaurants
// ---------------------------------------------------------------------------

let excludedFood = 0;
for (const feature of readGeoJSON('osm-food.geojson')) {
  const p = feature.properties;
  const point = pointOf(feature);
  if (!inPhiladelphia(point.lat, point.lng)) {
    continue;
  }
  if (EXCLUDED_FOOD_BRANDS.has(p.brand) || p.toilets === 'no') {
    excludedFood += 1;
    continue;
  }
  const name = p.name || p.brand;
  if (!name) {
    continue;
  }
  const confirmed = p.toilets === 'yes';
  addPlace({
    name,
    kind: 'business',
    access: 'customers',
    address: osmAddress(p),
    ...point,
    hours: p.opening_hours,
    wheelchair: yesNo(p['toilets:wheelchair'] ?? p.wheelchair),
    note: confirmed ?
      'Customer restroom listed on OpenStreetMap.' :
      'Likely has a customer restroom (based on the type of business). You may need to buy something or ask for a code.',
    source: 'OpenStreetMap',
    url: osmUrl(p),
    updated: p.check_date,
  });
}

// ---------------------------------------------------------------------------
// 5. Refuge Restrooms community reports
// ---------------------------------------------------------------------------

function readRefuge() {
  const jsonPath = join(RAW, 'refuge-restrooms.json');
  if (existsSync(jsonPath)) {
    return JSON.parse(readFileSync(jsonPath, 'utf8')).map((r) => ({
      ...r,
      note: [r.directions, r.comment].filter(Boolean).join(' / ').slice(0, 160),
      updated_at: (r.updated_at || '').slice(0, 10),
    }));
  }
  const lines = readFileSync(join(RAW, 'refuge-restrooms.psv'), 'utf8')
    .split('\n')
    .filter((line) => line && !line.startsWith('#'));
  const header = lines.shift().split('|');
  return lines.map((line) => {
    const values = line.split('|');
    return Object.fromEntries(header.map((key, i) => [key, values[i]]));
  });
}

function refugeAccess(note) {
  const text = (note || '').toLowerCase();
  if (/(id required|id needed|valid id|student|resident|guest|ticket|paid|must pay|admission|not open to the general public|show an id)/.test(text)) {
    return 'limited';
  }
  if (/(customer|buy|purchase|order)/.test(text) && !/(don'?t have to buy|without buying|no need to shop|free to public|open to public)/.test(text)) {
    return 'customers';
  }
  if (/(free to public|open to public|open to the public|don'?t have to buy|without buying|no need to shop|free for all)/.test(text)) {
    return 'free';
  }
  return 'unknown';
}

const refugeSeen = new Map();
for (const r of readRefuge()) {
  const point = { lat: Number(r.latitude), lng: Number(r.longitude) };
  if (!inPhiladelphia(point.lat, point.lng)) {
    continue;
  }
  if (inAirport(point.lat, point.lng)) {
    airportCount += 1;
    continue;
  }
  // Keep only the most recent report for the same place (same first word, within 120 m).
  const key = [...refugeSeen.keys()].find((k) => {
    const other = refugeSeen.get(k);
    return firstWord(other.name) === firstWord(r.name) && metersBetween(point, other) < 120;
  }) ?? `${r.id}`;
  const previous = refugeSeen.get(key);
  if (!previous || (r.updated_at || '') > (previous.updated_at || '')) {
    refugeSeen.set(key, { ...r, ...point });
  }
}

let mergedRefuge = 0;
for (const r of refugeSeen.values()) {
  const note = (r.note || '').trim();
  const match = nearPlace(r, 120, (place) => place.source !== 'Refuge Restrooms' &&
    firstWord(place.name) === firstWord(r.name));
  if (match) {
    // Same place we already have: add the community tip instead of a duplicate pin.
    if (note && !(match.note || '').includes(note)) {
      match.note = `${match.note || ''} Community tip (Refuge Restrooms, ${r.updated_at.slice(0, 4)}): ${note}`.trim();
    }
    if (r.unisex === 'true') {
      match.genderNeutral = true;
    }
    if (r.changing_table === 'true' && match.changingTable === null) {
      match.changingTable = true;
    }
    mergedRefuge += 1;
    continue;
  }
  // Some reports use an address or "philadelphia, pa" as the name.
  const name = r.name.trim();
  const looksLikeAddress = /^\d/.test(name) || /^philadelphia,? pa$/i.test(name);
  addPlace({
    name: looksLikeAddress ? 'Community-reported restroom' : name,
    kind: 'community',
    access: refugeAccess(note),
    address: r.street,
    lat: r.lat,
    lng: r.lng,
    hours: null,
    wheelchair: r.accessible === 'true' ? true : null,
    changingTable: r.changing_table === 'true' ? true : null,
    genderNeutral: r.unisex === 'true' ? true : null,
    note: note || 'Reported by a Refuge Restrooms user.',
    source: 'Refuge Restrooms',
    url: r.id ? `https://www.refugerestrooms.org/restrooms/${r.id}` : 'https://www.refugerestrooms.org/',
    updated: r.updated_at,
  });
}

// ---------------------------------------------------------------------------
// 6. Airport: one point instead of dozens inside the terminals
// ---------------------------------------------------------------------------

addPlace({
  ...AIRPORT,
  kind: 'public',
  access: 'limited',
  wheelchair: true,
  changingTable: true,
  genderNeutral: true,
  note: `${airportCount} restrooms are mapped inside the terminals, including all-gender and family restrooms. Most are past security.`,
  source: 'OpenStreetMap',
  url: 'https://www.phl.org/',
  updated: CHECKED,
});

// ---------------------------------------------------------------------------
// Write output
// ---------------------------------------------------------------------------

const geojson = {
  type: 'FeatureCollection',
  metadata: {
    generated: new Date().toISOString().slice(0, 10),
    note: 'Built by scripts/build-data.mjs. See README.md for sources.',
  },
  features: places.map(({ lat, lng, ...properties }) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lng, lat] },
    properties: Object.fromEntries(Object.entries(properties).filter(([, v]) => v !== null && v !== false && v !== '')),
  })),
};

writeFileSync(OUT, JSON.stringify(geojson));

const count = (fn) => places.filter(fn).length;
console.log(`Wrote ${places.length} places to data/restrooms.geojson`);
console.log(`  City restrooms:      ${count((p) => p.kind === 'city')}`);
console.log(`  Other public sites:  ${count((p) => p.kind === 'public')}`);
console.log(`  Libraries:           ${count((p) => p.kind === 'library')}`);
console.log(`  OSM public toilets:  ${count((p) => p.kind === 'osm-toilet')}`);
console.log(`  Stores and malls:    ${count((p) => p.kind === 'store')}`);
console.log(`  Restaurants, cafes:  ${count((p) => p.kind === 'business')}`);
console.log(`  Community reports:   ${count((p) => p.kind === 'community')} (${mergedRefuge} merged into other places)`);
console.log(`  Excluded takeout-only food places: ${excludedFood}`);
console.log(`  Access -> free: ${count((p) => p.access === 'free')}, customers: ${count((p) => p.access === 'customers')}, limited: ${count((p) => p.access === 'limited')}, unknown: ${count((p) => p.access === 'unknown')}`);
console.log(`  With usable hours: ${count((p) => p.hours)} (verified: ${count((p) => p.verified)})`);
