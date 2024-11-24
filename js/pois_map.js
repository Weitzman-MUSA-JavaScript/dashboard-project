function initMap(leftEl, boundary, pois, events) {
  const mapEl = leftEl.querySelector('#map');
  const typeListEl = leftEl.querySelector('#poi-type');
  const typeListItems = typeListEl.querySelectorAll('.type');

  //
  // Choose the selected pois type...
  //

  // Add event listener to each type button
  const selectedType = [];

  typeListItems.forEach((item) => {
    item.addEventListener('click', (evt) => {
      const type = evt.target.dataset.type;

      if (selectedType.includes(type)) {
        selectedType.length = 0;
        evt.target.setAttribute('aria-pressed', 'false');
      } else {
        selectedType.length = 0;
        selectedType.push(type);
        resetButtonState();
        evt.target.setAttribute('aria-pressed', 'true');
      }

      const event = new CustomEvent('typeselected', {
        detail: { selectedType },
      });
      events.dispatchEvent(event);
    });
  });

  // Reset the button state
  function resetButtonState() {
    typeListItems.forEach((item) => {
      item.setAttribute('aria-pressed', 'false');
    });
  }

  //
  // Create the poi map...
  //
  const map = L.map(mapEl, { maxZoom: 18, zoomSnap: 0 }).setView([0, 0], 1);

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

  // Add the Yellowstone boundary to the map
  const boundaryLayer = L.geoJSON(boundary, {
    style: {
      color: 'rgba(140, 140, 140, 1)',
      weight: 2,
      fillOpacity: 0,
    },
  });
  boundaryLayer.addTo(map);

  // Adjust the map view to fit the boundary layer (refer to ChatGPT)
  function adjustMapView(map, boundaryLayer) {
    const mapSize = map.getSize();
    const mapWidth = mapSize.x;

    const padding = mapWidth * 0.05;
    const panDistance = mapWidth * 0.08;

    if (boundaryLayer && boundaryLayer.getBounds().isValid()) {
      map.fitBounds(boundaryLayer.getBounds(), {
        padding: [padding, padding],
        // animate: false,
      });

      map.panBy([panDistance, 0], { animate: false });
    } else {
      console.warn('Boundary layer bounds are invalid!');
    }
  }
  adjustMapView(map, boundaryLayer);

  //
  // Add the pois to the map...
  //
  const poisLayer = L.layerGroup().addTo(map);

  // Initialize the pois on the map
  function populatePois(pois) {
    poisLayer.clearLayers();

    // Identify the type of each poi and set the color
    const typeColors = {
      Commerce: '#F26363',
      Mountain: '#947262',
      Recreation: '#D93BAF',
      Restroom: '#a7a7ad',
      Service: '#919151',
      Tourism: '#008C72',
      Transportation: '#ee9f3e',
      Water: '#0099DD',
    };

    const geoJsonLayer = L.geoJSON(pois, {
      pointToLayer: (feature, latlng) => {
        const type = feature.properties.Type;
        const color = typeColors[type] || '#000000';

        return L.circleMarker(latlng, {
          radius: 5,
          color: color,
          weight: 2,
          fillOpacity: 0.4,
        });
      },
    });

    geoJsonLayer.eachLayer((layer) => poisLayer.addLayer(layer));
  }
  populatePois(pois);

  // Filter the pois based on selected type
  events.addEventListener('typeselected', (evt) => {
    const { selectedType } = evt.detail;

    if (selectedType.length === 0) {
      populatePois(pois);
    } else {
      const filteredTypePois = pois.filter((poi) => {
        return selectedType.includes(poi.properties.Type);
      });
      populatePois(filteredTypePois);
    }
  });


  //
  // Select pois from the map...
  //

  // Handle click event on each poi point

  // Listen for updated selected pois list
  events.addEventListener('selectedlistupdated', (evt) => {
    const { poiSelectedList } = evt.detail;

    // Update map icons based on selection
  });

  return map;
}

export { initMap };
