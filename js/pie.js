/* global ChartDataLabels */

import { getImpThresholds, getInuThresholds, onSliderChange } from './slider.js';

let pieChart;
const selectedSegments = new Set();

export function initPieChart(matrix) {
  const Chart = window.Chart;
  if (!Chart) {
    console.error('Chart.js is not loaded');
    return null;
  }

  const ctx = document.getElementById('riskPieChart')?.getContext('2d');
  if (!ctx) {
    console.error('Canvas element not found');
    return null;
  }

  const data = computeDistribution(matrix);

  const colorMap = {
    'Low Impervious - Low Inundation': '#4575b4',
    'Low Impervious - Medium Inundation': '#91bfdb',
    'Low Impervious - High Inundation': '#e0f3f8',
    'Medium Impervious - Low Inundation': '#fee090',
    'Medium Impervious - Medium Inundation': '#fc8d59',
    'Medium Impervious - High Inundation': '#d73027',
    'High Impervious - Low Inundation': '#fdae61',
    'High Impervious - Medium Inundation': '#f46d43',
    'High Impervious - High Inundation': '#a50026',
  };

  const labels = Object.keys(data);
  const values = Object.values(data);
  const colors = labels.map((label) => colorMap[label] || '#cccccc');

  pieChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        label: 'Risk Units',
        data: values,
        backgroundColor: colors,
        borderWidth: Array(values.length).fill(2),
        borderColor: Array(values.length).fill('#ffffff'),
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b)=>a+b, 0);
              const value = context.raw;
              const percentage = ((value/total)*100).toFixed(1);
              return `${value} (${percentage}%)`;
            },
          },
        },
        datalabels: {
          color: '#423d52',
          font: { weight: 'bold', size: 12 },
          anchor: 'end',
          align: 'end',
          offset: 0,
          formatter: (value) => value,
        },
      },
      radius: '80%',
      onClick: (event, elements) => {
        if (elements.length > 0) {
          const index = elements[0].index;
          if (selectedSegments.has(index)) {
            selectedSegments.delete(index);
          } else {
            selectedSegments.add(index);
          }
          updateBorderWidth();
          highlightHexByMultipleRisks(matrix);
        }
      },
    },
    plugins: [ChartDataLabels],
  });

  onSliderChange(() => updatePieChart(matrix));

  window.pieChartControls = {
    clearSelection: () => {
      selectedSegments.clear();
      updateBorderWidth();
      highlightHexByMultipleRisks(matrix);
    },
  };

  return pieChart;
}

function updateBorderWidth() {
  if (!pieChart) return;
  const dataset = pieChart.data.datasets[0];
  dataset.borderColor = dataset.data.map((_, i) =>
    selectedSegments.has(i) ? '#000000' : '#ffffff');
  pieChart.update();
}

function highlightHexByMultipleRisks(matrix) {
  if (!window.mapLayers) {
    console.error('Map layers not available');
    return;
  }

  const { impMid, impHigh } = getImpThresholds();
  const { inuMid, inuHigh } = getInuThresholds();

  window.mapLayers.currentLayer.eachLayer((layer) => {
    if (window.mapLayers.selectedLayers.has(layer)) {
      window.mapLayers.selectedLayers.delete(layer);
      L.DomUtil.removeClass(layer._path, 'hex-selected');
      layer.unbindTooltip();
    }
  });

  if (selectedSegments.size === 0) {
    if (window.updateSelectionCount) {
      window.updateSelectionCount();
    }
    return;
  }

  const selectedLabels = Array.from(selectedSegments).map((i) => pieChart.data.labels[i]);

  window.mapLayers.currentLayer.eachLayer((layer) => {
    const f = layer.feature;
    const pct = f.properties.pct_2025;
    const inund = f.properties.inund_mean;

    let imperv = 'Low';
    if (pct > impHigh) imperv = 'High';
    else if (pct > impMid) imperv = 'Medium';

    let inun = 'Low';
    if (inund > inuHigh) inun = 'High';
    else if (inund > inuMid) inun = 'Medium';

    const hexRisk = `${imperv} Impervious - ${inun} Inundation`;

    if (selectedLabels.includes(hexRisk)) {
      window.mapLayers.selectedLayers.add(layer);
      L.DomUtil.addClass(layer._path, 'hex-selected');
    }
  });
  if (window.updateSelectionCount) {
    window.updateSelectionCount();
  }
}

function computeDistribution(matrix) {
  const { impMid, impHigh } = getImpThresholds();
  const { inuMid, inuHigh } = getInuThresholds();
  const counts = {};

  matrix.features.forEach((f) => {
    const pct = f.properties.pct_2025;
    const inund = f.properties.inund_mean;

    let imperv = 'Low';
    if (pct > impHigh) imperv = 'High';
    else if (pct > impMid) imperv = 'Medium';

    let inun = 'Low';
    if (inund > inuHigh) inun = 'High';
    else if (inund > inuMid) inun = 'Medium';

    const riskMatrix = `${imperv} Impervious - ${inun} Inundation`;
    counts[riskMatrix] = (counts[riskMatrix] || 0) + 1;
  });

  return counts;
}

function updatePieChart(matrix) {
  if (!pieChart) return;
  const data = computeDistribution(matrix);

  const colorMap = {
    'Low Impervious - Low Inundation': '#4575b4',
    'Low Impervious - Medium Inundation': '#91bfdb',
    'Low Impervious - High Inundation': '#e0f3f8',
    'Medium Impervious - Low Inundation': '#fee090',
    'Medium Impervious - Medium Inundation': '#fc8d59',
    'Medium Impervious - High Inundation': '#d73027',
    'High Impervious - Low Inundation': '#fdae61',
    'High Impervious - Medium Inundation': '#f46d43',
    'High Impervious - High Inundation': '#a50026',
  };

  const labels = Object.keys(data);
  const values = Object.values(data);
  const colors = labels.map((label) => colorMap[label] || '#cccccc');

  pieChart.data.labels = labels;
  pieChart.data.datasets[0].data = values;
  pieChart.data.datasets[0].backgroundColor = colors;

  selectedSegments.clear();
  pieChart.data.datasets[0].borderWidth = Array(values.length).fill(2);
  pieChart.data.datasets[0].borderColor = Array(values.length).fill('#ffffff');

  pieChart.update();

  if (window.updateSelectionCount) {
    window.updateSelectionCount();
  }
}
