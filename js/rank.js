// Ranking step: weight sliders, the shortlist and numbered map markers.

import { FACTORS, applyScores, shortlist } from './scores.js';
import { int, dollars } from './format.js';

const SPACING_MI = 2;

function weightShare(weights, factor) {
  const total = FACTORS.reduce((sum, f) => sum + weights[f], 0);
  if (total === 0) { return '0%'; }
  return `${Math.round((weights[factor] / total) * 100)}%`;
}

function itemHtml(p, i) {
  const zone = p.oz_nominated ? 'zone nominee' : (p.oz_eligible ? 'zone eligible' : '');
  return `
    <li>
      <button class="pick" type="button" data-geoid="${p.geoid}">
        <span class="pick-head">
          <span class="pick-rank">${i + 1}</span>
          <span class="pick-name">${p.hood} <span class="pick-tract">tract ${p.name}</span></span>
          <span class="pick-score"><span class="visually-hidden">Score </span>${Math.round(p.score)}</span>
        </span>
        <span class="pick-facts">${int(p.far_grocery)} beyond reach, ${dollars(p.market)} unserved${zone ? `, ${zone}` : ''}</span>
      </button>
    </li>`;
}

function createRanking({ map, tracts, state, onSelect, onChange }) {
  const spacingEl = document.getElementById('opt-spacing');
  const desertsEl = document.getElementById('opt-deserts');
  const listEl = document.getElementById('shortlist');
  const markers = L.layerGroup();
  let picks = [];

  function readWeights() {
    for (const f of FACTORS) {
      state.weights[f] = Number(document.getElementById(`w-${f}`).value);
    }
    for (const f of FACTORS) {
      document.getElementById(`w-${f}-value`).textContent = weightShare(state.weights, f);
    }
  }

  function drawMarkers() {
    markers.clearLayers();
    picks.forEach((p, i) => {
      const icon = L.divIcon({
        className: 'rank-marker',
        html: `<span class="rank-num">${i + 1}</span>`,
        iconSize: [24, 24],
      });
      L.marker([p.lat, p.lon], { icon, pane: 'rankPane', keyboard: false })
        .on('click', () => onSelect(p.geoid))
        .addTo(markers);
    });
  }

  function update() {
    readWeights();
    applyScores(tracts, state.weights);
    picks = shortlist(tracts, { size: 10, spacingMi: spacingEl.checked ? SPACING_MI : 0, desertsOnly: desertsEl.checked });
    listEl.innerHTML = picks.map(itemHtml).join('');
    drawMarkers();
    onChange();
  }

  for (const f of FACTORS) {
    document.getElementById(`w-${f}`).addEventListener('input', update);
  }
  spacingEl.addEventListener('change', update);
  desertsEl.addEventListener('change', update);

  // One listener on the list handles every pick, including ones drawn later.
  listEl.addEventListener('click', (e) => {
    const button = e.target.closest('.pick');
    if (!button) { return; }
    const p = picks.find((q) => q.geoid === button.dataset.geoid);
    const zoom = Math.max(map.getZoom(), 12);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      map.setView([p.lat, p.lon], zoom, { animate: false });
    } else {
      map.flyTo([p.lat, p.lon], zoom, { duration: 0.6 });
    }
    onSelect(p.geoid);
  });

  function show(visible) {
    if (visible) {
      markers.addTo(map);
    } else {
      markers.remove();
    }
  }

  update();
  return { show };
}

export { createRanking, weightShare };
