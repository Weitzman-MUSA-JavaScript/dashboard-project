/**
 * Phlush Finder: main entry point.
 *
 * Milestone 1: the Leaflet map and the About dialog.
 * Milestone 2: load data/restrooms.geojson, show the restrooms on the map, and
 *              list the ones near the search point, sorted by distance.
 * Milestone 3: start at the person's location, address search with suggestions,
 *              dragging the map to search a new area, filters, list and map
 *              selection, detail popups.
 */

import { parseOpeningHours } from './opening-hours.js';
import { METERS_PER_MILE, describeStatus } from './format.js';
import { CITY_HALL, createMap, markerStyle, createSearchArea, createUserMarker } from './map.js';
import { searchAddresses, inPhiladelphia } from './search.js';
import { initAutocomplete } from './autocomplete.js';
import { buildListItem, buildPopup } from './details.js';

const SEARCH_RADIUS = 0.5 * METERS_PER_MILE;
const PAGE_SIZE = 20;
const STATUS_RANK = { open: 0, unknown: 1, closed: 2 };

const state = {
  places: [],
  center: L.latLng(CITY_HALL),
  shown: PAGE_SIZE,
  selected: null,
  movedByUser: false,
  filters: {
    freeOnly: false,
    wheelchair: false,
    changingTable: false,
    genderNeutral: false,
    verified: false,
    showClosed: false,
  },
};

// Filter checkbox name -> key in state.filters
const FILTER_INPUTS = {
  'free-only': 'freeOnly',
  'wheelchair': 'wheelchair',
  'changing-table': 'changingTable',
  'gender-neutral': 'genderNeutral',
  'verified': 'verified',
  'show-closed': 'showClosed',
};

const map = createMap('map');
const markerLayer = L.layerGroup().addTo(map);
const searchArea = createSearchArea(map, state.center, SEARCH_RADIUS);
const mapArea = document.querySelector('.map-area');
map.on('popupopen', () => mapArea.classList.add('has-popup'));
map.on('popupclose', () => mapArea.classList.remove('has-popup'));
const userMarker = createUserMarker(map);

const listEl = document.querySelector('.results-list');
const summaryEl = document.querySelector('.summary');
const messageEl = document.querySelector('.search-message');

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

async function loadPlaces() {
  const response = await fetch('data/restrooms.geojson');
  if (!response.ok) {
    throw new Error(`Couldn't load the restroom data (error ${response.status}).`);
  }
  const geojson = await response.json();
  return geojson.features.map((feature) => {
    const [lng, lat] = feature.geometry.coordinates;
    const place = {
      ...feature.properties,
      latlng: L.latLng(lat, lng),
      schedule: parseOpeningHours(feature.properties.hours),
    };
    place.marker = L.circleMarker(place.latlng, markerStyle(place));
    place.marker.bindTooltip(place.name, { direction: 'top', offset: [0, -6] });
    place.marker.on('click', () => selectPlace(place, { fromMap: true }));
    return place;
  });
}

// ---------------------------------------------------------------------------
// Filtering and rendering
// ---------------------------------------------------------------------------

function matchesFilters(place) {
  const { filters } = state;
  if (filters.freeOnly && place.access !== 'free') {
    return false;
  }
  if (filters.wheelchair && place.wheelchair !== true) {
    return false;
  }
  if (filters.changingTable && place.changingTable !== true) {
    return false;
  }
  if (filters.genderNeutral && place.genderNeutral !== true) {
    return false;
  }
  if (filters.verified && !place.verified) {
    return false;
  }
  if (!filters.showClosed && place.statusInfo.status === 'closed') {
    return false;
  }
  return true;
}

function byStatusThenDistance(a, b) {
  return STATUS_RANK[a.statusInfo.status] - STATUS_RANK[b.statusInfo.status] || a.distance - b.distance;
}

