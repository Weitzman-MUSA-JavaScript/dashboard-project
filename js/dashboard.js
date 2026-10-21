import {filterTracts, summarizeTracts} from './filter.js';
import {formatValue, renderProfile} from './profile.js';
import {transitionColors} from './map.js';
import {escapeHTML, htmlToElement} from './template-tools.js';
import {initializeCategorySummary} from './category-summary.js';

/**
 * Connect shared filter and selection state to map, table, and profile.
 * @param {Object} data Validated R exports and keyed indicator records.
 * @param {Object} map Optional Leaflet wrapper; tables work without it.
 * @return {Object} Selection entry point for map clicks.
 */
export function initializeDashboard(data, map) {
  const features = data.collection.features;
  const byGeoid = new Map(features.map((f) => [f.properties.tract_geoid, f]));
  const state = {query: '', transition: 'all'};
  let selectedTract = null;
  let activeGeoids = new Set();
  const status = document.querySelector('#status');
  const search = document.querySelector('#tract-search');
  const transition = document.querySelector('#transition-filter');
  const pillButtons = new Map();
  const highlightCategory = initializeCategorySummary(data);

  const clearSelection = () => {
    selectedTract = null;
    map?.select(null);
    document.querySelector('#profile-title').textContent = 'Select a tract';
    document.querySelector('#profile-details').replaceChildren();
  };

  const updateSelectionButtons = () => {
    for (const button of document.querySelectorAll('[data-geoid]')) {
      button.setAttribute('aria-pressed', String(button.dataset.geoid === selectedTract));
    }
  };

  const selectTract = (geoid) => {
    if (!activeGeoids.has(geoid)) return;
    const feature = byGeoid.get(geoid);
    selectedTract = geoid;
    renderProfile(feature.properties, data);
    map?.select(geoid);
    updateSelectionButtons();
    status.textContent = `Selected tract ${feature.properties.tract_name}. Details updated in the tract profile.`;
  };

  const renderTable = (activeTracts) => {
    const fragment = document.createDocumentFragment();
    for (const {properties: p} of activeTracts) {
      const poverty = data.records.get(`${p.tract_geoid}:poverty`);
      const row = htmlToElement(`<tr>
        <th scope="row"><button type="button" data-geoid="${escapeHTML(p.tract_geoid)}" aria-pressed="${p.tract_geoid === selectedTract}">Tract ${escapeHTML(p.tract_name)}</button></th>
        <td>${escapeHTML(p.tract_geoid)}</td><td>${escapeHTML(p.transition)}</td>
        <td>${escapeHTML(formatValue(p.early_count, 0))}</td>
        <td>${escapeHTML(formatValue(p.late_count, 0))}</td>
        <td>${escapeHTML(formatValue(poverty?.value))}</td>
      </tr>`);
      row.querySelector('button').addEventListener('click', () => selectTract(p.tract_geoid));
      fragment.append(row);
    }
    if (!activeTracts.length) {
      fragment.append(htmlToElement('<tr><td colspan="6">No tracts match these filters. Try another search or reset filters.</td></tr>'));
    }
    document.querySelector('#tract-rows').replaceChildren(fragment);
    document.querySelector('#tract-table-caption').textContent =
      `${activeTracts.length} matching tracts. Select a tract for its profile. Poverty: ACS 2020–2024.`;
  };

  const renderFilteredViews = () => {
    const activeTracts = filterTracts(features, state);
    activeGeoids = new Set(activeTracts.map((f) => f.properties.tract_geoid));
    let selectionNote = '';
    if (selectedTract && !activeGeoids.has(selectedTract)) {
      clearSelection();
      selectionNote = ' Selection cleared because it no longer matches.';
      status.textContent = 'Selected tract no longer matches the filters; profile cleared.';
    }
    renderTable(activeTracts);
    map?.filter(activeGeoids);
    highlightCategory(state.transition);
    const summary = summarizeTracts(activeTracts);
    const missingNote = summary.earlyMissing || summary.lateMissing ?
      ` Missing counts: ${summary.earlyMissing} early-period and ${summary.lateMissing} recent-period tracts; affected totals are unavailable.` : '';
    document.querySelector('#filter-summary').textContent =
      `${summary.tracts} of ${features.length} tracts · Firearm assault injuries: 2020–2022 ${formatValue(summary.earlyTotal, 0)}; 2023–2025 ${formatValue(summary.lateTotal, 0)}; net change ${formatValue(summary.change, 0)}.${missingNote}${selectionNote}`;
    const searched = summarizeTracts(filterTracts(features, {...state, transition: 'all'}));
    for (const [label, button] of pillButtons) {
      const count = label === 'all' ? searched.tracts : (searched.categories[label] || 0);
      button.querySelector('.category-count').textContent = formatValue(count, 0);
      button.setAttribute('aria-pressed', String(state.transition === label));
    }
  };

  for (const label of ['all', ...Object.keys(transitionColors)]) {
    const color = transitionColors[label];
    const button = htmlToElement(`<button type="button" aria-pressed="false">
      ${color ? '<span class="swatch" aria-hidden="true"></span>' : ''}
      ${escapeHTML(label === 'all' ? 'All categories' : label)}: <span class="category-count">0</span>
    </button>`);
    if (color) {
      button.querySelector('.swatch').style.backgroundColor = color;
      if (label === 'Unavailable') button.querySelector('.swatch').classList.add('unavailable');
    }
    button.addEventListener('click', () => {
      state.transition = label;
      transition.value = label;
      renderFilteredViews();
    });
    pillButtons.set(label, button);
    document.querySelector('#category-pills').append(button);
  }
  search.addEventListener('input', () => {
    state.query = search.value;
    renderFilteredViews();
  });
  transition.addEventListener('change', () => {
    state.transition = transition.value;
    renderFilteredViews();
  });
  document.querySelector('#reset-filters').addEventListener('click', () => {
    state.query = '';
    state.transition = 'all';
    search.value = '';
    transition.value = 'all';
    renderFilteredViews();
  });
  document.querySelector('#reset').addEventListener('click', () => {
    clearSelection();
    updateSelectionButtons();
    map?.reset();
    status.textContent = 'Selection cleared. Map reset; current filters retained.';
  });
  for (const control of [search, transition, document.querySelector('#reset-filters'), document.querySelector('#reset')]) {
    control.disabled = false;
  }
  renderFilteredViews();
  const selectAddressTract = (geoid) => {
    if (!byGeoid.has(geoid)) return false;
    state.query = '';
    state.transition = 'all';
    search.value = '';
    transition.value = 'all';
    renderFilteredViews();
    selectTract(geoid);
    map?.focus(geoid);
    return true;
  };
  return {selectTract, selectAddressTract};
}
