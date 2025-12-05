import { initApp } from './main.js';
import { impSlider, inuSlider } from './slider.js'; // ✅ 导入 slider

export const resetManager = {
  resetAll: async function() {
    await initApp(true);
  },

  resetMapView: async function() {
    await initApp(false);
  },

  resetLeftSide: function() {
    const matrixBtn = document.getElementById('setmatrix');
    if (matrixBtn) matrixBtn.click();

    const sliderContainer = document.getElementById('slider-container');
    if (sliderContainer) sliderContainer.style.display = 'block';

    // ✅ 重置 slider
    if (impSlider && inuSlider) {
      impSlider.noUiSlider.set([0.4, 0.8]);
      inuSlider.noUiSlider.set([0.5, 3]);
    }

    const selStation = document.getElementById('select');
    const selAmenity = document.getElementById('select-amenity');
    if (selStation) selStation.selectedIndex = 0;
    if (selAmenity) selAmenity.selectedIndex = 0;

    const entry = document.getElementById('entry');
    if (entry) entry.value = '';
    const sug = document.getElementById('search-suggestions');
    if (sug) sug.style.display = 'none';
  },
};
