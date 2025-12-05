
import { calMatrix, calImpervious, calInundation } from './map_style.js';
import { onSliderChange } from './slider.js';
import { matrixLegend, imperviousLegend, inundationLegend } from './legend_style.js';

let initialMatrix; let map; let impervious; let inundation;
let legend;
const selectedLayers = new Set();
let currentLayer;

const sliderContainer = document.getElementById('slider-container');

function initializeMap(matrix) {
  map = L.map('map', { zoomSnap: 0 }).setView([30.25, 120.15], 11);

  const baseTileLayer = L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    {
      maxZoom: 19,
      zoomOffset: -1,
      tileSize: 512,
      attribution: `© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <strong><a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a></strong>`,
    },
  );
  baseTileLayer.addTo(map);

  function hexTooltipContent(l) {
    const imp = (l.feature.properties.pct_2025 * 100).toFixed(2);
    const inu = l.feature.properties.inund_mean.toFixed(2);
    return `
      <div class="hex-tooltip">
        <strong>Imp </strong> ${imp}%<br>
        <strong>Inu </strong> ${inu}
      </div>
    `;
  }

  const tooltipOptions = {
    direction: 'center',
    offset: [0, 0],
    opacity: 1,
    className: 'hex-tooltip',
    permanent: true,
  };

  function attachHexEvents(layer) {
    layer.unbindTooltip();

    layer.on('mouseover', () => {
      if (!selectedLayers.has(layer)) L.DomUtil.addClass(layer._path, 'hex-hover');
    });
    layer.on('mouseout', () => {
      if (!selectedLayers.has(layer)) L.DomUtil.removeClass(layer._path, 'hex-hover');
    });

    layer.on('click', () => {
      if (selectedLayers.has(layer)) {
        selectedLayers.delete(layer);
        L.DomUtil.removeClass(layer._path, 'hex-selected');
        removeHexTooltip(layer);
      } else {
        selectedLayers.add(layer);
        L.DomUtil.addClass(layer._path, 'hex-selected');
        addHexTooltip(layer);
      }

      if (window.updateSelectionCount) window.updateSelectionCount();
    });
  }

  function addHexTooltip(layer) {
    if (!layer._tooltip) {
      layer._tooltip = L.tooltip({
        permanent: true,
        direction: 'center',
        offset: [0, 0],
        className: 'hex-tooltip',
      })
        .setContent(hexTooltipContent(layer))
        .setLatLng(layer.getBounds().getCenter());
      layer._tooltip.addTo(map);
    }
    updateHexTooltipVisibility(layer);
  }

  function removeHexTooltip(layer) {
    if (layer._tooltip) {
      map.removeLayer(layer._tooltip);
      layer._tooltip = null;
    }
  }

  function updateHexTooltipVisibility(layer) {
    if (!layer._tooltip) return;
    const zoom = map.getZoom();
    const el = layer._tooltip.getElement();
    if (el) {
      el.style.display = (selectedLayers.has(layer) && zoom >= 12) ? 'block' : 'none';
    }
  }

  initialMatrix = L.geoJSON(matrix, {
    style: calMatrix,
    onEachFeature: (feature, layer) => attachHexEvents(layer),
  }).addTo(map);

  impervious = L.geoJSON(matrix, {
    style: calImpervious,
    onEachFeature: (feature, layer) => attachHexEvents(layer),
  });

  inundation = L.geoJSON(matrix, {
    style: calInundation,
    onEachFeature: (feature, layer) => attachHexEvents(layer),
  });

  map.fitBounds(initialMatrix.getBounds());
  currentLayer = initialMatrix;

  window.mapLayers = { selectedLayers, currentLayer, map, hexTooltipContent, tooltipOptions };

  legend = L.control({ position: 'bottomright' });
  legend.onAdd = function() {
    this.div = L.DomUtil.create('div', 'legend-box');
    return this.div;
  };
  legend.addTo(map);
  setLegend(matrixLegend);

  onSliderChange(() => {
    initialMatrix.eachLayer((layer) => layer.setStyle(calMatrix(layer.feature)));
  });

  map.whenReady(() => map.invalidateSize());
  window.addEventListener('resize', () => map.invalidateSize());

  map.on('zoomend', () => {
    selectedLayers.forEach((layer) => updateHexTooltipVisibility(layer));
  });

  return map;
}

function setLegend(html) {
  if (legend && legend.div) legend.div.innerHTML = html;
}

function resetLayers() {
  selectedLayers.forEach((layer) => {
    L.DomUtil.removeClass(layer._path, 'hex-selected');
  });
  selectedLayers.clear();

  if (window.updateSelectionCount) window.updateSelectionCount();

  if (map.hasLayer(initialMatrix)) map.removeLayer(initialMatrix);
  if (map.hasLayer(impervious)) map.removeLayer(impervious);
  if (map.hasLayer(inundation)) map.removeLayer(inundation);
}

function addLayerWithInvalidate(layer, legendHtml, showSlider = false) {
  resetLayers();
  layer.addTo(map);
  sliderContainer.style.display = showSlider ? 'block' : 'none';
  setLegend(legendHtml);
  currentLayer = layer;
  window.mapLayers.currentLayer = layer;
  map.invalidateSize();
}

document.getElementById('matrix').addEventListener('click', () =>
  addLayerWithInvalidate(initialMatrix, matrixLegend, true),
);

document.getElementById('impervious').addEventListener('click', () =>
  addLayerWithInvalidate(impervious, imperviousLegend, false),
);

document.getElementById('inundation').addEventListener('click', () =>
  addLayerWithInvalidate(inundation, inundationLegend, false),
);

export { initializeMap, initialMatrix, impervious, inundation };
