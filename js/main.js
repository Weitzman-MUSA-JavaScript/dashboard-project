
import { initMap } from './create_map.js';
import { initializeHist } from './chart.js';
import { getData } from './data_cleaning.js';
import { initializeList } from './neighborhood_list.js';
import { initializeMapRendering } from './map_rendering.js';
import { initializeStatDisplay } from './stat_displaying.js';


// Event bus
const evt = new EventTarget(); 

// Construct map
const mapEl = document.querySelector('.map');
const map = initMap(mapEl);

// Process data
const {data, dataGeoJSON, neighborhoods} = await getData();

// Create neighborhood list
initializeList(neighborhoods, evt);

// Initialize map point rendering
initializeMapRendering(dataGeoJSON, map, evt);

// Initialize error histogram rendering
initializeHist(data, evt);

// Initialize stat display
initializeStatDisplay(data, neighborhoods, evt);

