// import { app, analytics } from './firebase.js';
import { initMap } from './fridge_map.js';
import { downloadFridgeData } from './fridge_data.js';
import { initFridgeList } from './fridge_list.js';

// Create event bus
const events = new EventTarget();

// Initialize map of Philadelphia and load fridge markers
const mapElement = document.querySelector('#fridgeMap');
initMap(mapElement, events);

downloadFridgeData().then((fridges) => {
  const evt = new CustomEvent('fridgedataready', { detail: fridges });
  events.dispatchEvent(evt);
});

// 3. Add search bar for zip code or neighborhood
// Add list of fridges
const fridgeListEl = document.querySelector('#fridge-list');
initFridgeList(fridgeListEl, events);

// Get user's location and zoom in to include nearest fridges
navigator.geolocation.getCurrentPosition((pos) => {
  const evt = new CustomEvent('positionfound', { detail: pos });
  events.dispatchEvent(evt);
} );
