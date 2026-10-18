import {
  magnitudeToRadius,
  formatMagnitude,
  formatDepth,
  formatDateTimeUTC,
  formatDistance,
  significanceToColor,
} from "./utils.js";

const WORLD_COPY_LONGITUDE_SHIFT = 360;
const MAP_MIN_LNG = -180;
const MAP_MAX_LNG = 540;
const MAP_WRAP_WIDTH = MAP_MAX_LNG - MAP_MIN_LNG;

let earthquakeLayer = null;
let beltsLayer = null;
let searchCircle = null;
let activeMarker = null;
const markersById = new Map();
let suppressWrapAdjustment = false;

function shiftCoordinates(coords, shift) {
  if (!Array.isArray(coords)) {
    return coords;
  }
  if (coords.length >= 2 && typeof coords[0] === "number" && typeof coords[1] === "number") {
    const [lng, lat, ...rest] = coords;
    if (!Number.isFinite(lng)) {
      return [lng, lat, ...rest];
    }
    return [lng + shift, lat, ...rest];
  }
  return coords.map((value) => shiftCoordinates(value, shift));
}

function shiftGeometry(geometry, shift) {
  if (!geometry || !geometry.coordinates) {
    return null;
  }
  return {
    ...geometry,
    coordinates: shiftCoordinates(geometry.coordinates, shift),
  };
}

function cloneFeatureWithShift(feature, shift) {
  if (!feature || !feature.geometry) {
    return null;
  }
  const shiftedGeometry = shiftGeometry(feature.geometry, shift);
  if (!shiftedGeometry) {
    return null;
  }
  return {
    ...feature,
    geometry: shiftedGeometry,
    properties: feature.properties ? { ...feature.properties } : {},
  };
}

function duplicateFeaturesForWorldCopy(features, shift = WORLD_COPY_LONGITUDE_SHIFT) {
  if (!Array.isArray(features)) {
    return [];
  }
  return features.flatMap((feature) => {
    if (!feature || !feature.geometry) {
      return feature ? [feature] : [];
    }
    const shifted = cloneFeatureWithShift(feature, shift);
    return shifted ? [feature, shifted] : [feature];
  });
}

function formatPlateName(rawName) {
  if (typeof rawName !== "string" || rawName.length === 0) {
    return "Seismic belt";
  }
  return rawName.replace(/\s*:\s*/g, " & ");
}

export function createMap(containerId = "map") {
  const map = L.map(containerId, {
    scrollWheelZoom: true,
    worldCopyJump: false,
    minZoom: 2,
    maxZoom: 10,
  }).setView([20, 0], 2.3);

  L.tileLayer(
    "https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/512/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoieXpoNzExIiwiYSI6ImNrbm9qeDN2YzE1Mzkyb3Fqa2QzdnRkOHEifQ.oBvJLn0dPTaxCuBgr5OHyQ",
    {
      minZoom: 2,
      maxZoom: 10,
      zoomOffset: -1,
      tileSize: 512,
      attribution: "© <a href=\"https://www.mapbox.com/\">Mapbox</a>",
    },
  ).addTo(map);

  map.on("moveend", () => enforceLongitudeWindow(map));

  return map;
}

export function renderBelts(map, belts) {
  if (beltsLayer) {
    beltsLayer.remove();
  }
  const beltsData = {
    ...(belts || { type: "FeatureCollection" }),
    features: duplicateFeaturesForWorldCopy(belts?.features || []),
  };
  beltsLayer = L.geoJSON(beltsData, {
    style: {
      color: "#ff5964",
      weight: 2,
      dashArray: "6 6",
      opacity: 0.7,
    },
    onEachFeature: (feature, layer) => {
      const props = feature.properties || {};
      const name = formatPlateName(props.Name || props.name || "Seismic belt");
      const source = props.Source || props.source || "";
      let type = props.Type || props.type || "";
      if (!type && typeof props.Description === "string") {
        const match = props.Description.match(/<td>LABEL<\/td>\s*<td>([^<]+)/i);
        if (match && match[1]) {
          type = match[1];
        }
      }
      const lines = [
        `<strong>${name}</strong>`,
        type ? `Boundary type: ${type}` : "",
        source ? `Source: ${source}` : "",
      ].filter(Boolean);
      layer.bindPopup(lines.join("<br>"));
    },
  }).addTo(map);
  return beltsLayer;
}

