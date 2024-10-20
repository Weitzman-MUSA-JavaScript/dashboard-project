// Planning out what I need to do
// 1. Map of Philadelphia
const mapElement = document.querySelector('#fridgeMap');
var map = L.map(mapElement).setView([39.9530, -75.1636], 12); // map centered at city hall

const mapboxKey = 'pk.eyJ1IjoiY2hpYmlha2kiLCJhIjoiY20xODh2NTNqMTBvaDJqb2ptbjM4ZGViayJ9.un9M1_-S6kI8M0ktqZLz_Q';
const mapboxStyle = 'mapbox/dark-v11';

L.tileLayer(`https://api.mapbox.com/styles/v1/${mapboxStyle}/tiles/512/{z}/{x}/{y}{r}?access_token=${mapboxKey}`, {
  tileSize: 512,
  zoomOffset: -1,
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

// 2. Load fridge data
const fridgeResponse = await fetch('data/philadelphia-fridge.geojson');
const fridgeData = await fridgeResponse.json();

const fridgeLayer = L.geoJSON(fridgeData);
fridgeLayer.addTo(map);

// 3. Add search bar for zip code or neighborhood
// 4. Add list of fridges
