function getWineColor(type) {
  const wine = type;
  if (wine.includes('Rosé')) return '#C75B7A';
  if (wine.includes('Sparkling')) return '#E3A857';
  if (wine.includes('White') && !wine.includes('Red')) return '#D4AF37';
  if (wine.includes('Red') && !wine.includes('White')) return '#722F37';
  return '#93385F';
}

function wineStyle(feature) {
  const color = getWineColor(feature?.properties?.type);
  return {
    color: color,
    weight: 1.5,
    opacity: 0.85,
    fillColor: color,
    fillOpacity: 0.4,
  };
}

async function loadwinelayer(map) {
  const resp = await fetch('data/wine.geojson');
  const data = await resp.json();

  window.allWineData = data;

  const wineLayer = L.geoJSON(data, {
    style: wineStyle,
    onEachFeature: (feature, layer) => {
      const props = feature.properties;
      const region = feature.properties.region;
      const type = feature.properties.type;
      const grapes = feature.properties.grapes;
      const flavor = feature.properties.flavor;
      const foodpair = feature.properties.foodpair;

      layer.bindTooltip(props.name || 'No title');

      layer.bindPopup(`
          <strong>${props.name}</strong><br>
          <strong>Region:</strong> ${region}<br>
          <strong>Wine Type:</strong> ${type}<br>
          <strong>Grapes:</strong> ${grapes}<br>
          <strong>Flavor:</strong> ${flavor}<br>
          <strong>Food Pairings:</strong> ${foodpair}
        `);
    },
  }).addTo(map);
  return wineLayer;
}

function initFranceWineMap(elementOrId) {
  const map = L.map(elementOrId).setView([46.2276, 2.2137], 6);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  return map;
}

function updateWineLayer(wineLayer, filteredFeatures) {
  if (!wineLayer) return;
  wineLayer.clearLayers();
  wineLayer.addData({
    type: 'FeatureCollection',
    features: filteredFeatures,
  });
}

export {
  initFranceWineMap,
  loadwinelayer,
  wineStyle,
  getWineColor,
  updateWineLayer,
};
