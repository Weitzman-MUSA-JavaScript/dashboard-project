// Step 3 results

import { int, money } from './format.js';

function years(n) {
  if (n == null) { return 'never'; }
  return n > 99 ? 'over 99 years' : `${Math.round(n)} years`;
}

function renderResults(el, r) {
  const fresh = Math.max(r.sales - r.shifted, 0);
  const share = r.sales ? Math.round((r.shifted / r.sales) * 100) : 0;
  el.innerHTML = `
    <p class="lead-number">${int(r.newlyReached)}</p>
    <p class="lead-label">residents newly within a mile of a grocery store</p>
    <p class="lead-sub">${int(r.desertReached)} of them in food desert tracts, and ${int(r.carFreeReached)} car-free households</p>
    <h3 class="ledger-group">Where the new stores' sales come from</h3>
    <div class="split" role="img" aria-label="${share}% of new store sales come from existing stores">
      <span class="split-old" style="width: ${share}%"></span><span class="split-new" style="width: ${100 - share}%"></span>
    </div>
    <p class="split-key"><span><i class="key-old"></i>${money(r.shifted)} from existing stores</span><span><i class="key-new"></i>${money(fresh)} new to the area</span></p>
    <h3 class="ledger-group">What the city gets back</h3>
    <p class="payback">${money(r.cost)} incentives &divide; ${money(r.cityRevenue)} a year in city tax = <b>${years(r.payback)}</b></p>
    <dl class="ledger">
      <div><dt>Projected grocer sales a year</dt><dd>${money(r.sales)}</dd></div>
    </dl>`;
}

export { renderResults };