function render() {
  const now = new Date();

  const visible = [];
  for (const place of state.places) {
    place.statusInfo = describeStatus(place, now);
    place.distance = state.center.distanceTo(place.latlng);
    const show = matchesFilters(place) || place === state.selected;
    if (show) {
      visible.push(place);
    }
    // Only add or remove markers whose visibility changed, so an open popup stays open.
    if (show && !markerLayer.hasLayer(place.marker)) {
      markerLayer.addLayer(place.marker);
    } else if (!show && markerLayer.hasLayer(place.marker)) {
      markerLayer.removeLayer(place.marker);
    }
  }

  const nearby = visible.filter((place) => place.distance <= SEARCH_RADIUS).sort(byStatusThenDistance);
  const openCount = nearby.filter((place) => place.statusInfo.status === 'open').length;

  let rows = nearby.slice(0, state.shown);
  if (nearby.length === 0) {
    // Nothing in range: show the five closest matches anywhere so there's always a next step.
    rows = visible.sort((a, b) => a.distance - b.distance).slice(0, 5);
    summaryEl.textContent = rows.length > 0 ?
      'No matching restrooms within 0.5 mi. These are the closest ones:' :
      'No restrooms match these filters. Turn off a filter to see more.';
  } else {
    const noun = openCount === 1 ? 'restroom' : 'restrooms';
    const unknownCount = nearby.filter((place) => place.statusInfo.status === 'unknown').length;
    const extra = unknownCount > 0 ? `, plus ${unknownCount} with unknown hours` : '';
    summaryEl.textContent = `${openCount} ${noun} open now within 0.5 mi${extra}`;
  }

  const items = rows.map((place) => buildListItem(place, (p) => selectPlace(p, { fromList: true })));
  listEl.replaceChildren(...items);

  const remaining = nearby.length - rows.length;
  if (nearby.length > 0 && remaining > 0) {
    const moreItem = document.createElement('li');
    moreItem.className = 'more';
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'more-button';
    more.textContent = `Show ${Math.min(PAGE_SIZE, remaining)} more (${remaining} left)`;
    more.addEventListener('click', () => {
      state.shown += PAGE_SIZE;
      render();
    });
    moreItem.append(more);
    listEl.append(moreItem);
  }

  if (state.selected) {
    highlight(state.selected);
  }
}

// ---------------------------------------------------------------------------
// Selection: list and map stay in sync
// ---------------------------------------------------------------------------

function highlight(place) {
  for (const other of state.places) {
    if (other.selectedStyle) {
      other.marker.setStyle(markerStyle(other));
      other.selectedStyle = false;
    }
  }
  place.marker.setStyle(markerStyle(place, true));
  place.marker.bringToFront();
  place.selectedStyle = true;

  for (const row of listEl.querySelectorAll('.result')) {
    row.classList.toggle('is-selected', row.dataset.id === String(place.id));
  }
}

