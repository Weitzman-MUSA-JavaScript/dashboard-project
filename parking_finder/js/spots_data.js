//import * as turf from "https://cdn.jsdelivr.net/npm/@turf/turf@7.1.0/+esm";

async function loadSpotsData() {

  // Load the parking...
  const spotsResponse = await fetch("data/clean_parking.geojson");
  const spotsCollection = await spotsResponse.json();
  const spots = spotsCollection.features;

  console.log("Spots data received:", spots);

  return { spots };
}

export { loadSpotsData };
