/**
 * Apply tract-name/GEOID substring search and an optional transition filter.
*/
export function filterTracts(features, state) {
  const query = state.query.trim().toLowerCase();
  return features.filter(({properties: p}) =>
    (state.transition === 'all' || p.transition === state.transition) &&
    (String(p.tract_name).toLowerCase().includes(query) ||
      p.tract_geoid.includes(query)));
}

/**
 * Sum exported counts for a display subset without estimating new rates.
*/
export function summarizeTracts(features) {
  const result = features.reduce((summary, {properties: p}) => {
    summary.tracts += 1;
    for (const period of ['early', 'late']) {
      const value = p[`${period}_count`];
      if (Number.isFinite(value) && value >= 0) {
        summary[`${period}Known`] += value;
      } else {
        summary[`${period}Missing`] += 1;
      }
    }
    summary.categories[p.transition] = (summary.categories[p.transition] || 0) + 1;
    return summary;
  }, {tracts: 0, earlyKnown: 0, lateKnown: 0,
    earlyMissing: 0, lateMissing: 0, categories: {}});
  result.earlyTotal = result.earlyMissing ? null : result.earlyKnown;
  result.lateTotal = result.lateMissing ? null : result.lateKnown;
  result.change = result.earlyTotal === null || result.lateTotal === null ?
    null : result.lateTotal - result.earlyTotal;
  return result;
}
