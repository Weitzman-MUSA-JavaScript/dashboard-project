document.addEventListener("DOMContentLoaded", function () {

  const stationListEl = document.querySelector(".station-list");
  console.log("stationListEl = ", stationListEl);

  const mapContainer = document.querySelector(".map");
  mapContainer.id = "map";

  const map = L.map(mapContainer, {
    scrollWheelZoom: true,
  }).setView([40.2, -74.6], 8);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://carto.com/">CARTO</a>, &copy; OpenStreetMap contributors',
  }).addTo(map);

  let centers = []; // [{ id, name, lat, lng, score }, ...]
  let centersReady = false;
  let showHighOnly = false;   
  let minScore = 0;           

  const centerMarkersLayer = L.layerGroup().addTo(map);
  const highlightLayer = L.layerGroup().addTo(map);

  function wirePoiCategoryCheckboxes() {
  const allBox = document.getElementById("poiCat_all");
  const catBoxes = Array.from(document.querySelectorAll("input.poiCat"));

  console.log("wirePoiCategoryCheckboxes:", {
    allBoxFound: !!allBox,
    catBoxesCount: catBoxes.length,
  });

  if (!allBox || catBoxes.length === 0) return;

  allBox.addEventListener("change", () => {
    const checked = allBox.checked;
    catBoxes.forEach(cb => (cb.checked = checked));

    refreshCenters();
  });

  catBoxes.forEach(cb => {
    cb.addEventListener("change", () => {
      allBox.checked = catBoxes.every(x => x.checked);
      refreshCenters();
    });
  });

  if (allBox.checked) {
    catBoxes.forEach(cb => (cb.checked = true));
  } else {
    allBox.checked = catBoxes.every(x => x.checked);
  }
}

wireAddressSearch(map);
wirePoiCategoryCheckboxes();

document
  .querySelector('input[name="electric-bikes-only"]')
  ?.addEventListener("change", refreshCenters);

document
  .querySelector('input[name="min-battery-level"]')
  ?.addEventListener("input", refreshCenters);

  let userMarker = null;

  fetch("data/NJ_Fishnet_CenterPoints_WGS84.geojson")
    .then((res) => res.json())
    .then((data) => {
      console.log("GeoJSON loaded, feature count:", data.features.length);
      console.log("First feature example:", data.features[0]);

      data.features.forEach((feature, idx) => {
        if (!feature.geometry || feature.geometry.type !== "Point") return;

        const [lng, lat] = feature.geometry.coordinates;
        const props = feature.properties || {};

        const score = Number(props.score);
        if (Number.isNaN(score) || score < 3) return;

        const gridId =
          props.grid_id !== undefined && props.grid_id !== null
            ? props.grid_id
            : idx + 1;

        const hasUSA     = props.has_usa === 1 || props.has_usa === "1";
        const hasAsian   = props.has_asian === 1 || props.has_asian === "1";
        const hasMVC     = props.has_mvc === 1 || props.has_mvc === "1";
        const hasPark    = props.has_park === 1 || props.has_park === "1";
        const hasMuseum  = props.has_museum === 1 || props.has_museum === "1";

        const poiFlags = [hasUSA, hasAsian, hasMVC, hasPark, hasMuseum];
        const poiCount = poiFlags.filter(Boolean).length;

        const center = {
          id: gridId,
          name: `Grid cell ${gridId}`,
          lat,
          lng,
          score,

        hasUSA,
        hasAsian,
        hasMVC,
        hasPark,
        hasMuseum,
        poiCount,
        };

        centers.push(center);

         centersReady = true;   
         refreshCenters(); 

        const radius = 4 + (score - 3) * 3; 

        const marker = L.circleMarker([lat, lng], {
          radius,
          color: "#2A81CB",
          weight: 1,
          fillColor: "#2A81CB",
          fillOpacity: 0.7,
        }).addTo(centerMarkersLayer);

        marker.bindPopup(
          `<strong>${center.name}</strong><br>Score: ${score.toFixed(2)}`
        );
      });

      centersReady = true;
      console.log("Loaded centers:", centers.length);
    })
    .catch((err) => {
      console.error(
        "Error loading NJ_Fishnet_CenterPoints_WGS84.geojson:",
        err
      );
    });

  function distanceInKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  
function getThresholdFromUI() {
  const cb = document.querySelector('input[name="electric-bikes-only"]');
  const slider = document.querySelector('input[name="min-battery-level"]');

  const showHighOnly = !!cb?.checked;           
  const minScore = slider ? Number(slider.value) : 0;

  const hardMin = showHighOnly ? 4 : 0;         
  return Math.max(hardMin, minScore);          
}