export function renderEarthquakes(map, features, options = {}) {
  if (earthquakeLayer) {
    earthquakeLayer.remove();
  }
  markersById.clear();
  activeMarker = null;

  const safeFeatures = Array.isArray(features) ? features : [];
  const displayFeatures = duplicateFeaturesForWorldCopy(safeFeatures);

  const layer = L.geoJSON(displayFeatures, {
    pointToLayer: (feature, latlng) => {
      const props = feature.properties;
      const marker = L.circleMarker(latlng, {
        radius: magnitudeToRadius(props.mag),
        fillColor: significanceToColor(props.significance),
        color: "rgba(255,255,255,0.15)",
        weight: 0.8,
        opacity: 0.9,
        fillOpacity: 0.85,
      });
      if (!markersById.has(props.id)) {
        markersById.set(props.id, marker);
      }
      return marker;
    },
    onEachFeature: (feature, layerInstance) => {
      const props = feature.properties;
      const popupContent = `
        <strong>${props.place || "Unknown location"}</strong><br>
        Magnitude: ${formatMagnitude(props.mag)}<br>
        Depth: ${formatDepth(props.depth)}<br>
        Occurred: ${formatDateTimeUTC(props.dateISO)}<br>
        ${props.hasTsunami ? "⚠️ Tsunami alert issued<br>" : ""}Significance: ${props.significance || "N/A"}
      `;
      layerInstance.bindPopup(popupContent);
      layerInstance.on("click", () => {
        highlightMarker(layerInstance);
        if (typeof options.onSelect === "function") {
          options.onSelect(props.id, feature);
        }
      });
    },
  });

  earthquakeLayer = layer.addTo(map);
  return earthquakeLayer;
}

export function highlightEarthquake(featureId, { openPopup = false } = {}) {
  const marker = markersById.get(featureId);
  if (!marker) return;
  highlightMarker(marker);
  if (openPopup) {
    marker.openPopup();
  }
}

export function panToFeature(map, feature, zoom = null) {
  if (!feature || !feature.geometry || !feature.geometry.coordinates) return;
  const [lng, lat] = feature.geometry.coordinates;
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    map.setView([lat, lng], zoom ?? Math.max(map.getZoom(), 4.5), { animate: true });
  }
}

export function setSearchCircle(map, center, radiusKm) {
  if (searchCircle) {
    searchCircle.remove();
    searchCircle = null;
  }
  if (!center || !Number.isFinite(center.lat) || !Number.isFinite(center.lng)) {
    return;
  }
  searchCircle = L.circle([center.lat, center.lng], {
    radius: radiusKm * 1000,
    color: "#4dc8fc",
    weight: 1,
    fillColor: "#4dc8fc",
    fillOpacity: 0.08,
    opacity: 0.5,
  }).addTo(map);
}

export function flyTo(map, center, zoom = 4.5) {
  if (!center || !Number.isFinite(center.lat) || !Number.isFinite(center.lng)) return;
  map.flyTo([center.lat, center.lng], zoom, { duration: 0.75 });
}

export function getMarker(featureId) {
  return markersById.get(featureId);
}

function highlightMarker(marker) {
  if (activeMarker && activeMarker !== marker) {
    resetMarkerStyle(activeMarker);
  }
  marker.setStyle({
    weight: 2.5,
    color: "#ffffff",
    fillOpacity: 0.95,
  });
  activeMarker = marker;
}

function resetMarkerStyle(marker) {
  marker.setStyle({
    weight: 0.8,
    color: "rgba(255,255,255,0.15)",
    fillOpacity: 0.85,
  });
}

function normalizeLongitude(lng) {
  if (!Number.isFinite(lng)) {
    return lng;
  }
  let normalized = lng;
  while (normalized < MAP_MIN_LNG) {
    normalized += MAP_WRAP_WIDTH;
  }
  while (normalized >= MAP_MAX_LNG) {
    normalized -= MAP_WRAP_WIDTH;
  }
  return normalized;
}

function enforceLongitudeWindow(map) {
  if (suppressWrapAdjustment) return;
  const center = map.getCenter();
  if (!center) return;
  const wrappedLng = normalizeLongitude(center.lng);
  if (wrappedLng === center.lng) {
    return;
  }
  suppressWrapAdjustment = true;
  map.setView([center.lat, wrappedLng], map.getZoom(), { animate: false });
  suppressWrapAdjustment = false;
}
