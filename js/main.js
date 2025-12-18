// MAP SETUP


const map = L.map("map", {
  zoomSnap: 0,
  scrollWheelZoom: true
}).setView([39.99, -75.12], 11);

L.tileLayer(
  "https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/{z}/{x}/{y}@2x?access_token=pk.eyJ1Ijoibm9kaSIsImEiOiJjbWZlYzdldXMwNWhxMnNvYzNvOWM1c3l1In0.M5eQdMz9QGmElmCb4_mvGg",
  {
    maxZoom: 18,
    zoomOffset: -1,
    tileSize: 512,
    attribution: "&copy; Mapbox & OSM"
  }
).addTo(map);


async function reverseGeocode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data && data.display_name) {
      return data.display_name;
    } else {
      return "Unknown location";
    }
  } catch (err) {
    console.error("Reverse geocoding failed:", err);
    return "Address not found";
  }
}


map.on("click", async function (e) {
  const lat = e.latlng.lat;
  const lon = e.latlng.lng;

  // Reverse geocode clicked location
  const clickedAddress = await reverseGeocode(lat, lon);

  // Show the clicked address in the sidebar
  document.getElementById("addressInput").value = clickedAddress;

  // Run ALL the existing logic (marker + highlight + tract)
  handleLocation(lat, lon);
});

let tractGeojson = null;
let burdenData = null;
let searchMarker = null;
let currentTractGEOID = null;
let selectedLayer = null;

// REGRESSION COEFFICIENTS (from R model)
const COEF = {
  intercept: 11.9792,

  housing: {
    "OWNER 1 DETACHED": -13.9688,
    "OWNER 10-19 UNIT": -10.0243,
    "OWNER 2 UNIT": -2.5044,
    "OWNER 20-49 UNIT": -8.2707,
    "OWNER 3-4 UNIT": -1.5441,
    "OWNER 5-9 UNIT": -8.2854,
    "OWNER 50+ UNIT": -9.8844,
    "OWNER BOAT_RV_VAN": -11.5456,
    "OWNER MOBILE_TRAILER": -1.4856,

    "RENTER 1 ATTACHED": -0.1838,
    "RENTER 1 DETACHED": -13.9966,
    "RENTER 10-19 UNIT": -14.8626,
    "RENTER 2 UNIT": -10.4705,
    "RENTER 20-49 UNIT": -14.1620,
    "RENTER 3-4 UNIT": -13.9941,
    "RENTER 5-9 UNIT": -13.6238,
    "RENTER 50+ UNIT": -14.1765,
    "RENTER BOAT_RV_VAN": 13.2704,
    "RENTER MOBILE_TRAILER": -6.3555
  },

  bucket: {
    "$150k+": -0.3788,
    "$20k–$30k": 20.3513,
    "$30k–$40k": 12.8207,
    "$40k–$50k": 9.3714,
    "$50k–$60k": 6.4077,
    "$60k–$75k": 4.1346,
    "$75k–$100k": 1.3476,
    "Under $20k": 14.7426
  }
};


// NORMALIZATION HELPERS

function normalize(str) {
  if (!str) return "";
  return str.toString().trim().toUpperCase().replace(/\s+/g, " ");
}

function normalizeIncome(x) {
  if (!x) return "";
  return x
    .toString()
    .toUpperCase()
    .trim()
    .replace(/–/g, "-")     // force hyphen
    .replace(/\s+/g, "");   // remove ALL spaces
}

function normalizeGEOID(g) {
  if (!g) return "";
  return g.toString().trim().slice(0, 11);   // keep only the first 11 digits
}


// REGRESSION PREDICTOR

function predictBurden(housingType, incomeBucket) {
  let y = COEF.intercept;

  if (COEF.housing[housingType]) {
    y += COEF.housing[housingType];
  }

  if (COEF.bucket[incomeBucket]) {
    y += COEF.bucket[incomeBucket];
  }

  return Math.max(0, y);  // no negative values
}

// COLOR SCALE FOR ENERGY BURDEN

