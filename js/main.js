import { loadPoisData } from './pois_data.js';
import { initMap } from './pois_map.js';

/*
Custom event types:
~~~~~~~~~~~~~~~~~~~
- typeselected: .
  Detail: {
    name (string): 
    selected (boolean): 
  }
*/
const events = new EventTarget();

// Load Yellowstone boundary and pois data...
const { boundary, pois } = await loadPoisData();

//

// Create the map...
const mapEl = document.querySelector('#map-container');
const map = initMap(mapEl, boundary, pois, events);
