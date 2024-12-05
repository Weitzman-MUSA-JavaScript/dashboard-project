//call firebase 
import { app, analytics } from "./firebase.js"

//import initMap to create map
import { initMap } from "./map.js";

//import spots_data to load data
import { loadSpotsData } from "./spots_data.js";

//call initialize address function
import { initializeAddressEntry } from "./address.js";

//call in filter data
import { filterSpotsByBuffer } from "./spots_filter.js";

//call chart filter data
import { updateVisualizations } from "./charts.js";


//call the event bus before all the functions
const events = new EventTarget(); // events object here is the event bus

//search the document for the id selector #map
const mapEl = document.querySelector("#map");

//load spots from loadSpotData function. Here spots is in brackets as it
//is a feature. We are again using await here as the function is fetching
const { spots } = await loadSpotsData();

// uncomment to not spend too much on API calls
const { map, updateVisibleSpots } = initMap(mapEl, spots);

//call function to initialize address autofill

initializeAddressEntry(events);

//clear any buffer layer that was there rpeviously

function clearSearchBuffer() {
    if (window.searchBuffer && map) {
      map.removeLayer(window.searchBuffer);
      window.searchBuffer = null;
    }
  }

//add an event listener that adds a buffer to the map when zoom is dispatched

events.addEventListener('address-zoom-map', (evt) => {
    //take in the lats and longs from address
    const { lat, lon, buffer } = evt.detail;
    
    // Remove existing buffer 
    clearSearchBuffer();
  
    // Add buffer to map using Leaflet
    window.searchBuffer = L.geoJSON(buffer, {
      style: {
        color: '#e5e5e5',
        weight: 2,
        opacity: 0.2,
        fillColor: "#14213d",
        fillOpacity: 0.1,
        interactive: false
      }
    }).addTo(map);
  
    // Update visible spots within buffer
    const result = filterSpotsByBuffer(buffer);
    updateVisualizations(result.point);


    map.fitBounds(window.searchBuffer.getBounds(), {
      padding: [50, 50]
    });

});

//reapplying filters if buffer is generated again
events.addEventListener('reapply-filters', (evt) => {
  const { buffer } = evt.detail;
  clearSearchBuffer();  // Clear before reapplying filters
  updateVisibleSpots(buffer);
});