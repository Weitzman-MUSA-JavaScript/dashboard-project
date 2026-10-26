// ============================================================================
// Config
// ============================================================================

const INITIAL_CENTER = [-73.9857, 40.7184];
const INITIAL_ZOOM = 9.75;

const BASEMAP_STYLE = 'https://michaeljpincus.github.io/basemap/basemap.json';

const CUISINE_FIELD = 'CUISINE';

const TOP_N = 10;
const OTHER_COLOR = '#000';
const PALETTE = [
  '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
  '#911eb4', '#42d4f4', '#f032e6', '#9a6324', '#469990'
];

// ============================================================================
// Map + DOM references
// ============================================================================

const map = new maplibregl.Map({
  container: 'map',
  style: BASEMAP_STYLE,
  center: INITIAL_CENTER,
  zoom: INITIAL_ZOOM,
  minZoom: 9.75,
  maxZoom: 20
});

const popup = new maplibregl.Popup({
  closeButton: false,
  closeOnClick: false,
  offset: -1
});

const resetButton = document.getElementById('reset-zoom');

// ============================================================================
// Map load
// ============================================================================

map.on('load', async () => {

  const attrib = document.querySelector('.maplibregl-ctrl-attrib');
  attrib?.classList.remove('maplibregl-compact-show');
  attrib?.removeAttribute('open');
  // --- Data + layer ---------------------------------------------------------
  const res = await fetch('restaurants.geojson');
  const data = await res.json();

  map.addSource('restaurants', { type: 'geojson', data });

  map.addSource('nyc-border', {
    type: 'geojson',
    data: 'nyc_border.geojson',
    generateId: true
  });

  map.addLayer({
    id: 'restaurants-layer',
    type: 'circle',
    source: 'restaurants',
    paint: {
      'circle-color': '#999',
      'circle-radius': 4,
      'circle-stroke-width': 0,
      'circle-stroke-color': '#fff',
      'circle-opacity': 0.8,
      'circle-stroke-opacity': 1
    }
  }, 'neighborhoods');

  map.addLayer({
    id: 'nyc-outline',
    type: 'line',
    source: 'nyc-border',
    paint: {
      'line-color': 'black',
      'line-width': 0.5
    }
  });

  map.addControl(new maplibregl.NavigationControl(), 'top-left');

  // --- Popup ----------------------------------------------------------------
  map.on('mousemove', 'restaurants-layer', (e) => {
    const props = e.features[0].properties;
    const name = toTitleCase(props['DBA']);
    const cuisine = props[CUISINE_FIELD];

    map.getCanvas().style.cursor = 'pointer';

    popup
      .setLngLat(e.lngLat)
      .setHTML(`
        <strong>${name}</strong><br>
        <span class="restaurant-cuisine">${cuisine}</span>`)
      .addTo(map);
  });

  map.on('mouseleave', 'restaurants-layer', () => {
    popup.remove();
    map.getCanvas().style.cursor = '';
  });

  // --- Cuisine counts and ordering -----------------------------------------
  const counts = {};
  data.features.forEach(f => {
    const c = f.properties[CUISINE_FIELD];
    if (c) counts[c] = (counts[c] || 0) + 1;
  });

  // Sort by count (largest first), then alphabetically for ties
  const cuisines = Object.keys(counts).sort(
    (a, b) => counts[b] - counts[a] || a.localeCompare(b)
  );

  // --- Colors ---------------------------------------------------------------
  // Top N cuisines get a color, everything else is gray
  const topCuisines = cuisines.slice(0, TOP_N);
  const colorMap = {};
  topCuisines.forEach((c, i) => (colorMap[c] = PALETTE[i]));

  const colorExpr = ['match', ['get', CUISINE_FIELD]];
  topCuisines.forEach(c => colorExpr.push(c, colorMap[c]));
  colorExpr.push(OTHER_COLOR);
  map.setPaintProperty('restaurants-layer', 'circle-color', colorExpr);

  // Draw the colored dots on top of the gray ones
  const sortExpr = ['match', ['get', CUISINE_FIELD]];
  topCuisines.forEach(c => sortExpr.push(c, 1));
  sortExpr.push(0);
  map.setLayoutProperty('restaurants-layer', 'circle-sort-key', sortExpr);

  // --- Checkboxes (sorted, with swatches and counts) -----------------------
  const box = document.getElementById('checkboxes');

  cuisines.forEach(c => {
    const label = document.createElement('label');
    label.innerHTML = `
      <input type="checkbox" value="${c}">
      <span class="swatch" style="background:${colorMap[c] || OTHER_COLOR}"></span>
      ${toTitleCase(c)} (${counts[c].toLocaleString()})`;
    box.appendChild(label);
  });

  // --- Filtering ------------------------------------------------------------
  function updateFilter() {
    const checked = [...box.querySelectorAll('input:checked')].map(i => i.value);
    map.setFilter('restaurants-layer', ['in', ['get', CUISINE_FIELD], ['literal', checked]]);
  }

  updateFilter();
  box.addEventListener('change', updateFilter);

  document.getElementById('select-all').onclick = () => {
    box.querySelectorAll('input').forEach(i => (i.checked = true));
    updateFilter();
  };

  document.getElementById('clear-all').onclick = () => {
    box.querySelectorAll('input').forEach(i => (i.checked = false));
    updateFilter();
  };

  map.on('zoom', () => {
    resetButton.style.display = map.getZoom() > INITIAL_ZOOM ? 'block' : 'none';
  });
});

// ============================================================================
// Helpers
// ============================================================================

function toTitleCase(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/(^|[\s\-\/(])([a-z])/g, (m, sep, ch) => sep + ch.toUpperCase());
}

// ============================================================================
// UI buttons
// ============================================================================


resetButton.addEventListener('click', () => {
  map.flyTo({
    center: INITIAL_CENTER,
    zoom: INITIAL_ZOOM,
    duration: 1000
  });
});