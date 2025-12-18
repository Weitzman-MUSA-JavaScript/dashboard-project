import { createMap } from "./map.js";

const map = createMap();

// 1) layer
const HistoricSitesLayer = L.layerGroup().addTo(map);
const foodLayer = L.layerGroup().addTo(map);
const parksLayer = L.layerGroup().addTo(map);

map.createPane("pane-food");
map.createPane("pane-historic");
map.createPane("pane-parks");


map.getPane("pane-food").style.zIndex = 400;
map.getPane("pane-historic").style.zIndex = 500;
map.getPane("pane-parks").style.zIndex = 600;

// 2) PPR fetch and add to layers
fetch("data/PPR_Program_Sites.geojson")
  .then(r => r.json())
  .then(data => {
    L.geoJSON(data, {
      pane: "markerPane",
      pointToLayer: (feature, latlng) => {
        return L.circleMarker(latlng, {
          radius: 5,
          fillColor: "#43bc63ff",   
          weight: 0,
          fillOpacity: 1
        });
      },
      onEachFeature: (feature, layer) => {
        layer.bindPopup(feature.properties.park_name);
      }
    }).addTo(parksLayer);
  });

// 2) FOOD fetch and add to layers
function getFoodOpacity(count) {
  if (count >= 20) return 0.75; 
  if (count >= 10) return 0.6;
  if (count >= 5)  return 0.45;
  if (count >= 1)  return 0.3;
  return 0.15;                 
}

fetch("data/NeighborhoodFoodRetail.geojson")
  .then(r => r.json())
  .then(data => {
    L.geoJSON(data, {
      pane: "pane-food",
      style: (feature) => {
        const count = feature.properties?.TOTAL_RESTAURANTS ?? 0;

        return {
          fillColor: "#540404ff",           
          fillOpacity: getFoodOpacity(count), 
          weight: 0
        };
      },
      onEachFeature: (feature, layer) => {
        const count = feature.properties?.TOTAL_RESTAURANTS ?? 0;
        layer.bindPopup(
          `<strong>Food retail area</strong><br/>
           Total restaurants: ${count}`
        );
      }
    }).addTo(foodLayer);
  });

const siteInput = document.querySelector("#site-search");
const resultsDiv = document.querySelector("#results");

if (!siteInput || !resultsDiv) {
  console.error("Missing #site-search or #results in HTML");
} else {
  const historicLayerById = new Map();
  let historicFeatures = [];

  fetch("data/historic_sites_philreg.geojson")
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status} for historic geojson`);
      return r.json();
    })
    .then((data) => {
      historicFeatures = data.features ?? [];
      console.log("Historic features loaded:", historicFeatures.length);

      L.geoJSON(data, {
        pane: "pane-historic",
        style: {
          fillColor: "#ff8000",
          weight: 0,
          fillOpacity: 1,
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties ?? {};
          const id = props.objectid ?? props.OBJECTID;
          if (id != null) historicLayerById.set(String(id), layer);

          const label = props.loc ?? "Unknown";
          layer.bindPopup(`<strong>Historic Site</strong><br/>${label}`);
        },
      }).addTo(HistoricSitesLayer);
    })
    .catch((err) => console.error("Historic fetch error:", err));

  siteInput.addEventListener("input", () => {
    const q = siteInput.value.trim().toLowerCase();
    resultsDiv.innerHTML = "";

    if (!q) return;

    const matches = historicFeatures
      .filter((f) => ((f.properties?.loc ?? "") + "").toLowerCase().includes(q))
      .slice(0, 10);

    console.log("Matches:", matches.length);

    matches.forEach((f) => {
      const props = f.properties ?? {};
      const id = String(props.objectid ?? props.OBJECTID ?? "");
      const label = props.loc ?? "Unknown";

      const item = document.createElement("button");
      item.type = "button";
      item.textContent = label;

      item.addEventListener("click", () => {
        const layer = historicLayerById.get(id);
        if (!layer) {
          console.warn("No layer found for id:", id);
          return;
        }
        map.fitBounds(layer.getBounds(), { padding: [20, 20] });
        layer.openPopup();
      });

      resultsDiv.appendChild(item);
    });
  });
}

const legend = L.control({ position: "bottomright" });

legend.onAdd = function () {
  const div = L.DomUtil.create("div", "map-legend");

  div.innerHTML = `
 

<h4>Legend</h4>

    <div class="legend-item">
      <span class="legend-color historic"></span>
      Historic Sites
    </div>

    <div class="legend-section">
      <div><strong>Food Retail</strong></div>

      <div class="legend-item">
        <span class="legend-color food food-20"></span>
        ≥ 20 restaurants
      </div>
      <div class="legend-item">
        <span class="legend-color food food-10"></span>
        10–19 restaurants
      </div>
      <div class="legend-item">
        <span class="legend-color food food-5"></span>
        5–9 restaurants
      </div>
      <div class="legend-item">
        <span class="legend-color food food-1"></span>
        1–4 restaurants
      </div>
      <div class="legend-item">
        <span class="legend-color food food-0"></span>
        0 restaurants
      </div>
    </div>

    <div class="legend-item">
      <span class="legend-dot park"></span>
      Parks
    </div>
  `;

  return div;
};

legend.addTo(map);

const toggleHistoric = document.querySelector("#toggle-historic");
const toggleFood = document.querySelector("#toggle-food");
const toggleParks = document.querySelector("#toggle-parks");

toggleHistoric.addEventListener("change", () => {
  if (toggleHistoric.checked) map.addLayer(HistoricSitesLayer);
  else map.removeLayer(HistoricSitesLayer);
});

toggleFood.addEventListener("change", () => {
  if (toggleFood.checked) map.addLayer(foodLayer);
  else map.removeLayer(foodLayer);
});

toggleParks.addEventListener("change", () => {
  if (toggleParks.checked) map.addLayer(parksLayer);
  else map.removeLayer(parksLayer);
});

layer.on("mouseover", () => layer.setStyle({ fillOpacity: 0.8 }));
layer.on("mouseout", () => layer.setStyle({ fillOpacity: 1 }));