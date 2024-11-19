function initMap(mapEl, boundary, pois, events) {
  const map = L.map(mapEl, { maxZoom: 18, zoomSnap: 0 }).setView([44.588, -110.248], 10);

  // Add a base layer to the map
  const mapboxKey = 'pk.eyJ1IjoieHV5YW9oYW4iLCJhIjoiY20xN3l1aDl0MHlhdTJqb3NrN3JzcHZ3ZyJ9.W0K0GomuRMj9lrIY029KoA';
  const mapboxStyle = 'mapbox/light-v11';

  const baseLayer = L.tileLayer(
    `https://api.mapbox.com/styles/v1/${mapboxStyle}/tiles/512/{z}/{x}/{y}{r}?access_token=${mapboxKey}`, {
      tileSize: 512,
      zoomOffset: -1,
      detectRetina: true,
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    });
  baseLayer.addTo(map);

  // Add the boundary to the map...
  const boundaryLayer = L.geoJSON(boundary, {
    style: {
      color: 'rgba(0, 0, 0, 1)',
      weight: 2,
      fillOpacity: 0,
    },
  });
  boundaryLayer.addTo(map);

  return map;
}

export { initMap };
