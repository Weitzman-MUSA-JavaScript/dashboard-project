import { createTractLayer, summarize } from './tracts.js';
import { createStoreLayers, countStores } from './stores.js';
import { renderLegend } from './legend.js';
import { renderHeadline } from './headline.js';
import { int } from './format.js';
import { showProfile } from './profile.js';
import { createRanking } from './rank.js';
import { createPlanner } from './plan.js';

const state = {
  mode: 'access',
  definition: 'grocery',
  selected: null,
  weights: { need: 3, viability: 3, leverage: 3 },
};

const NOTES = {
  grocery: '',
  usda: 'By this measure, a gas station is food access.',
};

const map = L.map('map', {
  maxBounds: [[28.9, -96.4], [30.6, -94.4]],
  maxBoundsViscosity: 1.0,
  minZoom: 9,
  zoomSnap: 0.5,
}).setView([29.76, -95.37], 10);

L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 16,
  attribution: 'Tiles &copy; <a href="https://www.esri.com">Esri</a>, HERE, Garmin, &copy; OpenStreetMap contributors',
}).addTo(map);

map.createPane('rankPane');
map.getPane('rankPane').style.zIndex = 460;
map.createPane('zonePane');
map.getPane('zonePane').style.zIndex = 430;
map.createPane('maskPane');
map.getPane('maskPane').style.zIndex = 420;
map.getPane('maskPane').style.pointerEvents = 'none';
map.createPane('storePane');
map.getPane('storePane').style.zIndex = 450;

const statusEl = document.getElementById('map-status');

async function getJson(path) {
  const r = await fetch(path);
  if (!r.ok) { throw new Error(`${path} returned ${r.status}`); }
  return r.json();
}

// If any file fails, say so on the map instead of leaving "Loading" up forever.
let data;
try {
  data = await Promise.all([
    'data/tracts.geojson', 'data/stores.geojson', 'data/harris-mask.geojson',
    'data/harris-boundary.geojson', 'data/blocks.json', 'data/stops.json',
    'data/houston-city.geojson',
  ].map(getJson));
} catch (err) {
  statusEl.textContent = "The map data didn't load. Check your connection and reload the page.";
  statusEl.classList.add('is-error');
  throw err;
}
statusEl.hidden = true;
const [tracts, stores, mask, boundary, blocks, stops, city] = data;
const legendEl = document.getElementById('legend');
const tractsById = new Map(tracts.features.map((f) => [f.properties.geoid, f.properties]));

const tractLayer = createTractLayer(tracts, state, selectTract);
tractLayer.addTo(map);
const storeLayers = createStoreLayers(stores);
storeLayers.grocery.addTo(map);

const maskRenderer = L.svg({ padding: 3, pane: 'maskPane' });

L.geoJSON(mask, {
  pane: 'maskPane',
  renderer: maskRenderer,
  interactive: false,
  style: { stroke: false, fillColor: '#e9ebe6', fillOpacity: 0.85 },
}).addTo(map);

const county = L.geoJSON(boundary, {
  pane: 'maskPane',
  renderer: maskRenderer,
  interactive: false,
  style: { color: 'rgb(18 26 22 / 45%)', weight: 1.25, fill: false },
}).addTo(map);

map.fitBounds(county.getBounds(), { padding: [8, 8] });

const counts = countStores(stores);
counts.snap = counts.grocery + counts.small + counts.dollar + counts.convenience;
for (const el of document.querySelectorAll('[data-count]')) {
  el.textContent = int(counts[el.dataset.count] || 0);
}

for (const input of document.querySelectorAll('input[name="layer"]')) {
  const layer = storeLayers[input.value];
  if (input.checked) { layer.addTo(map); }
  input.addEventListener('change', () => {
    if (input.checked) {
      layer.addTo(map);
    } else {
      layer.remove();
    }
  });
}

const headlineStats = { grocery: summarize(tracts, 'grocery'), usda: summarize(tracts, 'usda') };

function refreshProfile() {
  if (state.selected) { showProfile(tractsById.get(state.selected), state.definition); }
}

// Clicking a tract in the plan step places a store instead of selecting something.
function onTractClick(geoid) {
  if (state.mode !== 'plan') { selectTract(geoid); }
}

function selectTract(geoid) {
  state.selected = geoid;
  tractLayer.restyle();
  refreshProfile();
}

function updateHeadline() {
  renderHeadline(document.getElementById('headline'), headlineStats, state.definition);
  const note = document.getElementById('definition-note');
  note.textContent = NOTES[state.definition];
  note.hidden = !note.textContent;
}

for (const input of document.querySelectorAll('input[name="definition"]')) {
  input.addEventListener('change', () => {
    state.definition = input.value;
    tractLayer.restyle();
    updateHeadline();
    refreshProfile();
  });
}

const ranking = createRanking({
  map,
  tracts,
  state,
  onSelect: selectTract,
  onChange: () => {
    if (state.mode === 'rank') { tractLayer.restyle(); }
  },
});

const planner = createPlanner({ map, tracts, blocks: blocks.rows, stops, city });

// A click that lands on a store dot still places a store.
map.on('click', (e) => {
  if (state.mode === 'plan') { planner.place(e.latlng); }
});

const tabs = [...document.querySelectorAll('[role="tab"]')];

function setMode(tab) {
  for (const t of tabs) {
    const active = t === tab;
    t.setAttribute('aria-selected', String(active));
    t.tabIndex = active ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).hidden = !active;
  }
  state.mode = { 'tab-rank': 'rank', 'tab-plan': 'plan' }[tab.id] || 'access';
  ranking.show(state.mode === 'rank');
  planner.show(state.mode === 'plan');
  tractLayer.restyle();
  renderLegend(legendEl, state.mode);
}

// Left and right arrows move between tabs and wrap around
tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => setMode(tab));
  tab.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') { return; }
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    next.focus();
    setMode(next);
  });
});

updateHeadline();
refreshProfile();

renderLegend(legendEl, state.mode);