function getColor(burden) {
  return burden > 10 ? "#A44A3F" :     // dark peach
         burden > 7  ? "#E5989B" :     // peach
         burden > 4  ? "#FFDA77" :     // muted yellow
         burden > 2  ? "#F6C453" :     // light muted yellow
                        "#74C69D";     // muted green
}


// LOAD DATA

async function loadData() {
  tractGeojson = await fetch("data/tracts.geojson").then(r => r.json());
  burdenData = Papa.parse(await fetch("data/burden_lookup_clean.csv").then(r => r.text()), {
    header: true,
    dynamicTyping: false
  }).data;

// Build lookup table: GEOID → burden %
const tractBurden = {};
burdenData.forEach(row => {
  const geoid = row.GEOID.toString().slice(0, 11);
  const value = parseFloat(row.EnergyBurdenPercent);
  if (!isNaN(value)) tractBurden[geoid] = value;
});

// Add shaded map layer
L.geoJSON(tractGeojson, {
  style: feature => {
    const geoid = feature.properties.GEOID.toString().slice(0, 11);
    const burden = tractBurden[geoid];
    const color = burden ? getColor(burden) : "#ccc";

    return {
      fillColor: color,
      fillOpacity: 0.75,
      color: "#ffffff",
      weight: 1
    };
  },

  onEachFeature: (feature, layer) => {
    const geoid = feature.properties.GEOID.toString().slice(0, 11);
    const burden = tractBurden[geoid]?.toFixed(1) || "No data";

    layer.bindTooltip(
      `Tract: ${geoid}<br>Burden: ${burden}%`,
      { sticky: true }
    );
  }
}).addTo(map);

  console.log("Loaded data.");
}
loadData();



// GEOCODING

async function geocode(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data.length) return null;

  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}


// FIND TRACT USING TURF

function findTract(lat, lon) {
  const pt = turf.point([lon, lat]);

  for (const f of tractGeojson.features) {
    if (turf.booleanPointInPolygon(pt, f)) return f;
  }
  return null;
}



function highlightTract(feature) {
  if (selectedLayer) {
    map.removeLayer(selectedLayer);
  }

  selectedLayer = L.geoJSON(feature, {
    style: {
      color: "yellow",
      weight: 3,
      fillOpacity: 0.1
    }
  }).addTo(map);
}

function handleLocation(lat, lon) {

  // Move marker
  if (searchMarker) map.removeLayer(searchMarker);
  searchMarker = L.marker([lat, lon]).addTo(map);

  // Find tract
  const tract = findTract(lat, lon);

  if (!tract) {
    document.getElementById("resultsText").innerHTML =
      "Location is outside Philadelphia.";
    currentTractGEOID = null;
    return;
  }

  currentTractGEOID = tract.properties.GEOID.toString();

  // Highlight tract
  highlightTract(tract);

  // Update results
  document.getElementById("resultsText").innerHTML = `
    Location selected.<br>
    Select housing type and income to calculate burden.
  `;
}


// CALCULATE BURDEN BUTTON

document.getElementById("calcBtn").addEventListener("click", () => {
  if (!currentTractGEOID) {
    alert("Search for an address first.");
    return;
  }

  const housing = document.getElementById("housingSelect").value;
  const incomeBucket = document.getElementById("incomeSelect").value;

  if (!housing || !incomeBucket) {
    alert("Select both housing and income.");
    return;
  }

  const predicted = predictBurden(housing, incomeBucket);

  document.getElementById("resultsText").innerHTML = `
    Predicted annual energy burden:<br>
    <strong>${predicted.toFixed(1)}%</strong>
  `;
});



// CLEAR SELECTION BUTTON

document.getElementById("clearBtn").addEventListener("click", () => {

  // Remove marker + highlight
  if (searchMarker) {
    map.removeLayer(searchMarker);
    searchMarker = null;
  }

  if (selectedLayer) {
    map.removeLayer(selectedLayer);
    selectedLayer = null;
  }

  // Reset inputs
  document.getElementById("addressInput").value = "";
  document.getElementById("housingSelect").value = "";
  document.getElementById("incomeSelect").value = "";

  // Reset state
  currentTractGEOID = null;

  // Reset results text
  document.getElementById("resultsText").innerHTML =
    "Search for an address first.";

  // Optional: move map back to original view
  map.setView([39.99, -75.12], 11);
});


