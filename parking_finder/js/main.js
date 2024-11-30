import { initMap } from "./map.js";
//import { initChart } from "./stations_chart.js";
import { loadSpotsData } from "./spots_data.js";
import { initializeAddressEntry } from "./address.js";
import { updateVisualizations } from "./chart.js";
import { filterSpotsByBuffer } from "./spots_filter.js";

// make sure you call event bus before all the functions
const events = new EventTarget(); // events object here is the event bus

// Load neighborhood and station data...
const { spots } = await loadSpotsData();

// Create the map...
const mapEl = document.querySelector("#map");
const { map, updateVisibleSpots } = initMap(mapEl, spots);

initializeAddressEntry(events);

function clearSearchBuffer() {
  if (window.searchBuffer && map) {
    map.removeLayer(window.searchBuffer);
    window.searchBuffer = null;
  }
}

events.addEventListener('address-zoom-map', (evt) => {
    const { lat, lon, buffer } = evt.detail;
    
    // Remove existing buffer 
    clearSearchBuffer();
  
    // Add buffer to map using Leaflet
    window.searchBuffer = L.geoJSON(buffer, {
      style: {
        color: "#FF0000",
        weight: 2,
        opacity: 1,
        fillColor: "#FF0000",
        fillOpacity: 0.2
      }
    }).addTo(map);
  
    // Update visible spots within buffer
    const result = filterSpotsByBuffer(buffer);
    updateVisualizations(result.points);


    map.fitBounds(window.searchBuffer.getBounds(), {
      padding: [50, 50]
    });

});

    events.addEventListener('reapply-filters', (evt) => {
    const { buffer } = evt.detail;
    clearSearchBuffer();  // Clear before reapplying filters
    updateVisibleSpots(buffer);
});

//const chartEl = document.querySelector("#chart > div");
//const chart = initChart(chartEl, hoods, stations);
