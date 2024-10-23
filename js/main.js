import { initMap } from './fridge_map.js';
import { downloadFridgeData } from './fridge_data.js';
// import { initFridgeList } from './fridge_list.js';

// Create event bus
const events = new EventTarget();

// Planning out what I need to do
// 1. Map of Philadelphia
// TODOLATER: move this to fridge_map.js
const mapElement = document.querySelector('#fridgeMap');
initMap(mapElement, events);

downloadFridgeData().then((fridgeData) => {
  const evt = new CustomEvent('fridgedataready', { detail: fridgeData });
  events.dispatchEvent(evt);
});

// 3. Add search bar for zip code or neighborhood
// 4. Add list of fridges
const fridgeListEl = document.querySelector('#fridge-list');

events.addEventListener('fridgedataready', (evt) => {
  const { fridgeData } = evt.detail;
  initFridgeList(fridgeListEl, fridgeData, events);
});

// 5. Add tooltip with fridge name, address, and contact info

// 6. Get user's location and zoom in to include nearest fridges
navigator.geolocation.getCurrentPosition((pos) => {
  const evt = new CustomEvent('positionfound', { detail: pos });
  events.dispatchEvent(evt);
} );
