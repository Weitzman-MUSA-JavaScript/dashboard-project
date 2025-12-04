
let map;
let allData = null;       
let geojsonLayer = null;   
let placesByName = {};    

// Crime
let streetData = null;
let crimeData = null;
let crimeHeat = null;

// Road
const graph = new Map();      // nodeId -> [{ to, dist, safeCost, coords }]
const nodeCoords = new Map(); // nodeId -> { lat, lng }
let currentRouteLayer = null; // route polyline

// campus
const CAMPUS_BBOX = {
  minLat: 39.94,
  maxLat: 39.96,
  minLng: -75.21,
  maxLng: -75.18,
};

function initMap() {
  map = L.map("map").setView([39.9526, -75.193], 15);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);
}

// distance
function distanceMeters(lat1, lng1, lat2, lng2) {
  return L.latLng(lat1, lng1).distanceTo(L.latLng(lat2, lng2));
}

// ---------------------- safety color -------------------------
function getSafetyColor(safety) {
  if (safety >= 4) return "#169425";   
  if (safety === 3) return "#f3d200";  
  if (safety === 2) return "#FF851B";  
  return "#bd150c";                    
}

// ----------------------------------------------
initMap();

Promise.all([
  fetch("data/UpennBuilding.geojson").then(r => r.json()),
  fetch("data/Street_Centerline.geojson").then(r => r.json()),
  fetch("data/Crime.geojson").then(r => r.json())
]).then(([buildings, streets, crimes]) => {
  allData = buildings;
  streetData = streets;
  crimeData = crimes;

  console.log("Graph build start...");
  buildGraph();                  
  console.log("Graph built with", graph.size, "nodes");

  initBuildingLayer();           
  initCrimeHeatmap();            
  setupFilters();                
  setupSearch();                 
  setupNavigationDropdowns();    
}).catch(err => {
  console.error("加载数据失败：", err);
});

// ---------------------------------------------
function initBuildingLayer() {
  if (!allData) return;

  // placesByName
  placesByName = {};
  allData.features.forEach(f => {
    const props = f.properties || {};
    const name = props.Name;
    if (!name) return;
    const [lng, lat] = f.geometry.coordinates;
    placesByName[name] = {
      lat,
      lng,
      props,
    };
  });

  geojsonLayer = L.geoJSON(allData, {
    pointToLayer: function (feature, latlng) {
      const p = feature.properties;
      const safety = Number(p.PerceivedSafety);
      return L.circleMarker(latlng, {
        radius: 6,
        fillColor: getSafetyColor(safety),
        color: "#ffffff",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.9,
      });
    },
    onEachFeature: function (feature, layer) {
      const props = feature.properties;
      const name = props.Name || "Unknown place";
      const category = props.Category || "N/A";
      const popNight = props.Popularity_Night ?? "N/A";
      const lighting = props.LightingLevel ?? "N/A";
      const safety = props.PerceivedSafety ?? "N/A";

      const popupHtml = `
        <strong>${name}</strong><br/>
        Category: ${category}<br/>
        Popularity at night: ${popNight}<br/>
        Lighting: ${lighting}<br/>
        Perceived safety: ${safety}
      `;
      layer.bindPopup(popupHtml);
    },
  }).addTo(map);
}

// ---------------------- Crime-------------------------
function initCrimeHeatmap() {
  if (!crimeData) return;

  
  const heatPoints = [];
  crimeData.features.forEach(f => {
    const [lng, lat] = f.geometry.coordinates;
    if (
      lat >= CAMPUS_BBOX.minLat && lat <= CAMPUS_BBOX.maxLat &&
      lng >= CAMPUS_BBOX.minLng && lng <= CAMPUS_BBOX.maxLng
    ) {
      heatPoints.push([lat, lng, 0.5]); 
    }
  });

  if (heatPoints.length === 0) return;

  crimeHeat = L.heatLayer(heatPoints, {
    radius: 20,
    blur: 15,
    maxZoom: 17,
  });

  const toggle = document.getElementById("crime-toggle");
  if (!toggle) return;

  
  if (toggle.checked) {
    crimeHeat.addTo(map);
  }

  toggle.addEventListener("change", function () {
    if (this.checked) {
      crimeHeat.addTo(map);
    } else {
      map.removeLayer(crimeHeat);
    }
  });
}

