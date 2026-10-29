// Plan step: place stores within the recruitment fund, see what the impact is,
// and save plans to compare.

import { FORMATS, DEFAULT_ASSUMPTIONS, evaluate } from './model.js';
import { findFeature, inFeature } from './geo.js';
import { money, compact } from './format.js';
import { renderResults } from './results.js';
import { shortlist } from './scores.js';

const REACH_METERS = 1609.344;
const STORAGE_KEY = 'houston-grocery-gap-plans';
const SUMMARY_FIELDS = ['stores', 'cost', 'newlyReached', 'cityRevenue', 'sales'];

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

// Storage can be full / blocked (private windows, settings), so
// failures fall back to temporary storage.
function readStorage() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function writeStorage(plans) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    return true;
  } catch {
    return false;
  }
}

// Funds can go to food deserts or Opportunity Zones.
function isEligible(p) {
  return Boolean(p && (p.lila_grocery || p.oz_eligible || p.oz_nominated));
}

function createPlanner({ map, tracts, blocks, stops, city }) {
  const el = (id) => document.getElementById(id);
  const tractRows = tracts.features.map((f) => f.properties);
  const inCity = (lon, lat) => city.features.some((f) => inFeature(lon, lat, f));
  const layer = L.layerGroup();
  let assumptions = structuredClone(DEFAULT_ASSUMPTIONS);
  let stores = [];
  let nextId = 1;
  let result = null;
  let saved = readStorage();

  function say(message) {
    el('plan-message').textContent = message;
  }

  function currentFormat() {
    return document.querySelector('input[name="format"]:checked').value;
  }

  // Input elements for the planning assumptions.
  const ASSUME_INPUTS = [
    ['a-budget', (v) => { assumptions.budget = v * 1e6; }, () => assumptions.budget / 1e6],
    ['a-incentive-full', (v) => { assumptions.incentive.full = v * 1e6; }, () => assumptions.incentive.full / 1e6],
    ['a-incentive-small', (v) => { assumptions.incentive.small = v * 1e6; }, () => assumptions.incentive.small / 1e6],
    ['a-floor-full', (v) => { assumptions.floor.full = v * 1e6; }, () => assumptions.floor.full / 1e6],
    ['a-floor-small', (v) => { assumptions.floor.small = v * 1e6; }, () => assumptions.floor.small / 1e6],
    ['a-value-full', (v) => { assumptions.buildingValue.full = v * 1e6; }, () => assumptions.buildingValue.full / 1e6],
    ['a-value-small', (v) => { assumptions.buildingValue.small = v * 1e6; }, () => assumptions.buildingValue.small / 1e6],
    ['a-taxable', (v) => { assumptions.taxableShare = v / 100; }, () => assumptions.taxableShare * 100],
  ];

  // Read the current values of the assumption inputs.
  function readAssumptions() {
    for (const [id, set] of ASSUME_INPUTS) {
      const v = Number(el(id).value);
      if (el(id).value !== '' && Number.isFinite(v) && v >= 0) { set(v); }
    }
  }

  function writeAssumptions() {
    for (const [id, , get] of ASSUME_INPUTS) {
      el(id).value = String(get());
    }
  }

  function committed() {
    return stores.reduce((sum, s) => sum + assumptions.incentive[s.format], 0);
  }


  function place(latlng, known = null) {
    const tract = known ? null : findFeature(latlng.lng, latlng.lat, tracts);
    const p = known || (tract && tract.properties);
    if (!isEligible(p)) {
      say("Recruitment funds can't go here. Choose a shaded tract.");
      return;
    }
    const format = currentFormat();
    const cost = assumptions.incentive[format];
    if (committed() + cost > assumptions.budget) {
      say(`Over budget. This ${FORMATS[format].label.toLowerCase()} needs ${money(cost)} and the fund has ${money(assumptions.budget - committed())} left.`);
      return;
    }
    stores.push({ id: nextId++, format, lat: latlng.lat, lon: latlng.lng, hood: p.hood });
    say(`Placed a ${FORMATS[format].label.toLowerCase()} in ${p.hood}.`);
    update();
  }

  // A store dropped outside an eligible tract snaps back on the redraw.
  function move(id, latlng) {
    const store = stores.find((s) => s.id === id);
    const tract = findFeature(latlng.lng, latlng.lat, tracts);
    if (!isEligible(tract && tract.properties)) {
      say('That spot is not eligible for recruitment funds, so the store went back.');
    } else {
      store.lat = latlng.lat;
      store.lon = latlng.lng;
      store.hood = tract.properties.hood;
      say(`Moved the store to ${store.hood}.`);
    }
    update();
  }

  function remove(id) {
    stores = stores.filter((s) => s.id !== id);
    say('Removed the store.');
    update();
  }

  // Stores that won't reach break-even sales turn red on the map and the list.
  function pinHtml(s, i) {
    return `<span class="plan-pin${s.viable ? '' : ' is-weak'}${s.format === 'small' ? ' is-small' : ''}">${i + 1}</span>`;
  }

  function drawMap() {
    layer.clearLayers();
    result.stores.forEach((s, i) => {
      const color = s.viable ? '#1f7a4d' : '#9b2c12';
      L.circle([s.lat, s.lon], {
        radius: REACH_METERS,
        pane: 'zonePane',
        interactive: false,
        color,
        weight: 1.5,
        dashArray: '4 4',
        fillColor: color,
        fillOpacity: 0.08,
      }).addTo(layer);
      const icon = L.divIcon({ className: 'plan-marker', html: pinHtml(s, i), iconSize: [28, 28] });
      L.marker([s.lat, s.lon], { icon, pane: 'rankPane', draggable: true, keyboard: false, title: `Store ${i + 1}, drag to move` })
        .on('dragend', (e) => move(s.id, e.target.getLatLng()))
        .addTo(layer);
    });
  }

  function storeFacts(s) {
    const facts = [`${money(s.sales)} a year`, `${s.stopsNearby} bus stops within &frac14; mile`];
    if (!s.viable) { facts.unshift('<b class="weak">Below break-even sales</b>'); }
    if (!s.inCity) { facts.push('outside city limits'); }
    return facts.join(', ');
  }

  function drawList() {
    const spent = result.cost;
    el('budget-text').textContent = `${money(spent)} of ${money(assumptions.budget)} committed`;
    el('budget-fill').style.width = `${assumptions.budget ? Math.min(100, (spent / assumptions.budget) * 100) : 0}%`;
    for (const span of document.querySelectorAll('[data-cost]')) {
      span.textContent = money(assumptions.incentive[span.dataset.cost]);
    }

    el('plan-empty').hidden = stores.length > 0;
    if (!stores.length) {
      el('plan-results').innerHTML = '';
      el('plan-stores').innerHTML = '';
      return;
    }
    renderResults(el('plan-results'), result);
    el('plan-stores').innerHTML = result.stores.map((s, i) => `
      <li class="plan-store">
        ${pinHtml(s, i)}
        <span class="plan-store-main">
          <span class="plan-store-name">${FORMATS[s.format].label}, ${escapeHtml(s.hood)}</span>
          <span class="plan-store-facts">${storeFacts(s)}</span>
        </span>
        <button type="button" class="btn small" data-remove="${s.id}" aria-label="Remove store ${i + 1}">Remove</button>
      </li>`).join('');
  }

  function drawSaved() {
    el('compare-rows').innerHTML = saved.map((p, i) => `
      <tr>
        <th scope="row">${escapeHtml(p.name)}</th>
        <td class="num">${p.summary.stores}</td>
        <td class="num">${money(p.summary.cost)}</td>
        <td class="num">${compact(p.summary.newlyReached)}</td>
        <td class="num">${money(p.summary.cityRevenue)}</td>
        <td class="row-actions">
          <button type="button" class="btn small" data-load="${i}">Load</button>
          <button type="button" class="btn small" data-delete="${i}" aria-label="Delete ${escapeHtml(p.name)}">Delete</button>
        </td>
      </tr>`).join('');
    el('compare').hidden = saved.length === 0;
  }

  function update() {
    readAssumptions();
    result = evaluate({ stores, assumptions }, { blocks, tracts: tractRows, stops, inCity });
    drawMap();
    drawList();
  }

  el('plan-stores').addEventListener('click', (e) => {
    const button = e.target.closest('[data-remove]');
    if (button) { remove(Number(button.dataset.remove)); }
  });

  el('plan-clear').addEventListener('click', () => {
    stores = [];
    el('plan-name').value = '';
    say('Cleared the plan.');
    update();
  });

  // ## Saving, loading, export and import

  function summarize() {
    return {
      stores: result.stores.length,
      cost: result.cost,
      newlyReached: Math.round(result.newlyReached),
      cityRevenue: Math.round(result.cityRevenue),
      sales: Math.round(result.sales),
    };
  }

  function load(p) {
    stores = p.stores.map((s) => ({ ...s, id: nextId++ }));
    assumptions = { ...structuredClone(DEFAULT_ASSUMPTIONS), ...structuredClone(p.assumptions) };
    writeAssumptions();
    el('plan-name').value = p.name;
    update();
  }

  // Saving under a name that's already taken replaces that plan.
  el('plan-save').addEventListener('click', () => {
    if (!stores.length) {
      say('Place at least one store before saving.');
      return;
    }
    const name = el('plan-name').value.trim() || `Plan ${saved.length + 1}`;
    const entry = {
      name,
      stores: stores.map(({ format, lat, lon, hood }) => ({ format, lat, lon, hood })),
      assumptions: structuredClone(assumptions),
      summary: summarize(),
    };
    const existing = saved.findIndex((p) => p.name === name);
    if (existing >= 0) { saved[existing] = entry; } else { saved.push(entry); }
    say(writeStorage(saved) ? `Saved "${name}".` : `Saved "${name}" for this visit only. This browser is blocking storage, so export it to keep it.`);
    drawSaved();
  });

  el('compare-rows').addEventListener('click', (e) => {
    const loadButton = e.target.closest('[data-load]');
    const deleteButton = e.target.closest('[data-delete]');
    if (loadButton) {
      const p = saved[Number(loadButton.dataset.load)];
      load(p);
      say(`Loaded "${p.name}".`);
    } else if (deleteButton) {
      const [p] = saved.splice(Number(deleteButton.dataset.delete), 1);
      writeStorage(saved);
      say(`Deleted "${p.name}".`);
      drawSaved();
    }
  });

  el('plan-export').addEventListener('click', () => {
    if (!saved.length) {
      say('Save a plan before exporting.');
      return;
    }
    const blob = new Blob([JSON.stringify({ app: 'houston-grocery-gap', plans: saved }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'grocery-plans.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  // Keep only plans and stores that look right, and force the summary to
  // numbers, since the table writes them straight into the page.
  el('plan-import').addEventListener('change', async (e) => {
    const [file] = e.target.files;
    if (!file) { return; }
    try {
      const data = JSON.parse(await file.text());
      const plans = (data.plans || []).filter((p) => p && p.name && Array.isArray(p.stores) && p.summary);
      for (const p of plans) {
        p.stores = p.stores.filter((s) => FORMATS[s.format] && Number.isFinite(s.lat) && Number.isFinite(s.lon));
        p.summary = Object.fromEntries(SUMMARY_FIELDS.map((k) => [k, Number(p.summary[k]) || 0]));
        const i = saved.findIndex((q) => q.name === p.name);
        if (i >= 0) { saved[i] = p; } else { saved.push(p); }
      }
      writeStorage(saved);
      drawSaved();
      say(plans.length ? `Imported ${plans.length} plan${plans.length === 1 ? '' : 's'}.` : 'No plans found in that file.');
    } catch {
      say('That file could not be read. Choose a plans file exported from this tool.');
    }
    e.target.value = '';
  });

  for (const [id] of ASSUME_INPUTS) {
    el(id).addEventListener('change', update);
  }


  const siteSelect = el('site-pick');

  function refreshSites() {
    const eligible = { features: tracts.features.filter((f) => isEligible(f.properties)) };
    const sites = shortlist(eligible, { size: 40, spacingMi: 2 });
    siteSelect.innerHTML = sites
      .map((p) => `<option value="${p.geoid}">${Math.round(p.score)}: ${escapeHtml(p.hood)}, tract ${p.name}</option>`)
      .join('');
  }

  el('site-add').addEventListener('click', () => {
    const p = tractRows.find((q) => q.geoid === siteSelect.value);
    if (p) { place(L.latLng(p.lat, p.lon), p); }
  });

  function show(visible) {
    if (visible) {
      refreshSites();
      layer.addTo(map);
    } else {
      layer.remove();
    }
  }

  update();
  drawSaved();
  return { place, show };
}

export { createPlanner };