function refreshCenters() {
  console.log("refreshCenters called");
  centerMarkersLayer.clearLayers();

  const threshold = getThresholdFromUI();

  centers
    .filter(c => c.score >= threshold)
    .forEach(c => {
      const radius = 4 + (c.score - 3) * 3;

      const marker = L.circleMarker([c.lat, c.lng], {
        radius,
        color: "#2A81CB",
        weight: 1,
        fillColor: "#2A81CB",
        fillOpacity: 0.7,
      }).addTo(centerMarkersLayer);

      marker.bindPopup(
        `<strong>${c.name}</strong><br>Score: ${c.score.toFixed(2)}`
      );
    });
}

function updateStationList(userLocation, nearestCenter, topHighScoreCenters) {
  if (!stationListEl || !nearestCenter) return;

  const driveMinutesFromMiles = (miles) =>
    Math.round((miles / 50) * 60);

  const boolToYN = (v) => (v ? "Y" : "N");

  function selectedPoiLabels(center) {
  const labels = [];

  const isChecked = (val) =>
    document.querySelector(`input.poiCat[value="${val}"]`)?.checked;

  if (isChecked("supermarket_usa")) {
    labels.push(`USA food: ${boolToYN(center.hasUSA)}`);
  }

  if (isChecked("supermarket_asian")) {
    labels.push(`Asian food: ${boolToYN(center.hasAsian)}`);
  }

  if (isChecked("park")) {
    labels.push(`Park: ${boolToYN(center.hasPark)}`);
  }

  if (isChecked("museum")) {
    labels.push(`Museum: ${boolToYN(center.hasMuseum)}`);
  }

  return labels;
}

  let html = "";

  const nearestDistanceMiNum = nearestCenter.distanceKm * 0.621371;
  const nearestDistanceMi = nearestDistanceMiNum.toFixed(1);
  const nearestDriveMin = driveMinutesFromMiles(nearestDistanceMiNum);

  const nearestPoiCount =
    typeof nearestCenter.poiCount === "number"
      ? nearestCenter.poiCount
      : 0;

  html += `
    <li class="station" aria-expanded="false">
      <header class="name">Your nearest grid center</header>

      <span class="distance">
        ${nearestDistanceMi} mi
      </span>

      <span class="available-bikes">
        Score: ${nearestCenter.score.toFixed(2)}
      </span>

      <span class="available-docks">
        ~${nearestDriveMin} min drive
      </span>

      <span class="next-drop-off-est">
        Nearby high-score centers: ${topHighScoreCenters.length} |
        Nearby POIs (any type): ${nearestPoiCount}
      </span>

      <span class="next-pick-up-est">
        USA food: ${boolToYN(nearestCenter.hasUSA)} |
        Asian food: ${boolToYN(nearestCenter.hasAsian)} |
        Park: ${boolToYN(nearestCenter.hasPark)} |
        Museum: ${boolToYN(nearestCenter.hasMuseum)} |
        MVC: ${boolToYN(nearestCenter.hasMVC)}
      </span>
    </li>
  `;

  function selectedPoiLabels(center) {
  const labels = [];

  const isChecked = (val) =>
    document.querySelector(`input.poiCat[value="${val}"]`)?.checked;

  if (isChecked("supermarket_usa")) {
    labels.push(`USA food: ${boolToYN(center.hasUSA)}`);
  }
  if (isChecked("supermarket_asian")) {
    labels.push(`Asian food: ${boolToYN(center.hasAsian)}`);
  }
  if (isChecked("park")) {
    labels.push(`Park: ${boolToYN(center.hasPark)}`);
  }
  if (isChecked("museum")) {
    labels.push(`Museum: ${boolToYN(center.hasMuseum)}`);
  }
  
  return labels;
}

  topHighScoreCenters.forEach((center, idx) => {
    const distMiNum = center.distanceKm * 0.621371;
    const distMi = distMiNum.toFixed(1);
    const driveMin = driveMinutesFromMiles(distMiNum);

    const poiCount =
      typeof center.poiCount === "number" ? center.poiCount : 0;
    
    const selectedLabels = selectedPoiLabels(center);

    html += `
      <li class="station" aria-expanded="false">
        <header class="name">
          High-score center #${idx + 1}
        </header>

        <span class="distance">
          ${distMi} mi
        </span>

        <span class="available-bikes">
          Score: ${center.score.toFixed(2)}
        </span>

        <span class="available-docks">
          ~${driveMin} min drive
        </span>

        <span class="next-drop-off-est">
          Nearby POIs (any type): ${poiCount}
        </span>

        <span class="next-pick-up-est">
         ${
         selectedLabels.length
           ? selectedLabels.join(" | ")
           : "No POI categories selected"
         }
        </span>

      </li>
    `;
  });

  stationListEl.innerHTML = html;
}

  function handleUserLocation(userLat, userLng) {
  if (!centersReady) {
    console.warn("Centers not loaded yet.");
    return;
  }

  const userLocation = { lat: userLat, lng: userLng };

  if (userMarker) {
    userMarker.setLatLng([userLocation.lat, userLocation.lng]);
  } else {
    userMarker = L.marker([userLocation.lat, userLocation.lng]).addTo(map);
  }
  userMarker.bindPopup("Your chosen location").openPopup();

  const threshold = getThresholdFromUI(); 
  const highCenters = centers.filter((c) => c.score >= threshold);

  if (highCenters.length === 0) {
    console.warn(`No centers with score >= ${threshold}`);
    return;
  }

  const sortedHighCenters = highCenters
    .map((center) => ({
      ...center,
      distanceKm: distanceInKm(
        userLocation.lat,
        userLocation.lng,
        center.lat,
        center.lng
      ),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const nearestThreeHighCenters = sortedHighCenters.slice(0, 3);

  highlightLayer.clearLayers();

  const primary = nearestThreeHighCenters[0];
  const primaryDistMi = (primary.distanceKm * 0.621371).toFixed(1);

  L.circleMarker([primary.lat, primary.lng], {
    radius: 12,
    weight: 3,
    color: "#ff3300",
    fillColor: "#ffe066",
    fillOpacity: 0.9,
  })
    .addTo(highlightLayer)
    .bindPopup(
      `<strong>Nearest high-score center</strong><br>
       ID: ${primary.id}<br>
       Score: ${primary.score.toFixed(2)}<br>
       Distance: ${primaryDistMi} mi`
    )
    .openPopup();

  nearestThreeHighCenters.slice(1).forEach((center, idx) => {
    const distMi = (center.distanceKm * 0.621371).toFixed(1);

    L.circleMarker([center.lat, center.lng], {
      radius: 9,
      weight: 2,
      color: "#2b8a3e",
      fillColor: "#a1d99b",
      fillOpacity: 0.85,
    })
      .addTo(highlightLayer)
      .bindPopup(
        `<strong>High-score center #${idx + 2}</strong><br>
         ID: ${center.id}<br>
         Score: ${center.score.toFixed(2)}<br>
         Distance: ${distMi} mi`
      );
  });

  updateStationList(userLocation, primary, nearestThreeHighCenters);
}

  map.on("click", (e) => {
  handleUserLocation(e.latlng.lat, e.latlng.lng);
  });
});

function wireAddressSearch(map) {
  const input = document.querySelector('input[name="address-search"]');
  if (!input) return;

  input.addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const q = input.value.trim();
    if (!q) return;

    try {
      const url =
        "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
        encodeURIComponent(q + ", New Jersey");

      const res = await fetch(url, { headers: { Accept: "application/json" },
      });

      const data = await res.json();

      if (!data || data.length === 0) {
        alert("No results found. Try a more specific address.");
        return;
      }

      const lat = Number(data[0].lat);
      const lng = Number(data[0].lon);

      map.setView([lat, lng], 12);

      handleUserLocation(lat, lng);
    } catch (err) {
      console.error(err);
      alert("Search failed. Please try again.");
    }
  });
}

function wireUIEvents() {
  console.log("UI events wired");

  const highScoreOnly = document.querySelector('input[name="electric-bikes-only"]');
  const minScoreSlider = document.querySelector('input[name="min-battery-level"]');
  const allBox = document.getElementById("poiCat_all");
  const catBoxes = document.querySelectorAll("input.poiCat");

  // 1) checkbox: high-score centers
  highScoreOnly?.addEventListener("change", () => {
    console.log("Show only high-score:", highScoreOnly.checked);
  });

  // 2) range slider
  minScoreSlider?.addEventListener("input", () => {
    console.log("Min suitability score:", minScoreSlider.value);
  });

  // 3) POI categories
  allBox?.addEventListener("change", () => {
    console.log("POI All toggled:", allBox.checked);
  });

  catBoxes.forEach(box => {
    box.addEventListener("change", () => {
      console.log("POI category toggled:", box.value, box.checked);
    });
  });
}

document.addEventListener("DOMContentLoaded", wireUIEvents);