// --------------------------
function getCampusCrimePoints() {
  if (!crimeData) return [];
  const pts = [];
  crimeData.features.forEach(f => {
    const [lng, lat] = f.geometry.coordinates;
    if (
      lat >= CAMPUS_BBOX.minLat && lat <= CAMPUS_BBOX.maxLat &&
      lng >= CAMPUS_BBOX.minLng && lng <= CAMPUS_BBOX.maxLng
    ) {
      pts.push({ lat, lng });
    }
  });
  return pts;
}

function getCampusLightingPoints() {
  if (!allData) return [];
  const pts = [];
  allData.features.forEach(f => {
    const props = f.properties || {};
    const level = Number(props.LightingLevel);
    if (Number.isNaN(level)) return;
    const [lng, lat] = f.geometry.coordinates;
    if (
      lat >= CAMPUS_BBOX.minLat && lat <= CAMPUS_BBOX.maxLat &&
      lng >= CAMPUS_BBOX.minLng && lng <= CAMPUS_BBOX.maxLng
    ) {
      pts.push({ lat, lng, lighting: level });
    }
  });
  return pts;
}

// ------------------------------------------
function buildGraph() {
  if (!streetData) return;

  const crimePts = getCampusCrimePoints();
  const lightPts = getCampusLightingPoints();

  // LineString
  streetData.features.forEach(feat => {
    if (!feat.geometry || feat.geometry.type !== "LineString") return;
    const coords = feat.geometry.coordinates; // [ [lng,lat], [lng,lat], ... ]
    if (!coords || coords.length < 2) return;

    
    let insideCampus = coords.some(([lng, lat]) =>
      lat >= CAMPUS_BBOX.minLat && lat <= CAMPUS_BBOX.maxLat &&
      lng >= CAMPUS_BBOX.minLng && lng <= CAMPUS_BBOX.maxLng
    );
    if (!insideCampus) return;

    for (let i = 0; i < coords.length - 1; i++) {
      const [lng1, lat1] = coords[i];
      const [lng2, lat2] = coords[i + 1];

      const id1 = nodeId(lat1, lng1);
      const id2 = nodeId(lat2, lng2);

      if (!nodeCoords.has(id1)) nodeCoords.set(id1, { lat: lat1, lng: lng1 });
      if (!nodeCoords.has(id2)) nodeCoords.set(id2, { lat: lat2, lng: lng2 });

      const dist = distanceMeters(lat1, lng1, lat2, lng2);

      // crime risk / lighting
      const midLat = (lat1 + lat2) / 2;
      const midLng = (lng1 + lng2) / 2;

      const crimeRisk = edgeCrimeRisk(midLat, midLng, crimePts);   // 0~1
      const lightPenalty = edgeLightingPenalty(midLat, midLng, lightPts); // 0~1

      // cost = distance * (1 + crimeRisk*2 + lightPenalty)
      const safeCost = dist * (1 + crimeRisk * 2 + lightPenalty);

      const edge = {
        to: id2,
        dist,
        safeCost,
        coords: [
          { lat: lat1, lng: lng1 },
          { lat: lat2, lng: lng2 },
        ],
      };

      const edgeRev = {
        to: id1,
        dist,
        safeCost,
        coords: [
          { lat: lat2, lng: lng2 },
          { lat: lat1, lng: lng1 },
        ],
      };

      if (!graph.has(id1)) graph.set(id1, []);
      if (!graph.has(id2)) graph.set(id2, []);

      graph.get(id1).push(edge);
      graph.get(id2).push(edgeRev); 
    }
  });
}

function nodeId(lat, lng) {
  
  return `${lat.toFixed(6)},${lng.toFixed(6)}`;
}

// crime risk：0 ~ 1
function edgeCrimeRisk(lat, lng, crimePts) {
  if (!crimePts || crimePts.length === 0) return 0;
  let minDist = Infinity;
  for (const c of crimePts) {
    const d = distanceMeters(lat, lng, c.lat, c.lng);
    if (d < minDist) minDist = d;
  }
  const R = 80; 
  if (minDist >= R) return 0;
  
  return (R - minDist) / R;
}

// lighting penalty：0 ~ 1
function edgeLightingPenalty(lat, lng, lightPts) {
  if (!lightPts || lightPts.length === 0) return 0.3; 
  let minDist = Infinity;
  let nearestLevel = 3;
  for (const p of lightPts) {
    const d = distanceMeters(lat, lng, p.lat, p.lng);
    if (d < minDist) {
      minDist = d;
      nearestLevel = p.lighting;
    }
  }
  
  if (minDist > 100) return 0.3;

  // LightingLevel：1 ~ 5
  if (nearestLevel >= 4) return 0;    
  if (nearestLevel === 3) return 0.1; 
  if (nearestLevel === 2) return 0.4; 
  return 0.8;                         
}

