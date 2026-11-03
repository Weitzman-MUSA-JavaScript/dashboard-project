// How many food desert tracts the chosen definition corresponds to.

import { int, compact } from './format.js';

const STORE_WORD = { grocery: 'a grocery store', usda: 'any SNAP store' };

function renderHeadline(el, stats, def) {
  for (const span of document.querySelectorAll('[data-desert]')) {
    span.innerHTML = `${int(stats[span.dataset.desert].count)}<span class="visually-hidden"> food desert tracts</span>`;
  }
  const s = stats[def];
  el.innerHTML = `<p class="stat-sub">${compact(s.residents)} residents live in those tracts, and ${compact(s.farTotal)} people countywide live beyond reach of ${STORE_WORD[def]}.</p>`;
}

export { renderHeadline };
