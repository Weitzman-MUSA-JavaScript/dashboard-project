import {
  formatDateTimeUTC,
  formatDepth,
  formatDistance,
  formatMagnitude,
  magnitudeToRadius,
  SIGNIFICANCE_RANGE,
} from "./utils.js";

const HIGHLIGHT_CLASSES = ["highlight-low", "highlight-medium", "highlight-high"];

export function renderSummary(summaryEl, payload = null) {
  if (!summaryEl) return;
  summaryEl.classList.remove(...HIGHLIGHT_CLASSES);

  if (!payload || !payload.metrics) {
    summaryEl.innerHTML = "<p>Select a city or use your location to see nearby earthquakes.</p>";
    return;
  }

  const { risk, distanceKm, metrics, radius } = payload;
  if (risk && risk.className) {
    summaryEl.classList.add(risk.className);
  }

  const distanceText = distanceKm !== null && distanceKm !== undefined
    ? `${formatDistance(distanceKm)} to seismic belt`
    : "Distance unavailable";

  summaryEl.innerHTML = `
    <div class="summary-risk">
      ${risk ? risk.label : "Risk unknown"}
      <span>${distanceText}</span>
    </div>
    <div class="summary-metric">
      <span>Earthquakes within ${radius} km</span>
      <strong>${metrics.count}</strong>
    </div>
    <div class="summary-metric">
      <span>Maximum magnitude</span>
      <strong>${metrics.maxMag !== null ? formatMagnitude(metrics.maxMag) : "N/A"}</strong>
    </div>
    <div class="summary-metric">
      <span>Most recent event</span>
      <strong>${metrics.mostRecent ? formatDateTimeUTC(metrics.mostRecent) : "N/A"}</strong>
    </div>
    <div class="summary-metric">
      <span>Tsunami-related events</span>
      <strong>${metrics.tsunamiCount}</strong>
    </div>
  `;
}

export function renderList(listEl, earthquakes, { onSelect, activeId } = {}) {
  if (!listEl) return;
  listEl.innerHTML = "";

  if (!earthquakes || earthquakes.length === 0) {
    const empty = document.createElement("li");
    empty.className = "list-empty";
    empty.textContent = "No earthquakes found within the current filters.";
    listEl.appendChild(empty);
    return;
  }

  earthquakes.forEach((feature) => {
    const { id, mag, depth, place, hasTsunami, significance, dateISO, distanceKm } = feature.properties;
    const li = document.createElement("li");
    li.className = "list-item";
    li.dataset.featureId = id;
    if (id === activeId) {
      li.classList.add("is-active");
    }

    li.innerHTML = `
      <div class="list-item-header">
        <span>${formatDateTimeUTC(dateISO)}</span>
        <span>${formatMagnitude(mag)}</span>
      </div>
      <div class="list-item-meta">
        <span>${place}</span>
        <span>${formatDepth(depth)}</span>
        <span>${formatDistance(distanceKm)}</span>
      </div>
      <div class="list-item-meta">
        <span class="badge badge-sig">sig ${Number.isFinite(significance) ? significance : "N/A"}</span>
        ${hasTsunami ? "<span class=\"badge badge-tsunami\">Tsunami</span>" : ""}
      </div>
    `;

    li.addEventListener("click", () => {
      if (typeof onSelect === "function") {
        onSelect(id, feature);
      }
    });

    listEl.appendChild(li);
  });
}

export function setActiveListItem(listEl, featureId) {
  if (!listEl) return;
  const items = listEl.querySelectorAll(".list-item");
  items.forEach((item) => {
    if (item.dataset.featureId === featureId) {
      item.classList.add("is-active");
      item.scrollIntoView({ block: "nearest", behavior: "smooth" });
    } else {
      item.classList.remove("is-active");
    }
  });
}

export function bindListToggle(button, listEl) {
  if (!button || !listEl) return;
  let hidden = false;
  button.addEventListener("click", () => {
    hidden = !hidden;
    listEl.style.display = hidden ? "none" : "";
    button.textContent = hidden ? "Show" : "Hide";
    button.setAttribute("aria-expanded", hidden ? "false" : "true");
  });
}

export function renderLegend(container) {
  if (!container) return;
  const sizeExamples = [
    { label: "M 6.0", mag: 6 },
    { label: "M 7.0", mag: 7 },
    { label: "M 8.0+", mag: 8.3 },
  ];
  const sizeMarkup = sizeExamples.map((item) => {
    const diameter = magnitudeToRadius(item.mag) * 2;
    return `
      <div class="legend-item">
        <span class="legend-circle" style="width:${diameter}px;height:${diameter}px;"></span>
        <span>${item.label}</span>
      </div>
    `;
  }).join("");

  container.innerHTML = `
    <h3>Map Legend</h3>
    <div class="legend-section">
      ${sizeMarkup}
      <div class="legend-item" style="flex-direction: column; align-items: flex-start;">
        <span class="field-label" style="font-size:0.75rem;color:var(--text-secondary);">Significance (sig)</span>
        <div class="legend-gradient"></div>
        <div class="legend-scale-labels">
          <span>${SIGNIFICANCE_RANGE.min}</span>
          <span>${SIGNIFICANCE_RANGE.mid}</span>
          <span>${SIGNIFICANCE_RANGE.max}</span>
        </div>
      </div>
      <div class="legend-item">
        <span class="legend-symbol line" aria-hidden="true"></span>
        <span>Seismic belt</span>
      </div>
    </div>
  `;
}

export function showMessage(summaryEl, message) {
  if (!summaryEl) return;
  summaryEl.classList.remove(...HIGHLIGHT_CLASSES);
  summaryEl.innerHTML = `<p>${message}</p>`;
}
