import { initializeMap, updateMapStations } from './map.js';
import { initializeSearch } from './search.js';
import './checkbox.js';
import './search.js';

const stationGeoJSON = await fetch('./data/station.geojson');
export const stationInfo = await stationGeoJSON.json(); // Export stationInfo for other modules

const events = new EventTarget();

// Initialize map and search functionality
const stationLayer = initializeMap(stationInfo, events);
initializeSearch(stationInfo, events);

// Listen for filter-stations event
events.addEventListener('filter-stations', (evt) => {
  const { filteredStations } = evt.detail;

  // Update the map with filtered stations
  updateMapStations(filteredStations, stationLayer);

  // Update the station list
  updateStationList(filteredStations);
});

// Trigger initial load of all stations
updateStationList(stationInfo.features);


function updateStationList(stations) {
  const listElement = document.querySelector('.station-list ol');
  listElement.innerHTML = ''; // Clear existing list

  // Deduplicate stations based on address, city, and overall_rating
  const uniqueStations = [];
  const seenKeys = new Set();

  stations.forEach((station) => {
    const key = `${station.properties.address_1}-${station.properties.city}-${station.properties.overall_rating}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueStations.push(station);
    }
  });

  // Render the deduplicated stations
  uniqueStations.forEach((station) => {
    const li = document.createElement('li');
    li.classList.add('station-item');
    li.innerHTML = `
      <div class="city">${station.properties.city || 'N/A'}</div>
      <div class="address">${station.properties.address_1 || 'N/A'}</div>
      <div class="overall_rating">Rating: ${station.properties.overall_rating || 'N/A'}</div>
    `;

    // Add click event to zoom to station
    // li.addEventListener('click', () => {
    //   const coordinates = station.geometry.coordinates;
    //   const latLng = [coordinates[1], coordinates[0]];

    //   if (map) {
    //     map.setView(latLng, 15); // Zoom to level 15 and center on the station
    //   } else {
    //     console.error("Map instance is not defined.");
    //   }
    // });
    li.addEventListener('click', () => focusOnMap(station, index, events));

    listElement.appendChild(li);
  });
}



 function focusOnMap(stadium, index, events){
  const mapZoomSelect = stadium.ID; // .dataset is get the attribute in html (get your customized attribute!)

  // define a customized event
  const zoomId = new CustomEvent('zoom-map', { detail: { mapZoomSelect }}); // define your own event
  events.dispatchEvent(zoomId);
} 


