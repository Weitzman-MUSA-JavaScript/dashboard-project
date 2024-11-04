const eventBus = new EventTarget();

let food, clothing, showers, toilets, intakeCenters;

async function fetchResources() {
  [food, clothing, showers, toilets, intakeCenters] = await Promise.all([
    fetch('data/FreeFood.geojson').then(res => res.json()),
    fetch('data/FreeClothingAll.geojson').then(res => res.json()),
    fetch('data/FreeShowersLaundry.geojson').then(res => res.json()),
    fetch('data/FreeToilets.geojson').then(res => res.json()),
    fetch('data/IntakeCenters.geojson').then(res => res.json())
  ]);
  console.log('Resources fetched:', { food, clothing, showers, toilets, intakeCenters });
}

import { initializeResourceMap } from './resource-map.js';
import { initializeAddressSearch } from './address-search.js';

async function initializeApp() {
  await fetchResources();
  
  const resourceData = { food, clothing, showers, toilets, intakeCenters };
  
  const resourceMap = initializeResourceMap(eventBus, resourceData);
  console.log('Map initialized:', resourceMap);

  initializeAddressSearch(resourceMap);
}

// Ensure the app initializes after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});