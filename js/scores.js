// Weighted site scores and the ranked shortlist.

const FACTORS = ['need', 'viability', 'leverage'];

// Weighted average of the three factor scores, each already 0 to 100. Tracts
// with no need score (too few residents, or mostly group quarters) stay unscored.
function scoreTract(p, weights) {
  if (p.need == null) { return null; }
  const total = FACTORS.reduce((sum, f) => sum + weights[f], 0);
  if (total === 0) { return 0; }
  return FACTORS.reduce((sum, f) => sum + p[f] * weights[f], 0) / total;
}

function applyScores(tracts, weights) {
  for (const { properties: p } of tracts.features) {
    p.score = scoreTract(p, weights);
  }
}

// Straight-line distance in miles between two tract centers.
function milesBetween(a, b) {
  const toRad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toRad;
  const dLon = (b.lon - a.lon) * toRad;
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * toRad) * Math.cos(b.lat * toRad) * Math.sin(dLon / 2) ** 2;
  return 7917.5 * Math.asin(Math.sqrt(h));
}

// Highest scores first; with spacing on, skip any tract whose center sits
// within `spacingMi` of a something already on the list, since a store would
// serve both of those tracts.
function shortlist(tracts, { size = 10, spacingMi = 0, desertsOnly = false } = {}) {
  const candidates = tracts.features
    .map((f) => f.properties)
    .filter((p) => p.score != null && (!desertsOnly || p.lila_grocery))
    .sort((a, b) => b.score - a.score);

  const picks = [];
  for (const p of candidates) {
    if (picks.length >= size) { break; }
    if (spacingMi && picks.some((q) => milesBetween(p, q) < spacingMi)) { continue; }
    picks.push(p);
  }
  return picks;
}

export { FACTORS, applyScores, shortlist, scoreTract, milesBetween };
