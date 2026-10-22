import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.15.0/dist/maplibre-gl.mjs';
import { Protocol } from 'https://esm.sh/pmtiles@4.5.0';
import { csvParse } from 'https://cdn.jsdelivr.net/npm/d3-dsv@3.0.1/+esm';
import { cellToLatLng } from 'https://cdn.jsdelivr.net/npm/h3-js@4.3.0/+esm';

const panelButtons = document.querySelectorAll('[data-panel]');
const panels = document.querySelectorAll('.floating-panel');
const closeButtons = document.querySelectorAll('.close-panel');

console.log('Navigation buttons:', panelButtons);
console.log('Panels:', panels);

function closePanels() {
  for (const panel of panels) {
    panel.hidden = true;
  }

  for (const button of panelButtons) {
    button.setAttribute('aria-expanded', 'false');
  }
}

// closePanels();

function openPanel(button) {
  closePanels();

  const panelId = button.dataset.panel;
  const panel = document.getElementById(panelId);

  panel.hidden = false;
  button.setAttribute('aria-expanded', 'true');
  panel.querySelector('h2').focus();
}

// close an active panel

function closeActivePanel() {
  const activeButton = document.querySelector('[data-panel][aria-expanded="true"]',
  );
  closePanels();

  if (activeButton) {
    activeButton.focus();
  }
}

for (const button of closeButtons) {
  button.addEventListener('click', closeActivePanel);
}

for (const button of panelButtons) {
  button.addEventListener('click', () => {
    const isOpen = button.getAttribute('aria-expanded') === 'true';

    if (isOpen) {
      closePanels();
    } else {
      openPanel(button);
    }
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeActivePanel();
  }
});

const skipLink = document.querySelector('.skip-link');

skipLink.addEventListener('click', (event) => {
  event.preventDefault();

  const exploreButton = document.querySelector('[data-panel="explore-panel"]',

  );
  openPanel(exploreButton);
});

const protocol = new Protocol();

maplibregl.addProtocol('pmtiles', protocol.tile);

const map = new maplibregl.Map({
  container: 'map',
  style: 'https://tiles.openfreemap.org/styles/positron',
  center: [30.122091, -1.924965],
  zoom: 8,
  minZoom: 7.8,
});

function getTravelTimeColors(field) {
  return [
    'case',
    ['<=', ['coalesce', ['get', field], 0], 0],
    '#b8bdc5',
    [
      'step',
      ['get', field],
      '#eff3ff',
      30, '#bdd7e7',
      60, '#6baed6',
      120, '#2171b5',
    ],
  ];
}

async function loadHealthcareRows() {
  const response = await fetch('./data/rwanda-healthcare-values.csv');

  if (!response.ok) {
    throw new Error(`Could not load the CSV: ${response.status}`);
  }

  const csvText = await response.text();

  const rows = csvParse(csvText, (row) => {
    for (const key of Object.keys(row)) {
      if (key !== 'h3_index' && key !== 'country_name') {
        row[key] = row[key].trim() === '' ? null : Number(row[key]);
      }
    }

    return row;
  });

  return rows;
}

