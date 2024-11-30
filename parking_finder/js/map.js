import { initializeFilter } from "./spots_filter.js";

function initMap(el, spots) {
  console.log("Initializing map...");

  const map = L.map(el, { preferCanvas: true, zoomSnap: 0 });
  let spotsLayer = null; // Declare spotsLayer at function scope so it's accessible everywhere

  const Mapboxkey = 'pk.eyJ1IjoiYWF2YW5pMTAzIiwiYSI6ImNtMTgxOGkyZzBvYnQyam16bXFydTUwM3QifQ.hXw8FwWysnOw3It_Sms3UQ';
  const Mapboxstyle = 'mapbox/dark-v11';
  L.tileLayer(
    `https://api.mapbox.com/styles/v1/${Mapboxstyle}/tiles/512/{z}/{x}/{y}{r}?access_token=${Mapboxkey}`,
    { maxZoom: 16 }
  ).addTo(map);

  map.setView([38.5816, -121.4944], 12);

  // Initial creation of spots layer with all spots (but hidden)
  spotsLayer = L.geoJSON(spots, {
    pointToLayer: (feature, latlng) => {
      return L.circleMarker(latlng, {
        radius: 4,
        fillColor: "#4CAF50",
        color: "#000",
        weight: 1,
        opacity: 0, // Start with invisible points
        fillOpacity: 0 // Start with invisible points
      });
    },
  }).addTo(map);

  // Initialize filter with the created layer
  initializeFilter(spotsLayer, map);

  function updateVisibleSpots(buffer) {
    // Instead of removing and recreating layer, update visibility of existing points
    spotsLayer.eachLayer((layer) => {
      const point = layer.feature.geometry;
      const isInBuffer = turf.booleanPointInPolygon(point, buffer);
      if (isInBuffer) {
        layer.setStyle({ opacity: 1, fillOpacity: 0.8 });
      } else {
        layer.setStyle({ opacity: 0, fillOpacity: 0 });
      }
    });
  }

  return {
    map,
    updateVisibleSpots
  };
}

export { initMap };