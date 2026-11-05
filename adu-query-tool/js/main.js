/* global mapboxgl */
mapboxgl.accessToken = 'pk.eyJ1IjoiY2hsb2VhbGltdXJvbmciLCJhIjoiY210dWR0cjcyMDBiNjM0cHFvN2p4b2RpMiJ9.EHtMZkiC7TklHIn836JPoQ';

// Data sources

const ZONING_URL =
  'https://services.arcgis.com/fLeGjb7u4uXqeF9q/arcgis/rest/services/Zoning_BaseDistricts/FeatureServer/0/query';
const OVERLAY_URL =
  'https://services.arcgis.com/fLeGjb7u4uXqeF9q/arcgis/rest/services/Zoning_Overlays/FeatureServer/0/query';
const CARTO_SQL = 'https://phl.carto.com/api/v2/sql';

// distanceM: 0 = point-in-polygon (district tables); >0 = search radius in meters (point tables)
// columns: what to SELECT; describe: turns a row into the text shown in the popup
const HISTORIC_TABLES = [
  {
    table: 'historicdistricts_local',
    columns: 'name',
    distanceM: 0,
    describe: (r) => `Historic district${r.name ? `: ${r.name}` : ''}`,
  },
  {
    table: 'historic_sites_philreg',
    columns: 'loc, district',
    distanceM: 10,
    describe: (r) =>
      `Historic site${r.loc ? `: ${r.loc}` : ''}${r.district ? ` (${r.district} district)` : ''}`,
  },
];

const MIN_ZONING_ZOOM = 15; // do not request zoning when zoomed out further than this
let zoningVisible = true; // controlled by the legend checkbox

// field names confirmed against the live services
const BASE_FIELDS = ['long_code', 'code']; // e.g. 'RSA-5', falling back to 'RSA5'
const OVERLAY_FIELDS = ['overlay_symbol']; // e.g. '/NE'; supplemental controls are '[N/A]'

// ADU rules from the L&I checklist flowchart
const BLOCK_OVERLAYS_ALWAYS = ['FNE', 'NE']; // not permitted, even for historic structures
const BLOCK_OVERLAYS_OTHER = ['FDO', 'VDO', 'NDO', 'EDO']; // not permitted unless historic
const ALLOWED_BASE = ['RSA-5', 'CMX-1'];
// plain-language names (from the L&I checklist and the Philadelphia zoning code)
const OVERLAY_NAMES = {
  FNE: 'Far Northeast',
  NE: 'Northeast',
  FDO: 'Fourth District',
  VDO: 'Fifth District',
  NDO: 'Ninth District',
  EDO: 'Eighth District',
};
const BASE_NAMES = {
  'RSA-5': 'Residential Single-Family Attached',
  'CMX-1': 'Neighborhood Commercial Mixed-Use',
};

// Map
const FONT = 'Didot, Bodoni MT, serif';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/chloealimurong/cmuyof1fv00l301rwe8m15eoy',
  zoom: 10.5,
  center: [-75.165222, 39.952583],
});
map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');

const EMPTY = { type: 'FeatureCollection', features: [] };

// colors by zoninggroup; anything not listed falls back to gray
const GROUP_COLORS = {
  'Residential/Multi-Family/Residential Mixed-Use': '#a6611a',
  'Commercial/Commercial Mixed-Use': '#dfc27d',
  'Industrial/Industrial Mixed-Use': '#80cdc1',
  'Special Purpose': '#018571',
};
const FALLBACK_COLOR = '#b0b0b0';

const zoningColorExpr = [
  'match', ['get', 'zoninggroup'],
  ...Object.entries(GROUP_COLORS).flat(),
  FALLBACK_COLOR,
];

// Geocoding

async function geocode(query) {
  const url = new URL('https://api.mapbox.com/search/geocode/v6/forward');
  url.search = new URLSearchParams({
    q: query,
    proximity: '-75.165222,39.952583',
    bbox: '-75.28,39.86,-74.95,40.14',
    types: 'address',
    limit: 1,
    access_token: mapboxgl.accessToken,
  });
  const res = await fetch(url);
  if (!res.ok) throw new Error('Geocoding failed: ' + res.status);
  const data = await res.json();
  return data.features[0] || null;
}

