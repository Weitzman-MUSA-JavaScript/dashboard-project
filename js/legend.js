// Map legend for whatever the current mode is

import { FILLS, SCORE_BREAKS, SCORE_FILLS, UNSCORED, PLAN_FILLS } from './tracts.js';

function row(fill, label) {
  return `<p class="legend-row"><span class="swatch fill" style="background-color: ${fill}"></span>${label}</p>`;
}

function renderLegend(el, mode) {
  if (mode === 'plan') {
    el.innerHTML = `
      <p class="legend-title">Where recruitment funds can go</p>
      ${row(PLAN_FILLS.desert, 'Food desert tract')}
      ${row(PLAN_FILLS.zone, 'Opportunity Zone eligible')}
      ${row(PLAN_FILLS.closed, 'Not eligible')}
      <p class="legend-row"><span class="legend-ring"></span>1 mile reach of a new store</p>`;
    return;
  }
  if (mode === 'rank') {
    const edges = [0, ...SCORE_BREAKS, 100];
    const rows = SCORE_FILLS.map((fill, i) => row(fill, `${edges[i]} to ${edges[i + 1]}`)).reverse();
    el.innerHTML = `
      <p class="legend-title">Site score</p>
      ${rows.join('')}
      ${row(UNSCORED, 'Not scored')}
      <p class="legend-row"><span class="rank-key">1</span>Shortlist pick</p>`;
    return;
  }
  el.innerHTML = `
    <p class="legend-title">Census tracts</p>
    ${row(FILLS.lila, 'Low income and low access')}
    ${row(FILLS.la, 'Low access only')}
    ${row(FILLS.ok, 'Within reach of a store')}`;
}

export { renderLegend };
