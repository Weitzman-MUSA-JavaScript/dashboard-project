// Census tract layer shaded by grocery access

const FILLS = {
  lila: '#c4441c',
  la: '#f2b48c',
  ok: '#f7f8f5',
};
const SCORE_BREAKS = [20, 40, 60, 80];
const SCORE_FILLS = ['#eef4f3', '#c3dcdb', '#86b8b9', '#3f8589', '#14525e'];
const UNSCORED = '#d9dbd6';

const PLAN_FILLS = {
  desert: FILLS.lila,
  zone: SCORE_FILLS[2],
  closed: UNSCORED,
};

const DEFINITIONS = {
  grocery: { lila: 'lila_grocery', la: 'la_grocery', far: 'far_grocery' },
  usda: { lila: 'lila_usda', la: 'la_usda', far: 'far_any' },
};

// lila = low income and low access (a food desert). la = low access only.
function accessClass(p, definition) {
  const fields = DEFINITIONS[definition];
  if (p[fields.lila]) { return 'lila'; }
  if (p[fields.la]) { return 'la'; }
  return 'ok';
}

function scoreFill(score) {
  if (score == null) { return UNSCORED; }
  const i = SCORE_BREAKS.findIndex((b) => score < b);
  return SCORE_FILLS[i === -1 ? SCORE_FILLS.length - 1 : i];
}

function tractStyle(p, state) {
  const selected = p.geoid === state.selected;
  const outline = {
    color: selected ? '#1a211d' : 'rgb(18 26 22 / 22%)',
    weight: selected ? 2.5 : 0.5,
  };
  if (state.mode === 'plan') {
    const fill = p.lila_grocery ? PLAN_FILLS.desert : (p.oz_eligible || p.oz_nominated ? PLAN_FILLS.zone : PLAN_FILLS.closed);
    return { ...outline, fillColor: fill, fillOpacity: fill === PLAN_FILLS.closed ? 0.2 : 0.6 };
  }
  if (state.mode === 'rank') {
    return { ...outline, fillColor: scoreFill(p.score), fillOpacity: 0.8 };
  }
  const cls = accessClass(p, state.definition);
  return { ...outline, fillColor: FILLS[cls], fillOpacity: cls === 'ok' ? 0.35 : 0.78 };
}

function tooltipFor(p, state) {
  if (state.mode === 'plan') {
    const open = p.lila_grocery || p.oz_eligible || p.oz_nominated;
    return open ? `${p.hood}, tract ${p.name}` : `${p.hood}, tract ${p.name}<br>Not eligible for recruitment funds`;
  }
  if (state.mode === 'rank') {
    const score = p.score == null ? 'not scored' : `score ${Math.round(p.score)}`;
    return `${p.hood}, tract ${p.name}<br>${score}`;
  }
  return `${p.hood}, tract ${p.name}`;
}

function createTractLayer(tracts, state, onSelect) {
  const layer = L.geoJSON(tracts, {
    style: (f) => tractStyle(f.properties, state),
    onEachFeature: (f, l) => {
      l.bindTooltip(() => tooltipFor(f.properties, state), { sticky: true });
      l.on('click', () => onSelect(f.properties.geoid));
    },
  });

  // Recolor when the definition or selection changes instead of
  // rebuilding the layer.
  layer.restyle = () => {
    layer.eachLayer((l) => {
      l.setStyle(tractStyle(l.feature.properties, state));
      if (l.feature.properties.geoid === state.selected) { l.bringToFront(); }
    });
  };

  return layer;
}

// Headline numbers (desert tracts, population, and residents beyond reach of a store)
function summarize(tracts, definition) {
  const fields = DEFINITIONS[definition];
  let count = 0;
  let residents = 0;
  let farTotal = 0;
  for (const { properties: p } of tracts.features) {
    farTotal += p[fields.far];
    if (p[fields.lila]) {
      count += 1;
      residents += p.pop;
    }
  }
  return { count, residents, farTotal };
}

export { FILLS, SCORE_BREAKS, SCORE_FILLS, UNSCORED, createTractLayer, summarize, accessClass, PLAN_FILLS };
