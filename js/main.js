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

- poiselected: Fired when a poi button in the list is clicked or a poi point on the map is clicked.
  Detail: {
    poi (object): the selected poi object.
  }

- selectedlistupdated: Fired when the selected pois list is updated.
  Detail: {
    poiSelectedList (array): an array of selected poi objects.
  }
*/

// Define the event target for different modules...
const events = new EventTarget();

// Listen for 'poiselected' event to update the selected pois list...
const poiSelectedList = [];

events.addEventListener('poiselected', (evt) => {
  const poi = evt.detail.poi;

  const index = poiSelectedList.findIndex((item) => item.properties.Name === poi.properties.Name);
  if (index >= 0) {
    poiSelectedList.splice(index, 1);
  } else {
    poiSelectedList.push(poi);
  }

  console.log('Current Selected List:', poiSelectedList);

  events.dispatchEvent(new CustomEvent('selectedlistupdated', { detail: { poiSelectedList } }));
});

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
initPoisChart(chartEl, events);
