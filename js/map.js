import { config, Map, MapStyle, Popup } from '@maptiler/sdk';

if (!window.MAPTILER_API_KEY) {
  throw new Error('Set a MapTiler API key in js/config.js before loading the map.');
}

config.apiKey = window.MAPTILER_API_KEY;

const map = new Map({
  container: document.getElementById('map'),
  style: MapStyle.BASIC,
  center: [-75.1636, 39.9526],
  zoom: 13,
});

const septaDatasets = [
  {
    id: 'summer-2026',
    name: 'PREVIOUS ROUTES',
    url: 'data/septa_bus_stops_summer_2026.geojson',
    routeProperty: 'Route',
    color: '#F14728',
  },
  {
    id: 'fall-2026',
    name: 'CURRENT ROUTES',
    url: 'data/septa_bus_stops_fall_2026.geojson',
    routeProperty: 'Line',
    color: '#1F4FA3',
  },
];

const changedRoutes = new Set([
  '17', '25', '44', '45', '49', '52', '53',
  '57', '60', '61', '64', '79', '105',
]);

const discontinuedRoutes = new Set([
  '35', '47M', '62', '78', '80', '89', '106',
]);

const stopPopups = new Set();

async function loadSeptaDataset(dataset) {
  const response = await fetch(dataset.url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} loading ${dataset.url}`);
  }

  const data = await response.json();
  // ignore route 0, does not exist
  data.features = data.features.filter(
    (feature) => String(feature.properties?.[dataset.routeProperty] ?? '').trim() !== '0',
  );
  const layerId = `stops-${dataset.id}`;
  map.addSource(dataset.id, {
    type: 'geojson',
    data,
  });
  map.addLayer({
    id: layerId,
    type: 'circle',
    source: dataset.id,
    paint: {
      'circle-radius': 4,
      'circle-color': dataset.color,
      'circle-stroke-color': dataset.color,
      'circle-stroke-width': 0.5,
      'circle-opacity': 0.75,
    },
  });
  // pop ups when you click a stop
  map.on('click', layerId, (event) => {
    if (
      dataset.id === 'summer-2026' &&
      map.getLayer('stops-fall-2026') &&
      map.queryRenderedFeatures(event.point, { layers: ['stops-fall-2026'] }).length > 0
    ) {
      return;
    }

    const feature = event.features?.[0];
    const properties = feature?.properties;
    if (!properties) {
      return;
    }

    const route = properties[dataset.routeProperty];
    const stopName = properties.Stop_Name ?? properties.Stop ?? properties.name;
    const popupContent = document.createElement('div');

    if (stopName) {
      const name = document.createElement('strong');
      name.textContent = String(stopName);
      popupContent.appendChild(name);
    }

    // which direction bus is going
    const direction = properties.Direction;
    if (direction) {
      const directionLabel = document.createElement('p');
      directionLabel.append(`${direction} ${route} Bus`);
      popupContent.appendChild(directionLabel);
    }

    if (
      dataset.id === 'summer-2026' &&
      route !== null &&
      route !== undefined &&
      (discontinuedRoutes.has(String(route)) || changedRoutes.has(String(route)))
    ) {
      const routeStatus = document.createElement('p');
      routeStatus.textContent = `This stop is no longer accurate! Navigate to the closest ${direction} blue-colored stop to catch the ${route}.`;
      popupContent.appendChild(routeStatus);
    }

    // uncomment to have route status in pop up
    // if (route !== null && route !== undefined) {
    //     const routeStatus = document.createElement('p');

    //     if (changedRoutes.has(String(route)))
    //         routeStatus.textContent = `Route ${route} changed!`
    //     else if (discontinuedRoutes.has(String(route)))
    //         routeStatus.textContent = `Route ${route} was discontinued!`
    //     else
    //         routeStatus.textContent = `Route ${route} stayed the same!`

    //     popupContent.appendChild(routeStatus);
    // }

    const popup = new Popup()
      .setLngLat(event.lngLat)
      .setDOMContent(popupContent)
      .addTo(map);
    stopPopups.add(popup);
    popup.on('close', () => stopPopups.delete(popup));
  });
  map.on('mouseenter', layerId, () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', layerId, () => {
    map.getCanvas().style.cursor = '';
  });

  return { dataset, data, layerId };
}

function createRouteFilterControl(datasets, onRouteChange) {
  const routeValues = new Set();
  datasets.forEach(({ dataset, data }) => {
    data.features.forEach((feature) => {
      const route = feature.properties?.[dataset.routeProperty];
      if (route !== null && route !== undefined && String(route).trim() !== '') {
        routeValues.add(String(route));
      }
    });
  });

  let container;
  return {
    onAdd() {
      container = document.createElement('div');
      container.className = 'maplibregl-ctrl maplibregl-ctrl-group route-filter';

      const label = document.createElement('label');
      label.htmlFor = 'route-filter-select';
      label.textContent = 'Route: ';

      const select = document.createElement('select');
      select.id = 'route-filter-select';
      select.setAttribute('aria-label', 'Filter bus stops by route');

      const resetButton = document.createElement('button');
      resetButton.type = 'button';
      resetButton.id = 'route-reset';
      resetButton.textContent = 'Reset';
      resetButton.setAttribute('aria-label', 'Reset filter');

      // sort routes in order
      const sortedRoutes = [...routeValues]
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

      const allRoutes = document.createElement('option');
      allRoutes.value = '';
      allRoutes.textContent = 'All Routes';
      select.appendChild(allRoutes);

      sortedRoutes.forEach((route) => {
        const option = document.createElement('option');
        option.value = route;
        option.textContent = route;
        select.appendChild(option);
      });

      const applyRouteFilter = () => {
        const selectedRoute = select.value;
        stopPopups.forEach((popup) => popup.remove());
        datasets.forEach(({ dataset, layerId }) => {
          const filter = selectedRoute
            ? ['==', ['to-string', ['get', dataset.routeProperty]], selectedRoute]
            : null;
          map.setFilter(layerId, filter);
        });
        onRouteChange(selectedRoute);
      };

      select.addEventListener('change', () => {
        applyRouteFilter();
      });

      resetButton.addEventListener('click', () => {
        select.value = '';
        applyRouteFilter();
      });

      container.append(label, select, resetButton);
      return container;
    },
    onRemove() {
      container?.remove();
    },
  };
}

function createRouteStatusControl() {
  // state of filter
  let status;
  let container;
  return {
    control: {
      onAdd() {
        container = document.createElement('div');
        container.className = 'maplibregl-ctrl route-status-control';
        container.setAttribute('aria-live', 'polite');
        container.classList.add('status-neutral');

        status = document.createElement('p');
        status.textContent = 'Select a route to see whether it changed.';
        container.appendChild(status);

        return container;
      },
      onRemove() {
        status?.parentElement?.remove();
      },
    },
    update(route) {
      // no route selected
      if (!status) {
        return;
      }

      if (!route) {
        status.textContent = 'Select a route to see whether it changed.';
        container.classList.add('status-neutral');
        container.classList.remove('status-changed', 'status-discontinued', 'status-unchanged');
      } else if (changedRoutes.has(route)) {
        status.textContent = `Route ${route} changed.`;
        container.classList.add('status-changed');
        container.classList.remove('status-neutral', 'status-discontinued', 'status-unchanged');
      } else if (discontinuedRoutes.has(route)) {
        status.textContent = `Route ${route} was discontinued.`;
        container.classList.add('status-discontinued');
        container.classList.remove('status-neutral', 'status-changed', 'status-unchanged');
      } else {
        status.textContent = `Route ${route} stayed the same.`;
        container.classList.add('status-unchanged');
        container.classList.remove('status-neutral', 'status-changed', 'status-discontinued');
      }
    },
  };
}

function createLayerControl(datasets) {
  let container;
  const checkboxes = new globalThis.Map();
  return {
    onAdd() {
      container = document.createElement('div');
      container.className = 'maplibregl-ctrl maplibregl-ctrl-group route-layer-control';

      datasets.forEach(({ dataset, layerId }) => {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = dataset.id !== 'summer-2026';
        checkboxes.set(dataset.id, checkbox);
        if (!checkbox.checked) {
          map.setLayoutProperty(layerId, 'visibility', 'none');
        }
        checkbox.addEventListener('change', () => {
          map.setLayoutProperty(
            layerId,
            'visibility',
            checkbox.checked ? 'visible' : 'none',
          );
        });
        label.append(checkbox, document.createTextNode(dataset.name));
        container.appendChild(label);
      });

      return container;
    },
    onRemove() {
      container?.remove();
    },
    setPreviousRoutesVisible(visible) {
      const checkbox = checkboxes.get('summer-2026');
      if (!checkbox) {
        return;
      }

      checkbox.checked = visible;
      map.setLayoutProperty(
        'stops-summer-2026',
        'visibility',
        visible ? 'visible' : 'none',
      );
    },
  };
}

function getDataBounds(datasets, selectedRoute = '') {
  const bounds = {
    west: Infinity,
    south: Infinity,
    east: -Infinity,
    north: -Infinity,
  };

  function includeCoordinates(coordinates) {
    if (typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number') {
      bounds.west = Math.min(bounds.west, coordinates[0]);
      bounds.east = Math.max(bounds.east, coordinates[0]);
      bounds.south = Math.min(bounds.south, coordinates[1]);
      bounds.north = Math.max(bounds.north, coordinates[1]);
      return;
    }
    coordinates.forEach(includeCoordinates);
  }

  datasets.forEach(({ dataset, data }) => {
    data.features.forEach((feature) => {
      if (selectedRoute &&
        String(feature.properties?.[dataset.routeProperty] ?? '') !== selectedRoute) {
        return;
      }
      if (feature.geometry?.coordinates) {
        includeCoordinates(feature.geometry.coordinates);
      }
    });
  });

  return bounds;
}

function fitMapToDatasets(datasets, selectedRoute = '') {
  const bounds = getDataBounds(datasets, selectedRoute);
  if (Number.isFinite(bounds.west)) {
    map.fitBounds(
      [[bounds.west, bounds.south], [bounds.east, bounds.north]],
      { padding: 40, maxZoom: selectedRoute ? 15 : 14 },
    );
  }
}

async function displaySeptaDatasets() {
  await new Promise((resolve) => map.once('load', resolve));

  const results = await Promise.allSettled(septaDatasets.map((dataset) => loadSeptaDataset(dataset)));
  const loadedDatasets = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      loadedDatasets.push(result.value);
    } else {
      console.error(
        `Error - Could not display ${septaDatasets[index].name}:`,
        result.reason,
      );
    }
  });

  // error check for dataset if empty
  if (loadedDatasets.length === 0) {
    console.error('No SEPTA bus stop datasets could be displayed.');
    return;
  }

  if (loadedDatasets.some(({ dataset }) => dataset.id === 'fall-2026')) {
    map.moveLayer('stops-fall-2026');
  }

  const routeStatus = createRouteStatusControl();
  const layerControl = createLayerControl(loadedDatasets);

  map.addControl(routeStatus.control, 'top-left');
  map.addControl(createRouteFilterControl(loadedDatasets, (route) => {
    routeStatus.update(route);
    layerControl.setPreviousRoutesVisible(
      Boolean(route && (changedRoutes.has(route) || discontinuedRoutes.has(route))),
    );
    fitMapToDatasets(loadedDatasets, route);
  }), 'top-left');
  map.addControl(layerControl, 'top-left');

  fitMapToDatasets(loadedDatasets);
}

displaySeptaDatasets();