// ---------------------- Filter ------------------------
function setupFilters() {
  if (!allData || !geojsonLayer) return;

  const checkboxes = document.querySelectorAll('input[name="category-filter"]');
  checkboxes.forEach(cb => cb.addEventListener("change", applyFilters));

  // Safety slider
  const safetySlider = document.getElementById("safety-min");
  const safetySpan = document.getElementById("safety-min-value");
  if (safetySlider && safetySpan) {
    safetySpan.textContent = safetySlider.value + "+";
    safetySlider.addEventListener("input", () => {
      safetySpan.textContent = safetySlider.value + "+";
      applyFilters();
    });
  }

  // Popularity slider
  const popSlider = document.getElementById("pop-min");
  const popSpan = document.getElementById("pop-min-value");
  if (popSlider && popSpan) {
    popSpan.textContent = popSlider.value + "+";
    popSlider.addEventListener("input", () => {
      popSpan.textContent = popSlider.value + "+";
      applyFilters();
    });
  }

  // Lighting slider
  const lightSlider = document.getElementById("light-min");
  const lightSpan = document.getElementById("light-min-value");
  if (lightSlider && lightSpan) {
    lightSpan.textContent = lightSlider.value + "+";
    lightSlider.addEventListener("input", () => {
      lightSpan.textContent = lightSlider.value + "+";
      applyFilters();
    });
  }

  applyFilters();
}

function applyFilters() {
  if (!allData || !geojsonLayer) return;

  const checkboxes = document.querySelectorAll('input[name="category-filter"]');
  const activeCategories = Array.from(checkboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.value);

  const safetySlider = document.getElementById("safety-min");
  const minSafety = safetySlider ? Number(safetySlider.value) : 1;

  const popSlider = document.getElementById("pop-min");
  const minPop = popSlider ? Number(popSlider.value) : 0;

  const lightSlider = document.getElementById("light-min");
  const minLight = lightSlider ? Number(lightSlider.value) : 0;

  geojsonLayer.clearLayers();

  const filteredFeatures = allData.features.filter(f => {
    const p = f.properties;

    const catOK =
      activeCategories.length === 0
        ? true
        : activeCategories.includes(p.Category);

    const sVal = Number(p.PerceivedSafety);
    const safetyOK = !Number.isNaN(sVal) && sVal >= minSafety;

    const popVal = Number(p.Popularity_Night);
    const popOK = !Number.isNaN(popVal) && popVal >= minPop;

    const lVal = Number(p.LightingLevel);
    const lightOK = !Number.isNaN(lVal) && lVal >= minLight;

    return catOK && safetyOK && popOK && lightOK;
  });

  geojsonLayer.addData(filteredFeatures);
}

// ---------------------- Search -------------------------
function setupSearch() {
  const searchButton = document.getElementById("search-button");
  const searchInput = document.getElementById("place-search");
  if (!searchButton || !searchInput) return;

  const doSearch = () => {
    if (!allData) return;
    const query = searchInput.value.trim().toLowerCase();
    if (!query) return;

    let targetFeature = null;
    for (const f of allData.features) {
      const name = (f.properties.Name || "").toLowerCase();
      if (name.includes(query)) {
        targetFeature = f;
        break;
      }
    }

    if (!targetFeature) {
      alert("No matching place found.");
      return;
    }

    const [lng, lat] = targetFeature.geometry.coordinates;
    const latlng = [lat, lng];
    map.setView(latlng, 18);

    let targetLayer = null;
    geojsonLayer.eachLayer(layer => {
      if (layer.feature === targetFeature) targetLayer = layer;
    });
    if (targetLayer) targetLayer.openPopup();
  };

  searchButton.addEventListener("click", doSearch);
  searchInput.addEventListener("keydown", e => {
    if (e.key === "Enter") doSearch();
  });
}