map.on('load', async () => {
  const archiveUrl = new URL('./data/rwanda-healthcare.pmtiles', document.baseURI,
  ).href;

  const facilitySelect = document.querySelector('#facility');
  const minimumTimeInput = document.querySelector('#minimum-time');
  const resetButton = document.querySelector('#reset-filters');

  const travelTimeField = `travel_time_no_sites_${facilitySelect.value}`;

  map.addSource('rwanda', {
    type: 'vector',
    url: `pmtiles://${archiveUrl}`,
    promoteId: 'h3_index',
    attribution: '<a href="https://fikadigital.org/saipoc">Fika</a>',
  });

  map.addLayer({
    'id': 'healthcare-hexagons',
    'type': 'fill',
    'source': 'rwanda',
    'source-layer': 'rwanda_healthcare',
    'paint': {
      'fill-color': getTravelTimeColors(travelTimeField),
      'fill-opacity': 0.8,
      'fill-outline-color': 'rgba(255, 255, 255, 0.15)',
    },
  });
  map.addLayer({
    'id': 'selected-hexagon-halo',
    'type': 'line',
    'source': 'rwanda',
    'source-layer': 'rwanda_healthcare',
    'filter': ['==', ['get', 'h3_index'], ''],
    'paint': {
      'line-color': '#ffffff',
      'line-width': 7,
    },
  });
  map.addLayer({
    'id': 'selected-hexagon',
    'type': 'line',
    'source': 'rwanda',
    'source-layer': 'rwanda_healthcare',
    'filter': ['==', ['get', 'h3_index'], ''],
    'paint': {
      'line-color': '#24283f',
      'line-width': 3,
    },
  });
  const legendItems = [
    { label: 'Under 30 minutes (positive values)', color: '#eff3ff' },
    { label: '30–under 60 minutes', color: '#bdd7e7' },
    { label: '60–under 120 minutes', color: '#6baed6' },
    { label: '120 minutes or more', color: '#2171b5' },
    { label: 'Uncertain / unavailable (excluded)', color: '#b8bdc5' },
  ];

  const legendList = document.querySelector('#legend-items');

  for (const item of legendItems) {
    const row = document.createElement('li');

    const swatch = document.createElement('span');
    swatch.className = 'legend-swatch';
    swatch.style.backgroundColor = item.color;
    swatch.setAttribute('aria-hidden', 'true');

    const label = document.createElement('span');
    label.textContent = item.label;

    row.append(swatch, label);
    legendList.append(row);
  }

  // Keep the dark outline and its white halo on the same cell.
  function highlightArea(hexagonId) {
    for (const layer of ['selected-hexagon-halo', 'selected-hexagon']) {
      map.setFilter(layer, ['==', ['get', 'h3_index'], hexagonId]);
    }
  }

  function showAreaDetails(row) {
    const field = `travel_time_no_sites_${facilitySelect.value}`;
    const facilityLabel =
      facilitySelect.selectedOptions[0].textContent.toLowerCase();

    const numberFormatter = new Intl.NumberFormat('en-US');
    const container = document.querySelector('#selected-area');

    const heading = document.createElement('h3');
    heading.textContent = 'Selected hexagon';

    const identifier = document.createElement('p');
    identifier.textContent = `Area ID: ${row.h3_index}`;

    const population = document.createElement('p');
    population.textContent =
      `Estimated population: ${numberFormatter.format(row.population)}`;

    const travelTime = document.createElement('p');
    travelTime.textContent =
      `Modelled walking time to ${facilityLabel}: ${row[field]} minutes`;

    const [latitude, longitude] = cellToLatLng(row.h3_index);

    function centerSelectedArea() {
      map.easeTo({
        center: [longitude, latitude],
        zoom: Math.max(map.getZoom(), 11),
        duration: 700,
      });
    }

    const viewMapButton = document.createElement('button');
    viewMapButton.type = 'button';
    viewMapButton.className = 'reset-button';
    viewMapButton.textContent = 'View selected area on map';
    viewMapButton.addEventListener('click', () => {
      closePanels();
      centerSelectedArea();
      map.getCanvas().focus();
    });

    container.replaceChildren(
      heading,
      identifier,
      population,
      travelTime,
      viewMapButton,
    );

    const resultsButton =
      document.querySelector('[data-panel="results-panel"]');

    openPanel(resultsButton);

    highlightArea(row.h3_index);
    centerSelectedArea();
  }

  function renderResults(rows, field) {
    const container = document.querySelector('#results-list');
    container.replaceChildren();

    if (rows.length === 0) {
      container.textContent =
        'No areas match these filters. Try lowering the minimum walking time.';
      return;
    }

    const sortedRows = [...rows].sort((a, b) => {
      return b.population - a.population;
    });

    const pageSize = 10;
    const pageCount = Math.ceil(sortedRows.length / pageSize);
    let currentPage = 1;
    const numberFormatter = new Intl.NumberFormat('en-US');

    const description = document.createElement('p');
    description.tabIndex = -1;

    const pagination = document.createElement('nav');
    pagination.className = 'results-pagination';
    pagination.setAttribute('aria-label', 'Result pages');

    const previousButton = document.createElement('button');
    previousButton.type = 'button';
    previousButton.textContent = 'Previous page';

    const nextButton = document.createElement('button');
    nextButton.type = 'button';
    nextButton.textContent = 'Next page';

    const pageForm = document.createElement('form');
    pageForm.className = 'page-jump';
    const pageLabel = document.createElement('label');
    pageLabel.htmlFor = 'result-page';
    pageLabel.textContent = `Page (1–${numberFormatter.format(pageCount)})`;
    const pageInput = document.createElement('input');
    pageInput.id = 'result-page';
    pageInput.type = 'number';
    pageInput.min = '1';
    pageInput.max = String(pageCount);
    pageInput.step = '1';
    pageInput.required = true;
    const goButton = document.createElement('button');
    goButton.type = 'submit';
    goButton.textContent = 'Go to page';
    pageForm.append(pageLabel, pageInput, goButton);
    pagination.append(previousButton, nextButton, pageForm);

    const list = document.createElement('ol');
    list.className = 'results-list';

    function showPage(page, moveFocus = false) {
      currentPage = page;
      const start = (page - 1) * pageSize;
      const pageRows = sortedRows.slice(start, start + pageSize);
      description.textContent =
        `Page ${numberFormatter.format(page)} of ${numberFormatter.format(pageCount)}. Showing areas ${numberFormatter.format(start + 1)}–${numberFormatter.format(start + pageRows.length)} of ${numberFormatter.format(rows.length)}, ordered by estimated population, largest first.`;
      previousButton.disabled = page === 1;
      nextButton.disabled = page === pageCount;
      pageInput.value = String(page);
      list.start = start + 1;
      list.replaceChildren();

      for (const row of pageRows) {
        const item = document.createElement('li');
        const button = document.createElement('button');

        button.type = 'button';
        button.className = 'result-button';
        button.textContent =
          `${row.h3_index} — ${numberFormatter.format(row.population)} people; ${row[field]} minutes`;

        button.addEventListener('click', () => {
          if (minimumTimeInput.getAttribute('aria-invalid') === 'true') {
            return;
          }

          showAreaDetails(row);
        });

        item.append(button);
        list.append(item);
      }

      // Announce the new range and keep focus out of removed result buttons.
      if (moveFocus) {
        description.focus();
      }
    }

    previousButton.addEventListener('click', () => {
      showPage(currentPage - 1, true);
    });
    nextButton.addEventListener('click', () => {
      showPage(currentPage + 1, true);
    });
    pageForm.addEventListener('submit', (event) => {
      event.preventDefault();
      showPage(pageInput.valueAsNumber, true);
    });

    container.append(description, pagination, list);
    showPage(1);
  }

  function updateMap() {
    const minimumMinutes = minimumTimeInput.valueAsNumber;
    const status = document.querySelector('#results-status');

    if (!Number.isInteger(minimumMinutes) || minimumMinutes < 0) {
      minimumTimeInput.setAttribute('aria-invalid', 'true');
      status.textContent =
        'Enter a whole number of minutes, zero or greater. The map retains the last valid settings.';
      return;
    }

    minimumTimeInput.removeAttribute('aria-invalid');
    highlightArea('');
    document.querySelector('#selected-area').textContent =
      'Select a hexagon to inspect its population and walking time.';

    const field = `travel_time_no_sites_${facilitySelect.value}`;
    const facilityLabel =
      facilitySelect.selectedOptions[0].textContent.toLowerCase();

    map.setPaintProperty(
      'healthcare-hexagons',
      'fill-color',
      getTravelTimeColors(field),
    );

    map.setFilter('healthcare-hexagons', [
      'all',
      ['>', ['coalesce', ['get', field], 0], 0],
      ['>=', ['coalesce', ['get', field], 0], minimumMinutes],
    ]);

    const matchingRows = healthcareRows.filter((row) => {
      const travelTime = row[field];

      return Number.isFinite(travelTime) &&
        travelTime > 0 &&
        travelTime >= minimumMinutes;
    });

    renderResults(matchingRows, field);

    let matchingPopulation = 0;

    for (const row of matchingRows) {
      matchingPopulation += row.population;
    }

    const numberFormatter = new Intl.NumberFormat('en-US');

    document.querySelector('#matching-count').textContent =
      numberFormatter.format(matchingRows.length);

    document.querySelector('#matching-population').textContent =
      numberFormatter.format(matchingPopulation);

    document.querySelector('#legend-heading').textContent =
      `Walking time to ${facilityLabel}`;

    status.textContent =
      `Showing areas at least ${minimumMinutes} minutes from ${facilityLabel}. Uncertain values are excluded.`;
  }

  function resetDashboard() {
    facilitySelect.value = 'health_centers';
    minimumTimeInput.value = '60';

    updateMap();

    map.easeTo({
      center: [30.122091, -1.924965],
      zoom: 8,
      bearing: 0,
      pitch: 0,
      duration: 700,
    });
  }

  let healthcareRows;

  document.querySelector('#results-status').textContent =
    'Loading population and travel-time records…';

  try {
    healthcareRows = await loadHealthcareRows();
  } catch (error) {
    console.error(error);

    document.querySelector('#results-status').textContent =
      'Could not load the data table. Refresh the page to try again.';

    return;
  }

  console.log('Number of records:', healthcareRows.length);
  console.log('First record:', healthcareRows[0]);
  console.log('Population type:', typeof healthcareRows[0].population);
  console.log('Identifier type:', typeof healthcareRows[0].h3_index);

  map.on('click', 'healthcare-hexagons', (event) => {
    if (minimumTimeInput.getAttribute('aria-invalid') === 'true') {
      return;
    }

    const feature = event.features[0];
    const hexagonId = feature.properties.h3_index;

    const selectedRow = healthcareRows.find((row) => {
      return row.h3_index === hexagonId;
    });

    if (!selectedRow) {
      console.error('No CSV record found for:', hexagonId);
      return;
    }

    showAreaDetails(selectedRow);
  });

  facilitySelect.addEventListener('change', updateMap);
  minimumTimeInput.addEventListener('input', updateMap);
  resetButton.addEventListener('click', resetDashboard);

  facilitySelect.disabled = false;
  minimumTimeInput.disabled = false;
  resetButton.disabled = false;

  updateMap();
});
