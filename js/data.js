export const exportFiles = [
  'tracts.geojson', 'indicators.json', 'comparisons.json', 'metadata.json',
  'tract_indicators.csv', 'group_summaries.csv',
  'population_group_summaries.csv',
];

export function validateData(collection, indicators, comparisons, metadata) {
  const generation = metadata.generation_id;
  if (!generation || indicators.generation_id !== generation ||
      comparisons.generation_id !== generation) {
    throw new Error('Mixed export generations. Refresh the complete R export set.');
  }
  if (collection.type !== 'FeatureCollection' || !collection.features.length) {
    throw new Error('Tract geometry is missing.');
  }
  const geoids = new Set();
  for (const feature of collection.features) {
    const p = feature.properties;
    if (!/^42101\d{6}$/.test(p.tract_geoid) || geoids.has(p.tract_geoid) ||
        p.generation_id !== generation ||
        !['Polygon', 'MultiPolygon'].includes(feature.geometry?.type) ||
        ![...metadata.transition_groups, 'Unavailable'].includes(p.transition)) {
      throw new Error('Invalid tract identifiers, geometry or generation.');
    }
    geoids.add(p.tract_geoid);
  }
  const definitions = new Map(metadata.indicators.map((d) => [d.id, d]));
  const records = new Map();
  for (const record of indicators.records) {
    const key = `${record.tract_geoid}:${record.indicator}`;
    const definition = definitions.get(record.indicator);
    const maximum = definition?.domain === 'SVI' ? 1 : 100;
    if (!geoids.has(record.tract_geoid) || !definition || records.has(key) ||
        record.generation_id !== generation ||
        (record.value !== null && (!Number.isFinite(record.value) ||
          record.value < 0 || record.value > maximum))) {
      throw new Error('Invalid or duplicate indicator record.');
    }
    records.set(key, record);
  }
  if (records.size !== geoids.size * definitions.size) {
    throw new Error('Incomplete tract–indicator grid.');
  }
  const populationGroups = new Map();
  const categoryProfiles = new Map();
  if (!Array.isArray(comparisons.population_groups) ||
      !Array.isArray(comparisons.category_profiles) ||
      !metadata.population_comparison_definition) {
    throw new Error('Population comparisons missing. Refresh the complete R export set.');
  }
  for (const profile of comparisons.category_profiles) {
    if (!metadata.transition_groups.includes(profile.transition) ||
        categoryProfiles.has(profile.transition) ||
        !Number.isInteger(profile.n_tracts) || profile.n_tracts < 1 ||
        !Number.isFinite(profile.total_population) || profile.total_population < 0 ||
        profile.n_tracts !== collection.features.filter((f) => f.properties.transition === profile.transition).length) {
      throw new Error('Invalid category population profile.');
    }
    categoryProfiles.set(profile.transition, profile);
  }
  for (const row of comparisons.population_groups) {
    const key = `${row.transition}:${row.indicator}`;
    const definition = definitions.get(row.indicator);
    const profile = categoryProfiles.get(row.transition);
    const isSVI = definition?.domain === 'SVI';
    if (!definition || !profile || populationGroups.has(key) ||
        row.generation_id !== generation || row.n_total !== profile.n_tracts ||
        !Number.isInteger(row.n_valid) || row.n_valid < 0 || row.n_valid > row.n_total ||
        row.n_missing !== row.n_total - row.n_valid ||
        row.total_population !== profile.total_population ||
        !Number.isFinite(row.covered_population) || row.covered_population < 0 || row.covered_population > row.total_population ||
        (row.population_coverage_pct !== null && (!Number.isFinite(row.population_coverage_pct) || row.population_coverage_pct < 0 || row.population_coverage_pct > 100)) ||
        (row.value !== null && (!Number.isFinite(row.value) || row.value < 0 || row.value > (isSVI ? 1 : 100))) ||
        (row.n_valid === 0 && row.value !== null) || (row.n_valid > 0 && row.value === null) ||
        (row.moe !== null && (!Number.isFinite(row.moe) || row.moe < 0 || isSVI)) ||
        row.method !== (isSVI ? 'population_weighted_mean_tract_rank' : 'pooled_acs_percentage') ||
        row.small_group !== (row.n_valid < 5)) {
      throw new Error('Invalid population comparison record.');
    }
    populationGroups.set(key, row);
  }
  if (categoryProfiles.size !== metadata.transition_groups.length ||
      populationGroups.size !== metadata.transition_groups.length * definitions.size) {
    throw new Error('Incomplete population comparison grid.');
  }
  return {collection, indicators, comparisons, metadata, records, definitions, populationGroups, categoryProfiles};
}

async function loadJSON(filename) {
  const response = await fetch(`data/${filename}`);
  if (!response.ok) throw new Error(`Unable to load ${filename} (${response.status}).`);
  return response.json();
}

export async function loadData() {
  const files = await Promise.all(exportFiles.slice(0, 4).map(loadJSON));
  return validateData(...files);
}