// ----------------------Button-----------------------
function setupNavigationDropdowns() {
  const startSelect = document.getElementById("nav-start");
  const endSelect = document.getElementById("nav-end");
  if (!startSelect || !endSelect) return;

  startSelect.length = 1;
  endSelect.length = 1;

  const names = Object.keys(placesByName).sort((a, b) => a.localeCompare(b));
  names.forEach(name => {
    const o1 = document.createElement("option");
    o1.value = name;
    o1.textContent = name;
    startSelect.appendChild(o1);

    const o2 = document.createElement("option");
    o2.value = name;
    o2.textContent = name;
    endSelect.appendChild(o2);
  });

  const btnShortest = document.getElementById("btn-shortest-route");
  const btnSafest = document.getElementById("btn-safest-route");
  const btnClear = document.getElementById("btn-clear-route");

  if (btnShortest) btnShortest.addEventListener("click", () => drawRoute("shortest"));
  if (btnSafest) btnSafest.addEventListener("click", () => drawRoute("safest"));
  if (btnClear) btnClear.addEventListener("click", clearRoute);
}

// --------------------------------------------
function findNearestNode(lat, lng) {
  let bestId = null;
  let bestDist = Infinity;
  for (const [id, coord] of nodeCoords.entries()) {
    const d = distanceMeters(lat, lng, coord.lat, coord.lng);
    if (d < bestDist) {
      bestDist = d;
      bestId = id;
    }
  }
  return bestId;
}

function dijkstra(startId, endId, mode) {
  const dist = new Map();
  const prev = new Map();
  const visited = new Set();

  const weightKey = mode === "safest" ? "safeCost" : "dist";

  for (const id of graph.keys()) {
    dist.set(id, Infinity);
  }
  dist.set(startId, 0);

  while (true) {
    let u = null;
    let best = Infinity;
    for (const [id, d] of dist.entries()) {
      if (!visited.has(id) && d < best) {
        best = d;
        u = id;
      }
    }
    if (u === null) break;
    if (u === endId) break;

    visited.add(u);
    const edges = graph.get(u) || [];
    for (const e of edges) {
      const v = e.to;
      if (visited.has(v)) continue;
      const w = e[weightKey];
      const alt = dist.get(u) + w;
      if (alt < dist.get(v)) {
        dist.set(v, alt);
        prev.set(v, u);
      }
    }
  }

  if (!prev.has(endId)) return null;

  const path = [];
  let cur = endId;
  while (cur) {
    path.push(cur);
    cur = prev.get(cur);
  }
  path.reverse();
  return path;
}

// nodeId path
function pathToLatLngs(nodePath) {
  const latlngs = [];
  if (!nodePath || nodePath.length === 0) return latlngs;

  for (let i = 0; i < nodePath.length - 1; i++) {
    const a = nodePath[i];
    const b = nodePath[i + 1];
    const edges = graph.get(a) || [];
    const edge = edges.find(e => e.to === b);
    if (!edge) continue;
    if (i === 0) {
      latlngs.push([edge.coords[0].lat, edge.coords[0].lng]);
    }
    latlngs.push([edge.coords[1].lat, edge.coords[1].lng]);
  }
  return latlngs;
}

// ---------------------------------------
function drawRoute(mode) {
  const startSelect = document.getElementById("nav-start");
  const endSelect = document.getElementById("nav-end");
  if (!startSelect || !endSelect) return;

  const startName = startSelect.value;
  const endName = endSelect.value;

  if (!startName || !endName) {
    alert("Please select both start and destination.");
    return;
  }
  if (startName === endName) {
    alert("Start and destination cannot be the same.");
    return;
  }

  const startPlace = placesByName[startName];
  const endPlace = placesByName[endName];
  if (!startPlace || !endPlace) return;

  const startNode = findNearestNode(startPlace.lat, startPlace.lng);
  const endNode = findNearestNode(endPlace.lat, endPlace.lng);

  if (!startNode || !endNode) {
    alert("Cannot snap to street network. Check data extent.");
    return;
  }

  const nodePath = dijkstra(startNode, endNode, mode);
  if (!nodePath) {
    alert("No route found between these places.");
    return;
  }

  const latlngs = pathToLatLngs(nodePath);
  if (!latlngs || latlngs.length < 2) {
    alert("Route is too short or invalid.");
    return;
  }

  if (currentRouteLayer) {
    map.removeLayer(currentRouteLayer);
    currentRouteLayer = null;
  }

  let color = "#0074D9"; // shortest
  if (mode === "safest") color = "#2ECC40";

  currentRouteLayer = L.polyline(latlngs, {
    color,
    weight: 4,
    opacity: 0.9,
  }).addTo(map);

  map.fitBounds(currentRouteLayer.getBounds(), { padding: [40, 40] });
}

function clearRoute() {
  if (currentRouteLayer) {
    map.removeLayer(currentRouteLayer);
    currentRouteLayer = null;
  }
}