// Spatial queries

// ArcGIS FeatureServer (base districts + overlays)
async function queryService(baseUrl, extraParams) {
  const params = new URLSearchParams({
    f: 'geojson',
    where: '1=1',
    inSR: 4326,
    outSR: 4326,
    spatialRel: 'esriSpatialRelIntersects',
    outFields: '*',
    ...extraParams,
  });
  const res = await fetch(`${baseUrl}?${params}`);
  if (!res.ok) throw new Error(`Query failed: ${res.status}`);
  const data = await res.json();
  if (data.type !== 'FeatureCollection') {
    throw new Error('Service did not return GeoJSON: ' + JSON.stringify(data).slice(0, 200));
  }
  return data;
}

const pointParams = (lng, lat) => ({
  geometry: `${lng},${lat}`,
  geometryType: 'esriGeometryPoint',
});

// districts inside the current map view (the colored overlay)
async function loadZoningInView() {
  if (!zoningVisible || map.getZoom() < MIN_ZONING_ZOOM) return;
  const b = map.getBounds();
  const data = await queryService(ZONING_URL, {
    geometry: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].join(','),
    geometryType: 'esriGeometryEnvelope',
    resultRecordCount: 2000,
  });
  map.getSource('zoning').setData(data);
}

// 1. base district containing the point
async function zoningAtPoint(lng, lat) {
  const data = await queryService(ZONING_URL, { ...pointParams(lng, lat), resultRecordCount: 1 });
  return data.features[0] || null;
}

// 2. overlay codes at the point, e.g. ['NE']; null if the lookup failed
async function overlaysAtPoint(lng, lat) {
  try {
    const data = await queryService(OVERLAY_URL, pointParams(lng, lat));
    const codes = data.features
      .map((f) => firstField(f.properties, OVERLAY_FIELDS))
      .filter((s) => s && s.startsWith('/')) // skips '[N/A]' supplemental controls
      .map(normalizeOverlay);
    return [...new Set(codes)]; // /CTR etc. come back as many sub-areas
  } catch (err) {
    console.error('Overlay lookup failed', err);
    return null;
  }
}

// 3. historic register hits near the point (CARTO SQL); [] if none, null if a lookup failed
async function historicAtPoint(lng, lat) {
  try {
    const results = await Promise.all(
      HISTORIC_TABLES.map(async (t) => {
        const sql = `SELECT ${t.columns} FROM ${t.table}
          WHERE ST_DWithin(the_geom::geography,
                           ST_SetSRID(ST_MakePoint(${Number(lng)}, ${Number(lat)}), 4326)::geography,
                           ${t.distanceM ?? 0})
          LIMIT 5`;
        const res = await fetch(`${CARTO_SQL}?q=${encodeURIComponent(sql)}`);
        if (!res.ok) throw new Error(`CARTO query failed (${t.table}): ${res.status}`);
        const data = await res.json();
        return data.rows.map(t.describe);
      }),
    );
    return [...new Set(results.flat())];
  } catch (err) {
    console.error('Historic lookup failed', err);
    return null;
  }
}

// Helpers

