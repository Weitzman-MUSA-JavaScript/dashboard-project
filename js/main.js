import { loadEarthquakes, loadBelts, loadCities } from "./data.js";
import { createMap, renderBelts, renderEarthquakes, setSearchCircle, flyTo, panToFeature } from "./map.js";
import { createFilterState, bindFilterControls } from "./filters.js";
import { setupCitySearch, setupGeolocation } from "./search.js";
import { renderSummary, renderLegend, showMessage } from "./ui.js";
import { filterEarthquakes, calcMetrics, calcMinDistanceToBelts, classifyRisk } from "./metrics.js";

const state = createFilterState();
let earthquakesData = null;
let beltsData = null;
let cityList = [];
let currentCenter = null;
let pendingCenter = null;

const summaryEl = document.getElementById("risk-summary");
const mapLegend = document.getElementById("map-legend");

renderSummary(summaryEl);
renderLegend(mapLegend);

const map = createMap();

function handleFeatureSelect(feature) {
  if (feature) {
    panToFeature(map, feature);
  }
}

function runSearch(center) {
  currentCenter = center;
  if (!earthquakesData || !beltsData) {
    if (center) {
      pendingCenter = center;
    }
    showMessage(summaryEl, "Datasets are still loading. Please try again shortly.");
    return;
  }
  pendingCenter = null;
  if (!center) {
    showMessage(summaryEl, "Select a city or use your location to run the analysis.");
    setSearchCircle(map, null, null);
    const filteredAll = filterEarthquakes(earthquakesData.features, null, state);
    renderEarthquakes(map, filteredAll, {
      onSelect: (_id, feature) => handleFeatureSelect(feature),
    });
    return;
  }

  setSearchCircle(map, center, state.radius);

  const results = filterEarthquakes(earthquakesData.features, center, state);
  const metrics = calcMetrics(results);
  const distanceToBelt = calcMinDistanceToBelts(center, beltsData);
  const countWithinThreeHundred = center
    ? filterEarthquakes(earthquakesData.features, center, {
      ...state,
      radius: Math.max(state.radius, 300),
    }).length
    : 0;
  const risk = classifyRisk(distanceToBelt, countWithinThreeHundred);

  renderEarthquakes(map, results, {
    onSelect: (_id, feature) => handleFeatureSelect(feature),
  });

  renderSummary(summaryEl, {
    risk,
    distanceKm: distanceToBelt,
    metrics,
    radius: state.radius,
  });
}

function handleFilterChange() {
  runSearch(currentCenter);
}

async function bootstrap() {
  try {
    const [earthquakes, belts, cities] = await Promise.all([
      loadEarthquakes(),
      loadBelts(),
      loadCities(),
    ]);
    earthquakesData = earthquakes;
    beltsData = belts;
    cityList = cities;

    renderBelts(map, beltsData);
    renderEarthquakes(map, earthquakesData.features, {
      onSelect: (_id, feature) => handleFeatureSelect(feature),
    });

    bindFilterControls(state, handleFilterChange);

    const cityInput = document.getElementById("city-input");
    const locationButton = document.getElementById("use-location");
    const clearButton = document.getElementById("clear-search");

    setupCitySearch(cityInput, cityList, (city) => {
      if (!city) return;
      const center = { lat: city.lat, lng: city.lng, label: city.value };
      cityInput.value = city.value;
      flyTo(map, center, 5);
      runSearch(center);
    }, (error) => {
      showMessage(summaryEl, error.message || "Unable to find that city.");
    });

    setupGeolocation(locationButton, (coords) => {
      const center = { lat: coords.lat, lng: coords.lng, label: "Current location" };
      flyTo(map, center, 5);
      runSearch(center);
    }, (error) => {
      showMessage(summaryEl, error.message || "Unable to access your location.");
    });

    if (clearButton) {
      clearButton.addEventListener("click", () => {
        cityInput.value = "";
        runSearch(null);
      });
    }

    if (pendingCenter) {
      runSearch(pendingCenter);
    }
  } catch (error) {
    console.error("Failed to initialise dashboard:", error);
    showMessage(summaryEl, "Failed to load datasets. Please refresh the page.");
  }
}

bootstrap();
