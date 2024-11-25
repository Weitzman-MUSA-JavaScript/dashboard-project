function initMap(leftEl, boundary, pois, events) {
  const mapEl = leftEl.querySelector('#map');
  const typeListEl = leftEl.querySelector('#poi-type');
  const typeListItems = typeListEl.querySelectorAll('.type');
  const resetButton = leftEl.querySelector('#map-reset');

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
  let initialView = null;

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

      initialView = {
        center: map.getCenter(),
        zoom: map.getZoom(),
      };
    } else {
      console.warn('Boundary layer bounds are invalid!');
    }
  }
  adjustMapView(map, boundaryLayer);

  // Add event listener to reset button
  resetButton.addEventListener('click', (evt) => {
    if (initialView) {
      map.setView(initialView.center, initialView.zoom);
    } else {
      console.warn('Initial view is not set!');
    }
  });

  //
  // Add the pois to the map...
  //

  // Create a layer group for the pois
  const poisLayer = L.layerGroup().addTo(map);

  // Define the icons and colors for each poi type
  const typeIcons = {
    Commerce: L.icon({ iconUrl: 'img/Commerce_Logo.png', iconSize: [32, 32] }),
    Mountain: L.icon({ iconUrl: 'img/Mountain_Logo.png', iconSize: [32, 32] }),
    Recreation: L.icon({ iconUrl: 'img/Recreation_Logo.png', iconSize: [32, 32] }),
    Restroom: L.icon({ iconUrl: 'img/Restroom_Logo.png', iconSize: [32, 32] }),
    Service: L.icon({ iconUrl: 'img/Service_Logo.png', iconSize: [32, 32] }),
    Tourism: L.icon({ iconUrl: 'img/Tourism_Logo.png', iconSize: [32, 32] }),
    Transportation: L.icon({ iconUrl: 'img/Transportation_Logo.png', iconSize: [32, 32] }),
    Water: L.icon({ iconUrl: 'img/Water_Logo.png', iconSize: [32, 32] }),
  };
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

  // Create two variables to store the selected type and selected pois list
  let poiSelectedType = [];
  let poiSelectedList = [];

  // Create two maps to store the poi markers (refer to ChatGPT)
  const poiMarkers = new Map();
  const originalPoiMarkers = new Map();

  // Populate the pois on the map
  function populatePois(pois) {
    poisLayer.clearLayers();

    pois.forEach((poi) => {
      const latlng = [poi.geometry.coordinates[1], poi.geometry.coordinates[0]];
      const type = poi.properties.Type;
      const color = typeColors[type] || '#000000';

      const marker = L.circleMarker(latlng, {
        radius: 5,
        color: color,
        weight: 2.2,
        fillOpacity: 0.4,
      });

      marker.bindTooltip(() => {
        const name = poi.properties.Name;
        const type = poi.properties.Type;
        const subcategory = poi.properties.Subcategory;
        const time = poi.properties.Time;
        return `Name: ${name}<br>Type: ${type}<br>Subcategory: ${subcategory}<br>Time: ${time}minutes`;
      });

      marker.on('click', (evt) => {
        const event = new CustomEvent('poiselected', { detail: { poi } });
        events.dispatchEvent(event);
      });

      poiMarkers.set(poi.properties.Name, marker);
      originalPoiMarkers.set(poi.properties.Name, marker);
      poisLayer.addLayer(marker);
    });
  }
  populatePois(pois);

  // Filter the pois based on selected type
  events.addEventListener('typeselected', (evt) => {
    poiSelectedType = evt.detail.selectedType;

    const filteredTypePois = poiSelectedType.length === 0
      ? pois : pois.filter((poi) => poiSelectedType.includes(poi.properties.Type));

    updatePoisLayer(filteredTypePois);
  });

  // Listen for updated selected pois list
  events.addEventListener('selectedlistupdated', (evt) => {
    poiSelectedList = evt.detail.poiSelectedList;

    const filteredTypePois = poiSelectedType.length === 0
      ? pois : pois.filter((poi) => poiSelectedType.includes(poi.properties.Type));

    updatePoisLayer(filteredTypePois);
  });

  function updatePoisLayer(filteredTypePois) {
    poisLayer.clearLayers();

    poiMarkers.forEach((marker, name) => {
      const poi = filteredTypePois.find((item) => item.properties.Name === name);

      if (poi) {
        if (poiSelectedList.some((selectedPoi) => selectedPoi.properties.Name === name)) {
          const type = poi.properties.Type;
          const icon = typeIcons[type];
          const latlng = marker.getLatLng();

          const iconMarker = L.marker(latlng, { icon });

          // iconMarker.bindTooltip(() => {
          //   const name = poi.properties.Name;
          //   const type = poi.properties.Type;
          //   const subcategory = poi.properties.Subcategory;
          //   const time = poi.properties.Time;
          //   return `Name: ${name}<br>Type: ${type}<br>Subcategory: ${subcategory}<br>Time: ${time} minutes`;
          // });

          iconMarker.on('click', (evt) => {
            const event = new CustomEvent('poiselected', { detail: { poi } });
            events.dispatchEvent(event);
          });

          poiMarkers.set(name, iconMarker);
          poisLayer.addLayer(iconMarker);
        } else {
          const originalMarker = originalPoiMarkers.get(name);
          poiMarkers.set(name, originalMarker);
          poisLayer.addLayer(originalMarker);
        }
      }
    });
  }

  return map;
}

export { initMap };
