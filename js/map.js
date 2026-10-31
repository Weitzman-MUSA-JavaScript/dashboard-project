import maplibregl from 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/+esm';

// Define island views in a single configuration object for easy scaling
const ISLAND_VIEWS = {
  all: { center: [20.9103307, -157.6130472], zoom: 6.5 },
  hawaii: { center: [19.5351817, -155.6250371], zoom: 9 },
  maui: { center: [20.798363, -156.331925], zoom: 9.5 },
  oahu: { center: [21.438912, -158.000057], zoom: 9.5 },
  kauai: { center: [22.0552559, -159.5161268], zoom: 9.5 },
};

/**
 * Initializes the MapLibre map. Also handles the selection of different islands.
 *
 * @param {HTMLElement|string} el Element or selector for the map container.
 * @returns {maplibregl.Map} The initialized Leaflet map instance.
 */
function initMap(el) {
  const center = [ISLAND_VIEWS.all.center[1], ISLAND_VIEWS.all.center[0]];

  const map = new maplibregl.Map({
    container: el,
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    center: center,
    zoom: ISLAND_VIEWS.all.zoom,
  });

  const btn3D = document.getElementById('generate-3d');
  let is3D = false;

  if (btn3D) {
    btn3D.addEventListener('click', () => {
      is3D = !is3D;

      if (is3D) {
        map.easeTo({ pitch: 80, bearing: -20, duration: 1500 });
        btn3D.innerText = 'Return to Flat 2D View';
        btn3D.classList.add('btn-3d-active');
      } else {
        map.easeTo({ pitch: 0, bearing: 0, duration: 1500 });
        btn3D.innerText = 'Press for 3D View';
        btn3D.classList.remove('btn-3d-active');
      }
    });
  }

  // Grab the actual HTML select element to listen for user changes
  const islandSelect = document.querySelector('#island-select');

  if (islandSelect) {
    islandSelect.addEventListener('change', (evt) => {
      const selectedIsland = evt.target.value;
      const viewParams = ISLAND_VIEWS[selectedIsland];

      if (viewParams) {
        const lngLatCenter = [viewParams.center[1], viewParams.center[0]];

        map.flyTo({
          center: lngLatCenter,
          zoom: viewParams.zoom,
          essential: true,
        });
      }
    });
  }

  return map;
}

export {
  initMap,
  ISLAND_VIEWS,
};
