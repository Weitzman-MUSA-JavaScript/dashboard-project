// Tract details panel in the rail.

import { int, dollars, pct, miles } from './format.js';
import { accessClass } from './tracts.js';

const STATUS = {
  lila: 'Food desert',
  la: 'Low access',
  ok: 'Within reach',
};

function statusFor(p, definition) {
  const parts = [STATUS[accessClass(p, definition)]];
  if (p.low_income) { parts.push('Low income'); }
  if (p.unincorporated) { parts.push('Unincorporated'); }
  return parts.join(', ');
}

function renderProfile(p, definition) {
  const far = definition === 'usda' ? p.far_any : p.far_grocery;
  const farLabel = definition === 'usda' ? 'any SNAP store' : 'a grocery store';
  return `
    <p class="profile-name">${p.hood}</p>
    <p class="profile-tract">Census tract ${p.name} (${statusFor(p, definition)})</p>
    <dl class="facts">
      <dt>Residents</dt><dd>${int(p.pop)}</dd>
      <dt>Living over ${p.urban ? '1 mile' : '10 miles'} from ${farLabel}</dt><dd>${int(far)} (${pct(far, p.pop)})</dd>
      <dt>Typical distance to a grocery store</dt><dd>${miles(p.dist_grocery)}</dd>
      <dt>Households with no car</dt><dd>${int(p.nocar)} (${pct(p.nocar, p.hh)})</dd>
      <dt>Households receiving SNAP</dt><dd>${int(p.snap)} (${pct(p.snap, p.hh)})</dd>
      <dt>Median family income</dt><dd>${dollars(p.mfi)}</dd>
      <dt>Poverty rate</dt><dd>${p.pov == null ? 'n/a' : `${p.pov}%`}</dd>
      <dt>Annual grocery spending by residents</dt><dd>${dollars(p.spend)}</dd>
    </dl>`;
}

function showProfile(p, definition) {
  document.getElementById('profile-empty').hidden = true;
  const body = document.getElementById('profile-body');
  body.hidden = false;
  body.innerHTML = renderProfile(p, definition);
}

export { showProfile };
