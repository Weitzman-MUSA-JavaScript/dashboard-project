import { Vismap } from './vismap.js';
import { visualizeCharts } from './vischarts.js';
import { populateInfoTable } from './infoTable.js';
import { setupEventListeners } from './events.js';

console.log('Initializing dashboard.');

const map = L.map('map', { scrollWheelZoom: true }).setView([39.9800, -75.1200], 11);

L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    maxZoom: 18,
    id: 'mapbox/light-v11',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: 'pk.eyJ1IjoiZnJhbmtjaCIsImEiOiJjbG95aTZhbGQwM2ZwMmhxb3BvOGE3cjExIn0.9FCYx6xJ-wp8YEgk7VpG0Q'
}).addTo(map);

// Define column and breaks
const columnName = 'stop_counts';
const customBreaks = [1000, 2000, 3000, 4000, 5000, 8000, 10000, 20000];

// Initialize Vismap
const vismapInstance = new Vismap(map, customBreaks, columnName);
vismapInstance.fetchData(document.getElementById('year-selector').value);

const columnDisplayMapping = {
    'GEOID': 'GEOID',
    'stop_counts': 'Number of Visits',
    'device_counts': 'Number of Visitors'
};

setupEventListeners(
    map,
    vismapInstance,
    'year-selector',
    visualizeCharts,
    (properties) => populateInfoTable(properties, columnDisplayMapping)
);

visualizeCharts(null);