function selectPlace(place, { fromMap = false, fromList = false } = {}) {
  state.selected = place;
  // A place picked from search may be hidden by a filter (for example, it's closed).
  if (!markerLayer.hasLayer(place.marker)) {
    markerLayer.addLayer(place.marker);
  }
  highlight(place);

  const openPopup = () => {
    place.marker.unbindPopup();
    place.marker.bindPopup(buildPopup(place), { maxWidth: 300, autoPanPadding: [24, 24] }).openPopup();
  };

  if (fromList) {
    // On phones the map sits above the list, so bring it into view first.
    if (window.matchMedia('(width < 900px)').matches) {
      document.querySelector('.map-area').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // Open the popup after the map finishes moving so it can pan itself into view.
    const zoom = Math.max(map.getZoom(), 16);
    if (map.getCenter().distanceTo(place.latlng) < 5 && map.getZoom() === zoom) {
      openPopup();
    } else {
      map.once('moveend', openPopup);
      map.flyTo(place.latlng, zoom, { duration: 0.6 });
    }
  } else {
    openPopup();
  }
  if (fromMap) {
    const row = listEl.querySelector(`.result[data-id="${place.id}"]`);
    if (row) {
      row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }
}

// ---------------------------------------------------------------------------
// Search point: address search, current location, dragging the map
// ---------------------------------------------------------------------------

function setCenter(latlng, { fly = true } = {}) {
  state.center = L.latLng(latlng);
  state.shown = PAGE_SIZE;
  searchArea.moveTo(state.center);
  if (fly) {
    map.flyTo(state.center, 15, { duration: 0.8 });
  }
  render();
}

/**
 * Find the person's location. Called once when the page loads and again from
 * the location button. If location is blocked or outside Philadelphia, the
 * map stays on Center City.
 */
function locateUser({ automatic = false } = {}) {
  if (!navigator.geolocation) {
    if (!automatic) {
      messageEl.textContent = 'Your browser can\'t share your location. Search for an address instead.';
    }
    return;
  }
  messageEl.textContent = 'Finding your location…';
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      if (!inPhiladelphia(coords.latitude, coords.longitude)) {
        messageEl.textContent = 'You seem to be outside Philadelphia, so the map shows Center City. Search for an address to look elsewhere.';
        return;
      }
      const here = [coords.latitude, coords.longitude];
      userMarker.show(here, coords.accuracy);
      // Don't pull the map away if the person already searched or dragged while waiting.
      if (automatic && state.movedByUser) {
        messageEl.textContent = '';
        return;
      }
      messageEl.textContent = 'Showing restrooms near you.';
      setCenter(here);
    },
    () => {
      messageEl.textContent = automatic ?
        'Showing Center City. Allow location access or search for an address to see restrooms near you.' :
        'Location access is blocked. Allow it in your browser settings, or search for an address.';
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
  );
}

/** Restroom names that match what was typed (only places with unique names). */
function matchingPlaces(query) {
  const text = query.toLowerCase();
  return state.places
    .filter((place) => ['city', 'public', 'library'].includes(place.kind) && place.name.toLowerCase().includes(text))
    .slice(0, 3)
    .map((place) => ({ type: 'place', place, main: place.name, detail: 'Restroom', lat: place.latlng.lat, lng: place.latlng.lng }));
}

async function getSuggestions(query, signal) {
  const places = matchingPlaces(query);
  let addresses = [];
  try {
    addresses = (await searchAddresses(query, { limit: 5, signal }))
      .map((result) => ({ type: 'address', ...result }));
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
  }
  return [...places, ...addresses].slice(0, 7);
}

function goToSuggestion(item) {
  state.movedByUser = true;
  if (item.type === 'place') {
    messageEl.textContent = `Showing restrooms near ${item.main}.`;
    setCenter([item.lat, item.lng], { fly: false });
    selectPlace(item.place, { fromList: true });
    return;
  }
  messageEl.textContent = `Showing restrooms near ${item.main}.`;
  setCenter([item.lat, item.lng]);
}

function initSearch() {
  const form = document.querySelector('.search');
  const input = document.querySelector('#address-search');
  const locateButton = document.querySelector('.locate-button');

  const autocomplete = initAutocomplete({
    input,
    listbox: document.querySelector('#suggestions'),
    getSuggestions,
    onChoose: goToSuggestion,
  });

  // Pressing Search (or Enter without picking a suggestion) uses the best match.
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    autocomplete.close();
    const query = input.value.trim();
    if (!query) {
      messageEl.textContent = 'Enter an address or landmark in Philadelphia.';
      input.focus();
      return;
    }
    messageEl.textContent = 'Searching…';
    try {
      const [best] = await getSuggestions(query);
      if (!best) {
        messageEl.textContent = `Couldn't find "${query}" in Philadelphia. Try a street address or a well-known place.`;
        return;
      }
      goToSuggestion(best);
    } catch {
      messageEl.textContent = 'The address search isn\'t responding. Drag the map to the area you need instead.';
    }
  });

  locateButton.addEventListener('click', () => locateUser());

  // Dragging the map searches the area in the middle of the map.
  map.on('dragend', () => {
    state.movedByUser = true;
    messageEl.textContent = 'Showing restrooms near the middle of the map.';
    setCenter(map.getCenter(), { fly: false });
  });
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

function initFilters() {
  for (const [name, key] of Object.entries(FILTER_INPUTS)) {
    const input = document.querySelector(`input[name="${name}"]`);
    input.addEventListener('change', () => {
      state.filters[key] = input.checked;
      state.shown = PAGE_SIZE;
      render();
    });
  }
}

// ---------------------------------------------------------------------------
// About dialog
// ---------------------------------------------------------------------------

function initAboutDialog() {
  const dialog = document.querySelector('#about-dialog');
  const button = document.querySelector('.about-button');
  button.addEventListener('click', () => dialog.showModal());
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

initAboutDialog();
initSearch();
initFilters();

try {
  state.places = await loadPlaces();
  render();
  locateUser({ automatic: true });
  // Opening status depends on the clock, so refresh it every minute.
  setInterval(render, 60 * 1000);
} catch (error) {
  summaryEl.textContent = `${error.message} Reload the page to try again.`;
}
