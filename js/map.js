/**
 * Map setup and marker styling.
 */

const CITY_HALL = [39.9526, -75.1652];

const ACCESS_COLORS = {
  free: '#0f766e',
  customers: '#7c3aa8',
  limited: '#4b5563',
  unknown: '#4b5563',
};

function createMap(elementId) {
  const map = L.map(elementId, {
    center: CITY_HALL,
    zoom: 15,
    zoomControl: false,
  });

  L.control.zoom({ position: 'topright' }).addTo(map);

  // Esri's light gray canvas: a quiet, no-key basemap that lets the markers stand out.
  // Detailed tiles stop at zoom 16 in North America, so closer zooms scale those tiles up.
  const esriAttribution = 'Tiles &copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    maxNativeZoom: 16,
    attribution: esriAttribution,
  }).addTo(map);

  // Street and place labels sit above the gray base but below the markers.
  map.createPane('labels');
  map.getPane('labels').style.zIndex = 350;
  map.getPane('labels').style.pointerEvents = 'none';
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    maxNativeZoom: 16,
    pane: 'labels',
  }).addTo(map);

  return map;
}

/** Filled markers have known hours; hollow markers have unknown hours. */
function markerStyle(place, selected = false) {
  const color = ACCESS_COLORS[place.access];
  const hoursKnown = Boolean(place.schedule);
  if (selected) {
    return {
      radius: 11,
      color: '#172033',
      weight: 3,
      fillColor: hoursKnown ? color : '#fff',
      fillOpacity: 1,
    };
  }
  return {
    radius: 7,
    color: hoursKnown ? '#fff' : color,
    weight: hoursKnown ? 2 : 3,
    fillColor: hoursKnown ? color : '#fff',
    fillOpacity: 1,
  };
}

function createSearchArea(map, center, radius) {
  const circle = L.circle(center, {
    radius,
    color: '#0b4f9c',
    weight: 1.5,
    dashArray: '6 6',
    fill: false,
    interactive: false,
  }).addTo(map);

  const dot = L.circleMarker(center, {
    radius: 7,
    color: '#fff',
    weight: 3,
    fillColor: '#f2c230',
    fillOpacity: 1,
    interactive: false,
  }).addTo(map);

  return {
    moveTo(latlng) {
      circle.setLatLng(latlng);
      dot.setLatLng(latlng);
    },
  };
}

/** A blue "you are here" dot with a soft accuracy ring. */
function createUserMarker(map) {
  const ring = L.circle(CITY_HALL, {
    radius: 30,
    color: '#1d6fe0',
    weight: 1,
    fillColor: '#1d6fe0',
    fillOpacity: 0.12,
    interactive: false,
  });
  const dot = L.circleMarker(CITY_HALL, {
    radius: 8,
    color: '#fff',
    weight: 3,
    fillColor: '#1d6fe0',
    fillOpacity: 1,
  }).bindTooltip('You are here', { direction: 'top', offset: [0, -8] });

  return {
    show(latlng, accuracy) {
      ring.setLatLng(latlng).setRadius(Math.min(accuracy || 30, 300));
      dot.setLatLng(latlng);
      ring.addTo(map);
      dot.addTo(map);
    },
  };
}

export { CITY_HALL, createMap, markerStyle, createSearchArea, createUserMarker };
