export const transitionColors = {
  'Persistently elevated': '#7A0177',
  'Previously elevated': '#D95F02',
  'Newly elevated': '#1B9E77',
  'Consistently below': '#D9D9D9',
  'Unavailable': '#777777',
};

export function tractStyle(properties, selected = false, matching = true) {
  const unavailable = properties.transition === 'Unavailable';
  return {
    fillColor: transitionColors[properties.transition] || '#777777',
    fillOpacity: matching ? 0.75 : 0.1,
    opacity: matching ? 1 : 0.2,
    color: selected ? '#111111' : (unavailable ? '#333333' : '#FFFFFF'),
    weight: selected ? 3 : (unavailable ? 1 : 0.6),
    dashArray: unavailable ? '3 3' : null,
  };
}

export function createMap(collection, onSelect) {
  let selectedGeoid = null;
  let matches = new Set(collection.features.map((f) => f.properties.tract_geoid));
  const map = L.map('map', {scrollWheelZoom: false});
  const basemap = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    opacity: 0.8,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  basemap.on('tileerror', () => {
    document.querySelector('#map-status').textContent =
      'Basemap tiles are unavailable. Tract data and the table remain usable.';
  });
  const layer = L.geoJSON(collection, {
    style: (feature) => tractStyle(feature.properties),
    onEachFeature: (feature, tract) => {
      tract.on('click', () => {
        if (matches.has(feature.properties.tract_geoid)) {
          onSelect(feature.properties.tract_geoid);
        }
      });
    },
  }).addTo(map);
  const extent = layer.getBounds();
  map.fitBounds(extent, {padding: [12, 12], animate: false});
  map.on('resize', () => {
    map.fitBounds(extent, {padding: [12, 12], animate: false});
  });
  const updateStyles = () => {
    layer.setStyle((feature) => tractStyle(feature.properties,
      feature.properties.tract_geoid === selectedGeoid,
      matches.has(feature.properties.tract_geoid)));
  };
  return {
    select(geoid) {
      selectedGeoid = geoid;
      updateStyles();
      layer.eachLayer((tract) => {
        if (tract.feature.properties.tract_geoid === geoid) tract.bringToFront();
      });
    },
    filter(geoids) {
      matches = new Set(geoids);
      updateStyles();
    },
    focus(geoid) {
      const tract = layer.getLayers().find((item) => item.feature.properties.tract_geoid === geoid);
      if (tract) map.fitBounds(tract.getBounds(), {padding: [20, 20], maxZoom: 15, animate: false});
    },
    reset() {
      map.fitBounds(extent, {padding: [12, 12], animate: false});
    },
  };
}
