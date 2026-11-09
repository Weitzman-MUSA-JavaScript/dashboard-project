/**
 * Helper to normalize strings
 */
const normalizeText = (str) =>
  (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

/**
 * Filter wine features
 */
function filtertype(selectedTypes = [], features = []) {
  if (selectedTypes.length === 0) return features;

  return features.filter((feature) => {
    const wineType = feature.properties.type || '';
    const featureTypes = wineType.split(',').map((t) => normalizeText(t));

    return selectedTypes.some((selected) => {
      const normSelected = normalizeText(selected);
      return featureTypes.some((ft) => ft.includes(normSelected));
    });
  });
}

function filterfood(selectedfood = [], features = []) {
  if (selectedfood.length === 0) return features;

  return features.filter((feature) => {
    const food = feature.properties.foodpair || '';
    const featureFood = food.split(',').map((f) => normalizeText(f));

    return selectedfood.some((selected) => {
      const normSelected = normalizeText(selected);
      return featureFood.some((ff) => ff.includes(normSelected));
    });
  });
}

function filterflavor(selectedflavor = '', features = []) {
  const normSelected = normalizeText(selectedflavor);
  if (selectedflavor === '' || selectedflavor.trim() === '') return features;

  return features.filter((feature) => {
    const flavor = feature.properties.flavor || '';
    const featureFlavors = flavor.split(',').map((f) => normalizeText(f));
    return featureFlavors.some((ff) => ff.includes(normSelected));
  });
}

function filterWineData(features = [], selectedTypes = [], selectedfood = [], selectedflavor = '') {
  let result = filtertype(selectedTypes, features);
  result = filterfood(selectedfood, result);
  result = filterflavor(selectedflavor, result);
  return result;
}

export {
  filtertype,
  filterfood,
  filterflavor,
  filterWineData,
};
