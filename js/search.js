export function initSearch() {
  const input = document.getElementById('entry');
  const clearBtn = document.getElementById('clear-entry');
  const suggestionsDiv = document.getElementById('search-suggestions');

  if (!window.metroLayer || !window.amenityLayer) {
    console.error('Layers not initialized yet!');
    return;
  }

  const features = [];

  function collectFeatures(layerGroup, type) {
    layerGroup.eachLayer((layer) => {
      const props = layer.feature?.properties;
      if (props?.name) {
        features.push({
          name: props.name,
          category: props.category || null,
          type,
          layer,
        });
      }
    });
  }

  collectFeatures(window.metroLayer, 'metro');
  collectFeatures(window.amenityLayer, 'amenity');

  features.sort((a, b) => a.name.localeCompare(b.name));

  input.addEventListener('input', () => {
    const text = input.value.trim().toLowerCase();
    suggestionsDiv.innerHTML = '';
    suggestionsDiv.style.display = text ? 'block' : 'none';
    if (!text) return;

    const matches = features.filter((f) =>
      f.name.toLowerCase().includes(text),
    );

    matches.forEach((f) => {
      const div = document.createElement('div');
      div.className = 'suggestion-item';
      div.textContent = f.name;
      div.addEventListener('click', () => handleSelect(f));
      suggestionsDiv.appendChild(div);
    });
  });

  function handleSelect(f) {
    const layer = f.layer;
    const latlng = layer.getLatLng();

    window.matrixMap.setView(latlng, 15);
    resetAllIcons();

    if (f.type === 'metro') {
      layer.setIcon(window.metroIconHighlight);
    } else if (f.type === 'amenity') {
      const cat = f.category;
      const highlightIcon =
                window.amenityIconsHighlight?.[cat] || window.defaultAmenityIconHighlight;
      layer.setIcon(highlightIcon);

      if (!window.matrixMap.hasLayer(layer)) {
        window.matrixMap.addLayer(layer);
      }
    }

    // 删除旧 label
    if (layer._label) {
      window.matrixMap.removeLayer(layer._label);
    }

    // tooltip 永远显示
    layer._label = L.tooltip({
      permanent: true,
      direction: 'bottom',
      offset: [0, 10],
      className: 'search-label',
    })
      .setContent(f.name)
      .setLatLng(latlng);
    window.matrixMap.addLayer(layer._label);

    input.value = f.name;
    suggestionsDiv.innerHTML = '';
    suggestionsDiv.style.display = 'none';
  }

  function resetAllIcons() {
    window.metroLayer.eachLayer((l) => {
      if (l.setIcon) l.setIcon(window.metroIcon);
      if (l._label) {
        window.matrixMap.removeLayer(l._label);
        l._label = null;
      }
    });

    window.amenityLayer.eachLayer((l) => {
      if (window.matrixMap.hasLayer(l)) {
        window.matrixMap.removeLayer(l);
      }
      const cat = l.feature?.properties?.category;
      const icon = window.amenityIcons?.[cat] || window.defaultAmenityIcon;
      if (l.setIcon) l.setIcon(icon);
      if (l._label) {
        window.matrixMap.removeLayer(l._label);
        l._label = null;
      }
    });
  }

  clearBtn.addEventListener('click', () => {
    input.value = '';
    suggestionsDiv.innerHTML = '';
    suggestionsDiv.style.display = 'none';
    resetAllIcons();
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !suggestionsDiv.contains(e.target)) {
      suggestionsDiv.innerHTML = '';
      suggestionsDiv.style.display = 'none';
    }
  });
}
