import {loadData} from './data.js';
import {createMap, transitionColors} from './map.js';
import {formatValue} from './profile.js';
import {initializeDashboard} from './dashboard.js';
import {escapeHTML, htmlToElement} from './template-tools.js';
import {initializeAddressSearch} from './address-search.js';

async function start() {
  const status = document.querySelector('#status');
  try {
    const data = await loadData();
    for (const [label, color] of Object.entries(transitionColors)) {
      const item = htmlToElement(`<li><span class="swatch" aria-hidden="true"></span>${escapeHTML(label)}</li>`);
      const swatch = item.querySelector('.swatch');
      swatch.style.backgroundColor = color;
      if (label === 'Unavailable') swatch.classList.add('unavailable');
      document.querySelector('#legend').append(item);
    }
    document.querySelector('#benchmark').textContent = formatValue(data.metadata.benchmark_rate_10k, 2);
    let map;
    if (typeof L === 'undefined') {
      document.querySelector('#map-status').textContent = 'Map library unavailable. Use the tract table to select a profile.';
    } else {
      map = createMap(data.collection, (geoid) => dashboard?.selectTract(geoid));
    }
    const dashboard = initializeDashboard(data, map);
    initializeAddressSearch(data, dashboard.selectAddressTract);
    status.textContent = `Loaded ${data.collection.features.length} tracts and ${data.definitions.size} contextual measures. Search, filter, or select a tract.`;
  } catch (error) {
    status.textContent = `Data unavailable: ${error.message}`;
  }
}

start();
