// Entry module: import the map initializer and call it once the DOM is ready.
import { initMap } from './map.js';
import { initCharts, updateCharts } from './chart.js';
import { initStationChart, updateStationChart } from './graph.js';
import { initGeolocate } from './geolocate.js';
import { initIntroPrompt } from './prompt.js';

function handleFeatureSelection(feature) {
  updateCharts(feature);
  updateStationChart(feature);
}

function start() {
  initIntroPrompt();
  // Initialize the map with defaults (reads token from window.MAPBOX_TOKEN)
  // Initialize charts first so they have aggregated data ready
  initCharts();
  initStationChart();
  // Initialize the map and pass the chart update callback so clicks update charts
  const map = initMap({ onFeatureClick: handleFeatureSelection });

  initGeolocate({ map });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