const firstField = (props, names) => {
  for (const n of names) if (props?.[n]) return String(props[n]);
  return null;
};
const normalizeOverlay = (s) => s.trim().replace(/^\//, '').toUpperCase();
// 'NE' -> 'Northeast Overlay District (/NE)'; codes without a known name fall back to '/CTR overlay district'
const overlayName = (code) =>
  OVERLAY_NAMES[code] ? `${OVERLAY_NAMES[code]} Overlay District (/${code})` : `/${code} overlay district`;

// 'RSA-5' -> 'Residential Single-Family Attached (RSA-5)'
const baseName = (code) => (BASE_NAMES[code] ? `${BASE_NAMES[code]} (${code})` : code ?? 'unknown');

const joinOr = (items) => items.join(' or ');

function el(tag, text, props = {}) {
  const e = document.createElement(tag);
  if (text != null) e.textContent = text;
  Object.assign(e, props);
  return e;
}

// Step 1: spatial check (automatic, follows the top of the L&I flowchart)

// Runs the four map-based checks in flowchart order and stops at the first failure.
// Each check has a status: 'pass' | 'fail' | 'none' | 'skip' | 'unknown'.
function spatialCheck(state) {
  const { base, overlays, historic, historicHits } = state;
  const hit = (list) => overlays?.filter((o) => list.includes(o)) ?? [];
  const names = (list) => hit(list).map(overlayName).join(', ');

  const checks = [
    {
      id: 'fne',
      label: `Not in the ${joinOr(BLOCK_OVERLAYS_ALWAYS.map(overlayName))}`,
    },
    { id: 'historic', label: 'The structure is historic (14-604(11)(d)(.1))' },
    {
      id: 'other-overlay',
      label: `Not in the ${joinOr(BLOCK_OVERLAYS_OTHER.map(overlayName))}`,
    },
    {
      id: 'base',
      label: `Base zoning district is ${joinOr(ALLOWED_BASE.map(baseName))}`,
    },
  ].map((c) => ({ ...c, status: 'skip', detail: 'not reached' }));
  const [fne, hist, other, baseCheck] = checks;

  if (overlays === null) {
    fne.status = 'unknown';
    fne.detail = 'Overlay districts could not be loaded';
    return {
      checks,
      outcome: 'unknown',
      reason: 'Overlay districts could not be loaded, so this cannot be checked automatically.',
    };
  }

  // 1. /FNE or /NE: no exception, not even for historic structures
  if (hit(BLOCK_OVERLAYS_ALWAYS).length) {
    fne.status = 'fail';
    fne.detail = `The property is in the ${names(BLOCK_OVERLAYS_ALWAYS)}`;
    return {
      checks,
      outcome: 'blocked',
      canBeHistoric: false,
      reason: `The property is in the ${names(BLOCK_OVERLAYS_ALWAYS)}. ADUs are not allowed there, even for historic structures.`,
    };
  }
  fne.status = 'pass';
  fne.detail = '';

  // 2. historic structure skips the remaining spatial checks
  if (historicHits === null) hist.detail = 'Register lookup unavailable';
  else if (historicHits.length) hist.detail = `Register: ${historicHits.join('; ')}`;
  else hist.detail = 'No register match found';

  if (historic) {
    hist.status = 'pass';
    other.detail = 'skipped (historic structure)';
    baseCheck.detail = 'skipped (historic structure)';
    return {
      checks,
      outcome: 'pass',
      reason: 'The structure is historic, so the remaining overlay and zoning checks are skipped.',
    };
  }
  hist.status = 'none';

  // 3. /FDO /VDO /NDO /EDO
  if (hit(BLOCK_OVERLAYS_OTHER).length) {
    other.status = 'fail';
    other.detail = `The property is in the ${names(BLOCK_OVERLAYS_OTHER)}`;
    return {
      checks,
      outcome: 'blocked',
      canBeHistoric: true,
      reason: `The property is in the ${names(BLOCK_OVERLAYS_OTHER)}. ADUs are not allowed there unless the structure is historic.`,
    };
  }
  other.status = 'pass';
  other.detail = '';

  // 4. base district
  if (!ALLOWED_BASE.includes(base)) {
    baseCheck.status = 'fail';
    baseCheck.detail = `The base zoning district is ${baseName(base)}`;
    return {
      checks,
      outcome: 'blocked',
      canBeHistoric: true,
      reason: `The base zoning district is ${baseName(base)}. An ADU needs ${joinOr(ALLOWED_BASE.map(baseName))}.`,
    };
  }
  baseCheck.status = 'pass';
  baseCheck.detail = baseName(base);

  return {
    checks,
    outcome: 'pass',
    reason: 'The overlay districts and base zoning district allow an ADU. Next, tell us about the property.',
  };
}

// Step 2: user input (statements the user selects)

const PROPERTY_ITEMS = [
  {
    id: 'structure',
    text: 'The principal structure is semi-detached or detached',
    blocker: 'Principal structure must be detached or semi-detached',
  },
  {
    id: 'lot',
    text: 'The lot is at least 1,600 sq ft AND no more than one dwelling unit is otherwise permitted',
    hint: 'Check your deed or a survey for lot area, and the use table in 14-602 for permitted units.',
    blocker: 'Lot must be at least 1,600 sq ft and allow no more than one dwelling unit',
  },
];

const REQUIREMENT_ITEMS = [
  { id: 'owner-lives', group: 'Owner occupied', text: 'The owner lives in the principal unit or the ADU' },
  {
    id: 'owner-deed',
    group: 'Owner occupied',
    text: 'Owner will record an affidavit and deed restriction before final occupancy',
  },
  { id: 'one-adu', group: 'Maximum of one ADU', text: 'No more than one ADU on the lot' },
  {
    id: 'floor-area',
    group: 'Floor area',
    text: 'The ADU is 800 sq ft or less',
    historicText: 'The ADU may exceed 800 sq ft (historic structure)',
  },
  {
    id: 'entrances',
    group: 'Number of entrances',
    text: 'Only one entrance on the street-facing front façade, unless the building already had an additional one before the ADU',
  },
  {
    id: 'location',
    group: 'Location',
    text: 'The ADU is inside the principal building or an existing detached accessory building (e.g. a detached garage)',
  },
];

// the 800 sq ft limit does not apply to historic structures
const itemText = (item, state) => (item.historicText && state.historic ? item.historicText : item.text);

// Step 3: result

function evaluate(state) {
  const spatial = spatialCheck(state);
  const hint = 'Unless the ADU is within a historic structure. You can change this in step 1.';

  if (spatial.outcome === 'unknown') {
    return { status: 'unknown', headline: 'Check incomplete', summary: spatial.reason };
  }
  if (spatial.outcome === 'blocked') {
    return {
      status: 'no',
      headline: 'ADU not permitted',
      summary: 'You cannot build an ADU on this property.',
      reasons: [spatial.reason],
      hint: spatial.canBeHistoric ? hint : '',
    };
  }

  // structure type and lot size are skipped for historic structures
  const reasons = state.historic
    ? []
    : PROPERTY_ITEMS.filter((i) => !state.picked[i.id]).map((i) => `${i.blocker} (not selected)`);
  if (reasons.length) {
    return {
      status: 'no',
      headline: 'ADU not permitted',
      summary: 'You cannot build an ADU on this property as answered.',
      reasons,
      hint,
    };
  }

  const unmet = REQUIREMENT_ITEMS.filter((i) => !state.picked[i.id]).map((i) => itemText(i, state));
  if (unmet.length) {
    return {
      status: 'pending',
      headline: 'ADU permitted, pending additional requirements',
      summary: 'You can build an ADU once these requirements are met.',
      unmet,
    };
  }

  return {
    status: 'yes',
    headline: 'ADU permitted',
    summary: 'You can build an ADU on this property.',
    note: 'All checks passed and all additional code requirements are confirmed. L&I verifies these during review.',
  };
}

// Popup report

const COLORS = { yes: '#2b8a3e', no: '#c92a2a', unknown: '#868e96' };

// 'permitted, pending additional requirements': yellow background, dark text for contrast
const PENDING = { bg: '#ffd43b', text: '#212529' };

const STAGE_NAMES = ['Spatial check', 'Your answers', 'Result'];

const STATUS_STYLE = {
  pass: { icon: '✓', bg: '#d3f9d8', color: COLORS.yes },
  fail: { icon: '✕', bg: '#ffe3e3', color: COLORS.no },
  none: { icon: '–', bg: '#f1f3f5', color: COLORS.unknown },
  skip: { icon: '–', bg: '#f1f3f5', color: '#adb5bd' },
  unknown: { icon: '?', bg: '#f1f3f5', color: COLORS.unknown },
};

let popup = null;
let marker = null;

function button(text, onClick, { primary = false, disabled = false, small = false } = {}) {
  const b = el('button', text, { type: 'button', disabled });
  b.style.cssText =
    `padding:${small ? '2px 10px' : '7px 16px'};border-radius:999px;font:inherit;` +
    `font-size:${small ? '.8em' : '.92em'};font-weight:600;` +
    `cursor:${disabled ? 'not-allowed' : 'pointer'};opacity:${disabled ? 0.5 : 1};` +
    `border:1.5px solid ${primary ? '#1971c2' : '#ced4da'};` +
    `background:${primary ? '#1971c2' : '#fff'};color:${primary ? '#fff' : '#212529'}`;
  if (onClick && !disabled) b.addEventListener('click', onClick);
  return b;
}

function actionsRow(...buttons) {
  const row = el('div');
  row.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;margin-top:12px';
  row.append(...buttons);
  return row;
}

// small tag shown when the answer differs from what the data suggested
function manualTag() {
  const tag = el('span', 'manually set', {
    title: 'This answer differs from what the register data suggests',
  });
  tag.style.cssText =
    'font-size:.75em;font-weight:600;padding:1px 7px;border-radius:.75em;' +
    'background:#fff4e6;color:#d9480f;border:1px solid #ffa94d';
  return tag;
}

// the three-step progress bar at the top of the popup
function stepper(state) {
  const skipAnswers = spatialCheck(state).outcome !== 'pass';
  const wrap = el('div');
  wrap.style.cssText = 'display:flex;gap:6px;margin:8px 0 12px';

  STAGE_NAMES.forEach((name, i) => {
    const n = i + 1;
    const current = n === state.stage;
    const skipped = n === 2 && skipAnswers && state.stage === 3;
    const done = n < state.stage && !skipped;

    let prefix = `${n}`;
    if (done) prefix = '✓';
    if (skipped) prefix = '–';

    let bg = '#f1f3f5';
    let color = '#868e96';
    if (current) {
      bg = '#212529';
      color = '#fff';
    } else if (done) {
      bg = '#d3f9d8';
      color = COLORS.yes;
    }

    const pill = el('div', `${prefix} ${name}`);
    pill.style.cssText =
      `flex:1;text-align:center;padding:5px 4px;border-radius:999px;font-size:.8em;font-weight:600;` +
      `background:${bg};color:${color}`;
    wrap.append(pill);
  });
  return wrap;
}

function checkRow(check, state, rerender) {
  const s = STATUS_STYLE[check.status];
  const row = el('div');
  row.style.cssText =
    `display:flex;gap:10px;align-items:flex-start;margin:8px 0;opacity:${check.status === 'skip' ? 0.5 : 1}`;

  const icon = el('div', s.icon);
  icon.style.cssText =
    'flex:none;width:1.6em;height:1.6em;border-radius:50%;display:flex;align-items:center;' +
    `justify-content:center;font-weight:700;font-size:.9em;background:${s.bg};color:${s.color}`;

  const text = el('div');
  const label = el('div', check.label);
  label.style.cssText = 'font-weight:600';
  text.append(label);

  if (check.detail) {
    const detail = el('div', check.detail);
    detail.style.cssText = 'font-size:.85em;color:#666;margin-top:2px';
    text.append(detail);
  }

  // the historic answer can be changed by hand if the register data is wrong or out of date
  if (check.id === 'historic' && check.status !== 'skip' && check.status !== 'unknown') {
    const controls = el('div');
    controls.style.cssText = 'display:flex;gap:6px;align-items:center;margin-top:4px;flex-wrap:wrap';
    controls.append(
      button(
        state.historic ? 'Mark as not historic' : 'Mark as historic',
        () => {
          state.historic = !state.historic;
          rerender();
        },
        { small: true },
      ),
    );
    if (state.historic !== state.suggestedHistoric) controls.append(manualTag());
    text.append(controls);
  }

  row.append(icon, text);
  return row;
}

function renderSpatial(box, state, rerender, go) {
  const spatial = spatialCheck(state);

  const facts = el('p');
  facts.style.cssText = 'font-size:1em;margin:4px 0 8px';
  facts.append(
  el('strong', 'Base zoning district: '), baseName(state.base), el('br'),
  el('strong', 'Overlay districts: '),
  state.overlays === null
    ? 'unavailable'
    : state.overlays.length ? state.overlays.map(overlayName).join(', ') : 'none',
  );
  box.append(facts);

  for (const check of spatial.checks) box.append(checkRow(check, state, rerender));

  const titles = {
    pass: 'Passed the spatial checks',
    blocked: 'Stopped by a spatial check',
    unknown: 'Spatial check incomplete',
  };
  const tone = { pass: COLORS.yes, blocked: COLORS.no, unknown: COLORS.unknown };
  const banner = el('div');
  banner.style.cssText =
    `margin:12px 0 0;padding:8px 10px;border-radius:6px;font-size:.92em;color:#fff;background:${tone[spatial.outcome]}`;
  banner.append(el('strong', titles[spatial.outcome]), el('br'), spatial.reason);
  box.append(banner);

  if (spatial.outcome === 'pass') {
    box.append(actionsRow(button('Next: your answers', () => go(2), { primary: true })));
  } else if (spatial.outcome === 'blocked') {
    box.append(actionsRow(button('See result', () => go(3), { primary: true })));
  } else {
    box.append(actionsRow(button('Next', null, { disabled: true })));
  }
}

// a statement the user taps; it turns green when selected
function pickRow(item, text, state, rerender) {
  const on = Boolean(state.picked[item.id]);
  const row = el('button', null, { type: 'button' });
  row.setAttribute('role', 'checkbox');
  row.setAttribute('aria-checked', String(on));
  row.style.cssText =
    'display:block;width:100%;text-align:left;margin:5px 0;padding:8px 10px;border-radius:8px;' +
    `cursor:pointer;font:inherit;font-size:.92em;font-weight:${on ? 600 : 400};` +
    `border:1.5px solid ${on ? COLORS.yes : '#ced4da'};background:${on ? '#d3f9d8' : '#fff'};` +
    `color:${on ? '#1b5e20' : '#212529'}`;

  row.append(el('span', `${on ? '✓ ' : ''}${text}`));
  if (item.hint) {
    const hint = el('span', item.hint);
    hint.style.cssText = 'display:block;font-weight:400;font-size:.85em;color:#666;margin-top:2px';
    row.append(hint);
  }

  row.addEventListener('click', () => {
    state.picked[item.id] = !on;
    rerender();
  });
  return row;
}

function sectionHeading(text) {
  const h = el('div', text);
  h.style.cssText = 'font-weight:700;margin:12px 0 2px';
  return h;
}

function groupHeading(text) {
  const h = el('div', text);
  h.style.cssText = 'font-size:.8em;font-weight:600;color:#495057;margin:8px 0 0;text-transform:uppercase';
  return h;
}

function renderAnswers(box, state, rerender, go) {
  const intro = el('p', 'Select each statement that is true for your property. Selected statements turn green.');
  intro.style.cssText = 'font-size:.92em;color:#495057;margin:4px 0 0';
  box.append(intro);

  if (state.historic) {
    const skip = el('p', 'Structure type and lot size are skipped for historic structures.');
    skip.style.cssText = 'font-size:.85em;color:#666;margin:8px 0 0';
    box.append(skip);
  } else {
    box.append(sectionHeading('About the property'));
    for (const item of PROPERTY_ITEMS) box.append(pickRow(item, item.text, state, rerender));
  }

  box.append(sectionHeading('Additional code requirements'));
  let lastGroup = null;
  for (const item of REQUIREMENT_ITEMS) {
    if (item.group !== lastGroup) {
      box.append(groupHeading(item.group));
      lastGroup = item.group;
    }
    box.append(pickRow(item, itemText(item, state), state, rerender));
  }

  box.append(
    actionsRow(
      button('Back', () => go(1)),
      button('See result', () => go(3), { primary: true }),
    ),
  );
}

function bulletList(items) {
  const ul = el('ul');
  ul.style.cssText = 'margin:6px 0;padding-left:1.2em;font-size:.92em';
  for (const text of items) ul.append(el('li', text));
  return ul;
}

function renderResult(box, state, rerender, go) {
  const r = evaluate(state);
  const pending = r.status === 'pending';

  const banner = el('div');
  banner.style.cssText =
    `padding:10px 12px;border-radius:6px;margin:6px 0;background:${pending ? PENDING.bg : COLORS[r.status]};` +
    `color:${pending ? PENDING.text : '#fff'}`;
  const headline = el('div', r.headline);
  headline.style.cssText = 'font-size:1.15em;font-weight:700';
  const summary = el('div', r.summary);
  summary.style.cssText = 'font-size:.92em;margin-top:2px';
  banner.append(headline, summary);
  box.append(banner);

  if (r.reasons) {
    box.append(el('strong', 'Why not:'), bulletList(r.reasons));
  }
  if (r.unmet) {
    box.append(el('strong', 'Still to meet:'), bulletList(r.unmet));
  }
  if (r.hint) {
    const hint = el('p', r.hint);
    hint.style.cssText = 'font-size:.92em;margin:6px 0';
    box.append(hint);
  }
  if (r.note) {
    const note = el('p', r.note);
    note.style.cssText = 'font-size:.92em;margin:6px 0';
    box.append(note);
  }

  const footnote = el('p', 'Historic status is confirmed by the Historical Commission during L&I review.');
  footnote.style.cssText = 'font-size:.85em;color:#666;margin:10px 0 0';
  box.append(footnote);

  const backTo = spatialCheck(state).outcome === 'pass' ? 2 : 1;
  box.append(actionsRow(button('Back', () => go(backTo))));
}

// true when there is room to open the report beside the pin
const hasSideRoom = () => map.getContainer().clientWidth >= 700;

function showReport({ place, lngLat, zoning, overlays, historicHits }) {
  if (popup) popup.remove();
  if (marker) marker.remove();

  const root = el('div');
  root.style.cssText =
  `font-family:${FONT};font-size:17px;width:min(560px, 85vw);max-height:68vh;overflow-y:auto;padding-right:4px`;

  if (!zoning) {
    root.append(el('p', place ? 'No zoning district found at that address.' : 'Address not found in Philadelphia.'));
  } else {
    const suggestedHistoric = Boolean(historicHits?.length);
    const state = {
      base: firstField(zoning.properties, BASE_FIELDS),
      overlays,
      historicHits,
      suggestedHistoric, // what the register data says
      historic: suggestedHistoric, // what the user has chosen (starts at the register answer)
      picked: {}, // statement id -> true when the user selects it
      stage: 1,
    };

    const progress = el('div');
    const body = el('div');

    const rerender = () => {
      progress.replaceChildren(stepper(state));
      body.replaceChildren();
      if (state.stage === 1) renderSpatial(body, state, rerender, go);
      else if (state.stage === 2) renderAnswers(body, state, rerender, go);
      else renderResult(body, state, rerender, go);
    };
    const go = (stage) => {
      state.stage = stage;
      rerender();
      root.scrollTop = 0;
    };

    root.append(el('h3', place?.properties?.full_address ?? 'Zoning report'), progress, body);
    rerender();
  }

  popup = new mapboxgl.Popup({
    closeOnClick: false,
    maxWidth: 'none',
    anchor: hasSideRoom() ? 'left' : undefined, // 'left' = box opens to the right of the pin
  }).setDOMContent(root);

  if (place) {
    // pin on the address, report box opens beside it
    marker = new mapboxgl.Marker({ color: '#f1b6da' })
      .setLngLat(lngLat)
      .setPopup(popup)
      .addTo(map);
    marker.togglePopup();
  } else {
    // address not found: no pin, just show the message at the map center
    popup.setLngLat(lngLat).addTo(map);
  }
}

// Address search

async function searchAddress(query) {
  const place = await geocode(query);
  if (!place) {
    return showReport({ place: null, lngLat: map.getCenter(), zoning: null });
  }

  const [lng, lat] = place.geometry.coordinates;
  map.flyTo({
    center: [lng, lat],
    zoom: 18,
    padding: {
      right: hasSideRoom() ? Math.min(620, Math.round(map.getContainer().clientWidth * 0.55)) : 0,
    },
  });

  const [zoning, overlays, historicHits] = await Promise.all([
    zoningAtPoint(lng, lat),
    overlaysAtPoint(lng, lat),
    historicAtPoint(lng, lat),
  ]);
  map.getSource('selected-zoning').setData(zoning || EMPTY);
  showReport({ place, lngLat: [lng, lat], zoning, overlays, historicHits });
}

const input = document.querySelector('[name=address-search]');
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && input.value.trim()) {
    searchAddress(input.value.trim()).catch(console.error);
  }
});

