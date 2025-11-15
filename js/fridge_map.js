function initMap(el, events) {
  // Create the map
  const map = L.map(el).setView([39.9530, -75.1636], 12); // map centered at city hall

  const mapboxKey = 'pk.eyJ1IjoiY2hpYmlha2kiLCJhIjoiY20xODh2NTNqMTBvaDJqb2ptbjM4ZGViayJ9.un9M1_-S6kI8M0ktqZLz_Q';
  const mapboxStyle = 'mapbox/streets-v11';

  L.tileLayer(`https://api.mapbox.com/styles/v1/${mapboxStyle}/tiles/512/{z}/{x}/{y}{r}?access_token=${mapboxKey}`, {
    tileSize: 512,
    zoomOffset: -1,
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  // Define custom fridge icon
  const fridgeIcon = L.icon({
    iconUrl: '../icons/noun-fridge-3453702.png',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -40],
  });

  // Define custom user location icon
  const userLocIcon = L.divIcon({
    html: `
      <svg width="30" height="30" viewbox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <circle class="pulse-outline" cx="20" cy="20" fill="none" r="10" stroke-width="2">
          <animate attributeName="r" from="8" to="20" dur="1.5s" begin="0s" repeatCount="indefinite"/>
          <animate attributeName="opacity" from="1" to="0" dur="1.5s" begin="0s" repeatCount="indefinite"/>
        </circle>
        <circle class="center-circle" cx="20" cy="20" r="10"/>
      </svg>
    `,
    className: 'user-location-icon',
    iconAnchor: [10, 10],
  });
  const positionMarker = L.marker([0, 0], { icon: userLocIcon });

  // Listen for fridgedataready event
  // Add fridge data to map
  let fridgeLayer;
  events.addEventListener('fridgedataready', (evt) => {
    const { fridges } = evt.detail;
    fridgeLayer = L.geoJSON(fridges, {
      pointToLayer: (feature, latlng) => {
        return L.marker(latlng, { icon: fridgeIcon });
      },
    });
    fridgeLayer.addTo(map);

    // add tooltip to each fridge
    fridgeLayer.bindTooltip((layer) => {
      const fridgeProperties = layer.feature.properties;
      const name = fridgeProperties['name'];
      const address = fridgeProperties['addressStreet'];
      const email = fridgeProperties['contactEmail'];
      return `
      <strong>${name}</strong><br>
      Address: ${address}<br>
      Email: ${email}
      `;
    }, {
      className: 'fridge-tooltip',
    });
  });

  // Listen for zoomtozip event
  events.addEventListener('zoomtozip', (evt) => {
    const { lat, long } = evt.detail;
    map.setView([lat, long], 15); // Zoom to the coordinates
  });

  // Listen for zoomtofridge event
  events.addEventListener('zoomtofridge', (evt) => {
    const { lat, long } = evt.detail;
    map.setView([lat, long], 15); // Zoom in closer to the fridge
  });

  // Listen for positionfound event
  // when event is fired, get the position from the event and zoom in to user's location
  events.addEventListener('positionfound', (evt) => {
    const pos = evt.detail;
    const lat = pos.coords.latitude;
    const long = pos.coords.longitude;
    positionMarker.setLatLng([lat, long]);
    positionMarker.addTo(map);
    map.setView([lat, long], 15);
  });
}

export { initMap };
