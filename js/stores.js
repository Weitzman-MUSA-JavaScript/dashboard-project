const STORE_COLORS = {
  grocery: '#1f7a4d',
  small: '#2f8f9d',
  dollar: '#b0457b',
  convenience: '#8a8f96',
};

const STORE_LABELS = {
  grocery: 'Grocery store',
  small: 'Small grocer',
  dollar: 'Dollar store or pharmacy',
  convenience: 'Convenience store',
};

function createStoreLayers(stores) {
  const renderer = L.svg({ pane: 'storePane' });
  const layers = {};
  for (const cat of Object.keys(STORE_COLORS)) {
    layers[cat] = L.layerGroup();
  }

  for (const feature of stores.features) {
    const { name, addr, cat } = feature.properties;
    const [lon, lat] = feature.geometry.coordinates;
    L.circleMarker([lat, lon], {
      renderer,
      pane: 'storePane',
      radius: cat === 'grocery' ? 4.5 : 3.5,
      color: '#fff',
      weight: 1,
      fillColor: STORE_COLORS[cat],
      fillOpacity: 1,
    })
      .bindTooltip(`<b>${name}</b><span class="tip-type">${STORE_LABELS[cat]}, ${addr}</span>`)
      .addTo(layers[cat]);
  }

  return layers;
}

function countStores(stores) {
  const counts = {};
  for (const feature of stores.features) {
    const { cat } = feature.properties;
    counts[cat] = (counts[cat] || 0) + 1;
  }
  return counts;
}

export { createStoreLayers, countStores, STORE_COLORS, STORE_LABELS };
