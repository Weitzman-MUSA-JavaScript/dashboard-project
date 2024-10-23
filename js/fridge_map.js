function initMap(el, events) {
  // Create the map
  var map = L.map(el).setView([39.9530, -75.1636], 12); // map centered at city hall

  const mapboxKey = 'pk.eyJ1IjoiY2hpYmlha2kiLCJhIjoiY20xODh2NTNqMTBvaDJqb2ptbjM4ZGViayJ9.un9M1_-S6kI8M0ktqZLz_Q';
  const mapboxStyle = 'mapbox/streets-v11';

  L.tileLayer(`https://api.mapbox.com/styles/v1/${mapboxStyle}/tiles/512/{z}/{x}/{y}{r}?access_token=${mapboxKey}`, {
    tileSize: 512,
    zoomOffset: -1,
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  // Listen for fridgedataready event
  // Add fridge data to map
  events.addEventListener('fridgedataready', (evt) => {
    const { fridges } = evt.detail;
    const fridgeLayer = L.geoJSON(fridges);
    fridgeLayer.addTo(map);

    // add tooltip to each fridge
    fridgeLayer.bindTooltip((layer) => {
      const fridgeProperties = layer.feature.properties;
      const name = fridgeProperties['name'];
      const address = fridgeProperties['addressStreet'];
      const email = fridgeProperties['contactEmail'];
      return `${name}<br>Address: ${address} <br>Email: ${email}`;
    }, {
      className: 'fridge-tooltip',
    });
  });

  // Listen for positionfound event
  // when event is fired, get the position from the event and zoom in to user's location
  events.addEventListener('positionfound', (evt) => {
    const pos = evt.detail;
    const lat = pos.coords.latitude;
    const long = pos.coords.longitude;
    const userLocation = L.circleMarker([lat, long], {
      radius: 5,
      color: 'red',
      fillColor: 'red',
      fillOpcaity: 0.8,
    });
    userLocation.addTo(map);
    map.setView([lat, long], 15);
  });
}

export { initMap };