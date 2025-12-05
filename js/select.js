// select.js
export function stationSelect() {
  const searchSelect = document.getElementById('select-station');
  let previousLayer = null;

  const features = [];
  window.metroLayer.eachLayer((layer) => {
    if (layer.feature.properties.name) {
      features.push({
        name: layer.feature.properties.name,
        layer: layer,
        type: 'metro',
      });
    }
  });

  features.sort((a, b) => a.name.localeCompare(b.name));

  features.forEach((f) => {
    const option = document.createElement('option');
    option.value = f.name;
    option.textContent = f.name;
    searchSelect.appendChild(option);
  });

  searchSelect.featureMap = {};
  features.forEach((f) => searchSelect.featureMap[f.name] = f.layer);

  searchSelect.addEventListener('change', () => {
    const selected = searchSelect.value;
    if (!selected) return;

    const layer = searchSelect.featureMap[selected];
    const latlng = layer.getLatLng();

    if (previousLayer) {
      previousLayer.setIcon(window.metroIcon);
      if (previousLayer._label) {
        window.matrixMap.removeLayer(previousLayer._label);
        previousLayer._label = null;
      }
    }

    window.matrixMap.setView(latlng, 15);

    layer.setIcon(window.metroIconHighlight);

    if (layer._label) {
      window.matrixMap.removeLayer(layer._label);
    }
    layer._label = L.tooltip({
      permanent: true,
      direction: 'bottom',
      offset: [0, 10],
      className: 'search-label',
    })
      .setContent(selected)
      .setLatLng(latlng);
    window.matrixMap.addLayer(layer._label);

    previousLayer = layer;
  });
}

// select amenity
export function amenitySelect() {
  const searchSelect = document.getElementById('select-amenity');
  let previousLayer = null;
  let previousCategory = null;

  const features = [];
  window.amenityLayer.eachLayer((layer) => {
    const props = layer.feature?.properties;
    if (props?.name) {
      features.push({
        name: props.name,
        layer: layer,
        category: props.category || null,
        type: 'amenity',
      });
    }
  });

  features.sort((a, b) => a.name.localeCompare(b.name));

  features.forEach((f) => {
    const option = document.createElement('option');
    option.value = f.name;
    option.textContent = f.name;
    searchSelect.appendChild(option);
  });

  searchSelect.featureMap = {};
  features.forEach((f) => searchSelect.featureMap[f.name] = { layer: f.layer, category: f.category });

  searchSelect.addEventListener('change', () => {
    const selected = searchSelect.value;
    if (!selected) return;

    const { layer, category } = searchSelect.featureMap[selected];
    const latlng = layer.getLatLng();

    if (previousLayer) {
      const icon = window.amenityIcons?.[previousCategory] || window.defaultAmenityIcon;
      previousLayer.setIcon(icon);
      if (previousLayer._label) {
        window.matrixMap.removeLayer(previousLayer._label);
        previousLayer._label = null;
      }
      if (window.matrixMap.hasLayer(previousLayer)) {
        window.matrixMap.removeLayer(previousLayer);
      }
    }

    window.matrixMap.setView(latlng, 15);

    const highlightIcon = window.amenityIconsHighlight?.[category] || window.defaultAmenityIconHighlight;
    layer.setIcon(highlightIcon);

    if (!window.matrixMap.hasLayer(layer)) {
      window.matrixMap.addLayer(layer);
    }

    if (layer._label) {
      window.matrixMap.removeLayer(layer._label);
    }
    layer._label = L.tooltip({
      permanent: true,
      direction: 'bottom',
      offset: [0, 10],
      className: 'search-label',
    })
      .setContent(selected)
      .setLatLng(latlng);
    window.matrixMap.addLayer(layer._label);

    previousLayer = layer;
    previousCategory = category;
  });
}
