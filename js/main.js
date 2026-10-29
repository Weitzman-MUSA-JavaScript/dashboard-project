// starts the app by loading the data with await and setting up the side panel
// and map using document.querySelector, their init functions and one shared event bus,
// following Week 6 main.js
import { initControls } from './controls.js';
import { initMap } from './map.js';
import { loadCcaData } from './data.js';

// creates the shared message board (event bus) that lets the side
// panel and the map talk to each other (Week 6 dom_manipulation main.js)
const events = new EventTarget();

// Load community area data
const { areas, cityTotals } = await loadCcaData();

// Create the side panel controls
const controlsEl = document.querySelector('.controls');
initControls(controlsEl, areas, events);

// Create the map (with its legend, help text)
const mapEl = document.querySelector('#map');
const map = initMap(mapEl, areas, events);

// Expose the data and map to the global scope for easier debugging later
// in the console (Week 6 data_in_js example)
Object.assign(window, { areas, cityTotals, map, events });