// Map setup

map.on('load', () => {
  // hide road-number shields; they log a Mapbox expression warning on some tiles
  map.getStyle().layers.forEach((layer) => {
    if (layer.type === 'symbol' && /shield/i.test(layer.id)) {
      map.setLayoutProperty(layer.id, 'visibility', 'none');
    }
  });

  // all districts in view
  map.addSource('zoning', { type: 'geojson', data: EMPTY });
  map.addLayer({
    id: 'zoning-fill',
    type: 'fill',
    source: 'zoning',
    paint: { 'fill-color': zoningColorExpr, 'fill-opacity': 0.6 },
  });
  map.addLayer({
    id: 'zoning-outline',
    type: 'line',
    source: 'zoning',
    paint: { 'line-color': '#999', 'line-width': 0.5 },
  });

  // the district found by address search
  map.addSource('selected-zoning', { type: 'geojson', data: EMPTY });
  map.addLayer({
    id: 'selected-zoning-outline',
    type: 'line',
    source: 'selected-zoning',
    paint: { 'line-color': '#f1b6da', 'line-width': 3 },
  });

  map.on('moveend', () => loadZoningInView().catch(console.error));
});

// Legend (with the zoning layer toggle)

const legend = document.createElement('div');
legend.style.cssText =
  'position:absolute;bottom:30px;right:50px;background:#fff;padding:.7em .9em;border-radius:6px;' +
  `font:14px ${FONT};box-shadow:0 1px 4px rgb(0 0 0 / 30%)`;

