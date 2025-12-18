export function createMap() {
  const map = L.map("map").setView([39.9526, -75.1652], 12);

L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/512/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoieGlhb3lvLXUiLCJhIjoiY21mZWMyOG8zMDU3eDJpcTV1ZTc3bTk4aiJ9.5llx8QlyUtZfoA2n9GDH9g', {
    maxZoom: 19,
    tileSize: 512,
    zoomOffset: -1,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

  return map;
}