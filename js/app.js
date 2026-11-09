import { initFranceWineMap, loadwinelayer, updateWineLayer } from './wine-map.js';

const map = initFranceWineMap('map');
const popup = document.getElementById('infoPopup');
const closeBtn = document.getElementById('closeBtn');

if (closeBtn) {
  closeBtn.addEventListener('click', () => {
    popup?.classList.add('hidden');
  });
}

loadwinelayer(map).then((layer) => {
  window.winelayer = layer;
  import('./ui.js').then((uiModule) => {
    if (uiModule.initForm) {
      uiModule.initForm(
        'filter-panel',
        window.allWineData?.features || [],
        (filtered) => {
          updateWineLayer(window.winelayer, filtered);
        },
      );
    }
  });
});
