import { filterWineData } from './filter.js';

function initForm(el, regions, onFilter = null) {
  const containEL = typeof el === 'string' ? document.getElementById(el) : el;
  if (!containEL) {
    throw new Error('A valid DOM element or selector must be provided for the form.');
  }

  const allregions = regions || [];

  // --- Helper: read all controls and apply filters ---
  function applyFilters() {
    const selectedTypes = Array.from(
      containEL.querySelectorAll('input[name="type"]:checked'),
    ).map((box) => box.value);

    const selectedfood = Array.from(
      containEL.querySelectorAll('input[name="foodpair"]:checked'),
    ).map((box) => box.value);

    const flavorseleced = containEL.querySelector('#flavor-select');
    const selectedflavor = flavorseleced ? flavorseleced.value : '';

    let filtered = filterWineData(allregions, selectedTypes, selectedfood, selectedflavor);

    if (onFilter) {
      onFilter(filtered);
    }
  }

  containEL.querySelectorAll('#flavor-select').forEach((a) => {
    a.addEventListener('change', applyFilters);
  });

  containEL.querySelectorAll('input[name="type"]').forEach((a) => {
    a.addEventListener('change', applyFilters);
  });

  containEL.querySelectorAll('input[name="foodpair"]').forEach((a) => {
    a.addEventListener('change', applyFilters);
  });
}

export { initForm,
};
