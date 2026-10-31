import { initMap } from './map.js';
import { loadErosionLine, loadEconLoss, erosionChange } from './erosion-scenarios.js';
import { setupSidebarTabs } from './tabs.js';
import { initChart } from './chart.js';

/**
 * Initializes the dashboard application.
 */
function initApp() {
  const mapEl = document.querySelector('#map');
  const map = initMap(mapEl);

  map.on('load', () => {
    setupSidebarTabs();
    loadErosionLine(map);
    loadEconLoss(map);
    erosionChange(map);
    initChart();
  });
}

document.addEventListener('DOMContentLoaded', initApp);
