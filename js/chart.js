/**
 * Module for updating chart information
 */

/* global turf */

// Initialize a data store for our calculations
let chartData = {
  '0.5 Ft': { hawaii: 0, maui: 0, oahu: 0, kauai: 0 },
  '1.1 Ft': { hawaii: 0, maui: 0, oahu: 0, kauai: 0 },
  '2.0 Ft': { hawaii: 0, maui: 0, oahu: 0, kauai: 0 },
  '3.2 Ft': { hawaii: 0, maui: 0, oahu: 0, kauai: 0 },
};

let bbChart = null;
const islandSelect = document.querySelector('#island-select');

/**
 * Initializes the billboard.js economic loss bar chart.
 */
async function initChart() {
  const files = [
    { scenario: '0.5 Ft', url: 'data/econLoss_0ft.json' },
    { scenario: '1.1 Ft', url: 'data/econLoss_1ft.json' },
    { scenario: '2.0 Ft', url: 'data/econLoss_2ft.json' },
    { scenario: '3.2 Ft', url: 'data/econLoss_3ft.json' },
  ];

  for (const file of files) {
    const res = await fetch(file.url);
    const geojson = await res.json();

    turf.featureEach(geojson, (feature) => {
      const center = turf.center(feature);
      const lng = center.geometry.coordinates[0];

      let island = 'kauai';
      if (lng > -156.5) island = 'hawaii';
      else if (lng > -157.5) island = 'maui';
      else if (lng > -158.5) island = 'oahu';

      const lossValue = feature.properties.totloss / 1000000 || 0;
      chartData[file.scenario][island] += lossValue;
    });
  }
  if (islandSelect) {
    islandSelect.addEventListener('change', () => renderChart());
  }
  renderChart('all');
}

/**
 * Generate or update the Billboard.js Chart
 */
function renderChart() {
  const selectedIsland = islandSelect ? islandSelect.value : 'all';
  const scenarios = ['0.5 Ft', '1.1 Ft', '2.0 Ft', '3.2 Ft'];
  const islandLabels = ['Hawai\'i', 'Maui', 'O\'ahu', 'Kaua\'i'];

  let columns;
  let categories;

  if (selectedIsland === 'all') {
    categories = islandLabels;
    columns = scenarios.map((scenario) => [
      scenario,
      chartData[scenario].hawaii,
      chartData[scenario].maui,
      chartData[scenario].oahu,
      chartData[scenario].kauai,
    ]);
  } else {
    categories = scenarios;
    columns = [[
      selectedIsland,
      ...scenarios.map((scenario) => chartData[scenario][selectedIsland]),
    ]];
  }

  if (bbChart) {
    bbChart.destroy();
  }

  bbChart = bb.generate({
    bindto: '#chart',
    data: {
      columns: columns,
      type: 'bar',
    },
    axis: {
      x: {
        type: 'category',
        categories: categories,
      },
      y: {
        label: 'Total Economic Loss (in million $)',
      },
    },
    color: {
      pattern: ['#2cff02', '#f8e800', '#ff7300', '#eb1004'],
    },
    transition: {
      duration: 500,
    },
  });
}

export {
  initChart,
  renderChart,
};
