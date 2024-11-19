async function loadPoisData() {
  // Load the boundary data...
  const boundaryResponse = await fetch('data/YS_Boundary.geojson');
  const boundaryCollection = await boundaryResponse.json();
  const boundary = boundaryCollection.features[0];

  // Load the pois data...
  // The POIs data has been pre-processed in Python and the script is called `pois_data_process.ipynb`.
  const poisResponse = await fetch('data/YS_POIs.geojson');
  const poisCollection = await poisResponse.json();
  const pois = poisCollection.features;

  return { boundary, pois };
}

export { loadPoisData };
