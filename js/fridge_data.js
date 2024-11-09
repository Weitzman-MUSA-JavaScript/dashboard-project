async function downloadFridgeData() {
  // Load the neighborhood data...
  const hoodsResponse = await fetch('../data/philadelphia-neighborhoods.geojson');
  const hoodsCollection = await hoodsResponse.json();
  const hoods = hoodsCollection.features;

  // Load philadelphia fridge data...
  const fridgeResponse = await fetch('../data/philadelphia-fridge.geojson');
  const fridgeData = await fridgeResponse.json();
  const fridges = fridgeData.features;

  return { hoods, fridges };
}

export { downloadFridgeData };
