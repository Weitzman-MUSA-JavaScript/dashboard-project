function initializeSchoolMap(schools, eventBus) {
  const schoolMap = L.map('school-map').setView([40.047591, -75.153350], 10);
  L.tileLayer('https://api.mapbox.com/styles/v1/mjumbe-test/cl8w256ur002h14qe8m4a2n3s/tiles/256/{z}/{x}/{y}@2x?access_token={apiKey}', {
    apiKey: 'pk.eyJ1IjoibWp1bWJlLXRlc3QiLCJhIjoiY2wwb3BudmZ3MWdyMjNkbzM1c2NrMGQwbSJ9.2ATDPobUwpa7Ou5jsJOGYA',
    maxZoom: 19,
    attribution: '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <strong><a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a></strong>',
  }).addTo(schoolMap);

  schoolMap.catchmentPane = schoolMap.createPane('catchmentPane');
  schoolMap.catchmentPane.style.zIndex = 300;

  schoolMap.userAddressLayer = L.layerGroup().addTo(schoolMap);
  schoolMap.highlightedIDs = new Set();
  schoolMap.schoolLayers = {};
  schoolMap.eventBus = eventBus;

  showSchoolsOnMap(schools, schoolMap);
  setupMapEventHandlers(schoolMap);

  return schoolMap;
}

function setupMapEventHandlers(map) {
  map.eventBus.addEventListener('selectionchanged', (evt) => {
    const { added, removed } = evt.detail;
    highlightSchoolsOnMap(added, map);
    unhighlightSchoolsOnMap(removed, map);
  });

  map.eventBus.addEventListener('filterschanged', (evt) => {
    const { include } = evt.detail;
    showSchoolsOnMap(include, map);
  });

  map.eventBus.addEventListener('addresschanged', (evt) => {
    const { place, catchment } = evt.detail;
    showUserAddressOnMap(place, catchment, map);
  });
}

function makeSchoolFeature(school) {
  const feature = {
    type: 'Feature',
    id: school['sdp_id'],
    properties: {},
    geometry: school.geom,
  };
  return feature;
}

function getSchoolStyle(feature, map) {
  if (map.highlightedIDs.has(feature.id)) {
    return {
      stroke: true,
      color: 'red',
      fillColor: 'blue',
      fillOpacity: 0.5,
      radius: 3,
    };
  } else {
    return {
      stroke: false,
      fillColor: 'blue',
      fillOpacity: 0.5,
      radius: 3,
    };
  }
}

let firstFit = false;
function redrawSchoolsOnMap(schools, map) {
  let boundsToFit = null;

  for (const school of schools) {
    const id = school['sdp_id'];
    const layer = map.schoolLayers[id];
    if (layer) {
      layer.resetStyle();
    }

    if (!firstFit) {
      if (boundsToFit === null) {
        boundsToFit = layer.getBounds();
      } else {
        boundsToFit.extend(layer.getBounds());
      }
    }
  }

  if (!firstFit) {
    map.fitBounds(boundsToFit);
    firstFit = true;
  }
}

function isHighlightedOnMap(school, map) {
  const id = school['sdp_id'];
  return map.highlightedIDs.has(id);
}

function highlightSchoolsOnMap(schools, map) {
  for (const school of schools) {
    const id = school['sdp_id'];
    map.highlightedIDs.add(id);
  }
  redrawSchoolsOnMap(schools, map);
}

function unhighlightSchoolsOnMap(schools, map) {
  for (const school of schools) {
    const id = school['sdp_id'];
    map.highlightedIDs.delete(id);
  }
  redrawSchoolsOnMap(schools, map);
}

function showSchoolsOnMap(schools, map) {
  const ids = new Set(schools.map((s) => s['sdp_id']));

  // Remove features with IDs not in the schools array
  for (const id of Object.keys(map.schoolLayers)) {
    if (!ids.has(id)) {
      const layer = map.schoolLayers[id];
      map.removeLayer(layer);
      delete map.schoolLayers[id];
    }
  }

  // Add new features for IDs not in the layers
  for (const school of schools) {
    const feature = makeSchoolFeature(school);
    const id = feature.id;
    if (map.schoolLayers[id] === undefined) {
      map.schoolLayers[id] = L.geoJSON(feature, {
        pointToLayer: (p, ll) => L.circleMarker(ll),
        style: (f) => getSchoolStyle(f, map),
      })
        .on('click', () => {
          const detail = isHighlightedOnMap(school, map)
            ? { 'added': [], 'removed': [school] }
            : { 'added': [school], 'removed': [] };
          const evt = new CustomEvent('selectionchanged', { detail });
          map.eventBus.dispatchEvent(evt);
        })
        .addTo(map);
    }
  }

  redrawSchoolsOnMap(schools, map);
}

function showUserAddressOnMap(place, catchment, map) {
  map.userAddressLayer.clearLayers();

  if (catchment) {
    L.geoJSON(catchment, { pane: 'catchmentPane', style: { color: 'gray', weight: 1 }})
      .addTo(map.userAddressLayer);
  }

  if (place) {
    L.geoJSON(place)
      .addTo(map.userAddressLayer);
  }
}

export {
  highlightSchoolsOnMap,
  initializeSchoolMap,
  showSchoolsOnMap,
  unhighlightSchoolsOnMap,
};