// SEARCH BUTTON

document.getElementById("searchBtn").addEventListener("click", async () => {
  const address = document.getElementById("addressInput").value;
  if (!address) {
    alert("Enter an address.");
    return;
  }

  const loc = await geocode(address);
  if (!loc) {
    alert("Could not find that address.");
    return;
  }

  map.setView([loc.lat, loc.lon], 13);

  // Unified handler (marker + tract + highlight + UI updates)
  handleLocation(loc.lat, loc.lon);
});


// CALCULATE BURDEN (REGRESSION MODEL VERSION)

document.getElementById("calcBtn").addEventListener("click", () => {
  if (!currentTractGEOID) {
    alert("Search for an address first.");
    return;
  }

  const housing = document.getElementById("housingSelect").value;
  const incomeBucket = document.getElementById("incomeSelect").value;

  if (!housing || !incomeBucket) {
    alert("Select housing and income.");
    return;
  }

  const predicted = predictBurden(housing, incomeBucket);

  document.getElementById("verdictText").innerHTML = `
    Predicted energy burden: <strong>${predicted.toFixed(1)}%</strong>
  `;
});

document.getElementById("clearBtn").addEventListener("click", () => {

  // Remove marker
  if (searchMarker) {
    map.removeLayer(searchMarker);
    searchMarker = null;
  }

  // Remove highlighted tract
  if (selectedLayer) {
    map.removeLayer(selectedLayer);
    selectedLayer = null;
  }

  // Reset all dropdowns + input
  document.getElementById("addressInput").value = "";
  document.getElementById("housingSelect").value = "";
  document.getElementById("incomeSelect").value = "";

  // Reset state tracking
  currentTractGEOID = null;

  // Reset results pane text
  document.getElementById("resultsText").innerHTML =
    "Search for an address first.";

  document.getElementById("verdictText").innerHTML =
    "Search for an address first.";

  // Optional: Reset map view to default Philadelphia zoom
  map.setView([39.99, -75.12], 11);
});


// ADDRESS AUTOCOMPLETE (PHILADELPHIA FILTERED)

const input = document.getElementById("addressInput");
const suggestionBox = document.getElementById("autocomplete-list");

let autocompleteTimeout = null;
let lastQuery = "";

input.addEventListener("input", function () {
  const userText = input.value.trim();

  if (!userText) {
    suggestionBox.style.display = "none";
    return;
  }

  lastQuery = userText;

  clearTimeout(autocompleteTimeout);
  autocompleteTimeout = setTimeout(() => {
    
    const query = `${userText}, Philadelphia, PA`;

    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?format=json` +
      `&q=${encodeURIComponent(query)}` +
      `&addressdetails=1` +
      `&limit=5` +
      `&countrycodes=us` +
      `&bounded=1` +
      `&viewbox=-75.30,40.15,-74.90,39.85`;  // PHILADELPHIA BOUNDING BOX

    fetch(url)
      .then(res => res.json())
      .then(data => {
        // Ignore stale responses
        if (input.value.trim() !== lastQuery) return;

        suggestionBox.innerHTML = "";

        if (!data.length) {
          suggestionBox.style.display = "none";
          return;
        }

        data.forEach(item => {
          const div = document.createElement("div");
          div.classList.add("autocomplete-item");

          // Shorter name
          div.textContent = item.display_name.replace(", United States", "");

          div.addEventListener("click", () => {
            input.value = item.display_name.replace(", United States", "");
            suggestionBox.style.display = "none";

            const lat = parseFloat(item.lat);
            const lon = parseFloat(item.lon);

            map.setView([lat, lon], 14);
            handleLocation(lat, lon);
          });

          suggestionBox.appendChild(div);
        });

        suggestionBox.style.display = "block";
      })
      .catch(err => {
        console.error("Autocomplete error:", err);
      });

  }, 400);   // ← SAFE debounce to avoid rate limits
});

// Hide dropdown on outside click
document.addEventListener("click", (e) => {
  if (e.target !== input) {
    suggestionBox.style.display = "none";
  }
});