function legendRow(color, label) {
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;gap:.6em;margin:.25em 0';
  const swatch = document.createElement('span');
  swatch.style.cssText = `flex:none;width:1em;height:1em;border-radius:2px;background:${color}`;
  row.append(swatch, label);
  return row;
}

// checkbox that shows or hides the zoning layer
const toggleLabel = document.createElement('label');
toggleLabel.style.cssText = 'display:flex;align-items:center;gap:.6em;font-weight:600;cursor:pointer';
const toggle = document.createElement('input');
toggle.type = 'checkbox';
toggle.checked = true;
toggleLabel.append(toggle, 'Zoning districts');

const toggleHint = document.createElement('div');
toggleHint.textContent = 'Zoom in to see districts';
toggleHint.style.cssText = 'font-size:.85em;color:#666;margin:.15em 0 .3em';

// one row per zoning group
const zoningRows = document.createElement('div');
for (const [name, color] of Object.entries(GROUP_COLORS)) {
  zoningRows.append(legendRow(color, name.split('/')[0])); // 'Residential', 'Commercial', ...
}

function setZoningVisible(visible) {
  zoningVisible = visible;
  zoningRows.style.display = visible ? '' : 'none';
  if (!map.getLayer('zoning-fill')) return; // map has not finished loading yet
  for (const id of ['zoning-fill', 'zoning-outline']) {
    map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
  }
  if (visible) loadZoningInView().catch(console.error); // districts were not fetched while hidden
}
toggle.addEventListener('change', () => setZoningVisible(toggle.checked));

// the searched district outline stays visible whether the zoning layer is on or off
legend.append(toggleLabel, toggleHint, zoningRows, legendRow('#f1b6da', 'Base Zoning District Box'));

map.getContainer().append(legend);

window.map = map;