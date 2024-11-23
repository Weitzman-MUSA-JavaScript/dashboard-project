import { loadPoisData } from './pois_data.js';
import { initMap } from './pois_map.js';
import { initPoisList } from './pois_list.js';
import { initPoisChart } from './pois_chart.js';

/*
Custom event types:
~~~~~~~~~~~~~~~~~~~
- typeselected: Fired when a poi-type button on the map is clicked.
  Detail: {
    selectedtype (array): an array of selected poi type which contains no more than one type.
  }

-
*/
const events = new EventTarget();

// Load Yellowstone boundary and pois data...
const { boundary, pois } = await loadPoisData();

// Create the map and choose the selected pois type...
const leftEl = document.querySelector('.left-part');
initMap(leftEl, boundary, pois, events);

// Create the pois list with selected type...
const rightEl = document.querySelector('.right-part');
initPoisList(rightEl, pois, events);

// Create a schedule chart with selected pois...
const chartEl = document.querySelector('.chart-section');
initPoisChart(chartEl, pois, events);
