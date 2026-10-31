/**
 * Module for loading economic loss and coastal erosion data, also changes the on-screen overlay
 */

/**
 * Loads coastal erosion lines under different scenarios
 *
 * @param {maplibregl.Map} map MapLibre map instance created by initMap.
 */
function loadErosionLine(map) {
  const scenarios = [
    { id: 'worstcase', url: 'data/coastalErosion_3.2Ft.json' },
    { id: 'badcase', url: 'data/coastalErosion_2Ft.json' },
    { id: 'goodcase', url: 'data/coastalErosion_1.1Ft.json' },
    { id: 'bestcase', url: 'data/coastalErosion_0.5Ft.json' },
  ];

  scenarios.forEach((scenario) => {
    map.addSource(`erosion_source_${scenario.id}`, {
      'type': 'geojson',
      'data': scenario.url,
    });

    map.addLayer({
      'id': `erosion_layer_${scenario.id}`,
      'type': 'line',
      'source': `erosion_source_${scenario.id}`,
      'layout': {
        'visibility': 'none',
      },
      'paint': {
        'line-color': '#000000',
        'line-width': 2,
      },
    });
  });
}

/**
 * Loads economic loss from coastal erosion under different scenarios
 *
 * @param {maplibregl.Map} map MapLibre map instance created by initMap.
 */
function loadEconLoss(map) {
  const scenarios = [
    { id: 'worstcase', url: 'data/econLoss_3ft.json', color: '#eb1004' },
    { id: 'badcase', url: 'data/econLoss_2ft.json', color: '#ff7300' },
    { id: 'goodcase', url: 'data/econLoss_1ft.json', color: '#f8e800' },
    { id: 'bestcase', url: 'data/econLoss_0ft.json', color: '#2cff02' },
  ];

  scenarios.forEach((scenario) => {
    map.addSource(`econ_source_${scenario.id}`, {
      type: 'geojson',
      data: scenario.url,
    });

    map.addLayer({
      id: `econ_layer_${scenario.id}`,
      type: 'fill-extrusion',
      source: `econ_source_${scenario.id}`,
      layout: { visibility: 'none' },
      paint: {
        'fill-extrusion-color': scenario.color,
        'fill-extrusion-opacity': 0.8,
        // The base is 0 (ground level)
        'fill-extrusion-base': 0,
        // Extrude upward based on 'totloss'.
        'fill-extrusion-height': ['sqrt', ['coalesce', ['get', 'totloss']]],
      },
    });
  });
}

/**
 * Changes the line and economic parcel overlay on the map based on scenario selected
 *
 * @param {maplibregl.Map} map MapLibre map instance created by initMap.
 */
function erosionChange(map) {
  const scenarios = ['worstcase', 'badcase', 'goodcase', 'bestcase'];

  scenarios.forEach((scenario) => {
    const checkbox = document.querySelector(`#${scenario}`);

    if (checkbox) {
      checkbox.addEventListener('change', () => {
        const visibility = checkbox.checked ? 'visible' : 'none';

        if (map.getLayer(`erosion_layer_${scenario}`)) {
          map.setLayoutProperty(`erosion_layer_${scenario}`, 'visibility', visibility);
        }

        if (map.getLayer(`econ_layer_${scenario}`)) {
          map.setLayoutProperty(`econ_layer_${scenario}`, 'visibility', visibility);
        }
      });
    }
  });
}

export {
  loadErosionLine,
  loadEconLoss,
  erosionChange,
};
