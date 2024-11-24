function initPoisList(rightEl, pois, events) {
  const poiSearchEl = rightEl.querySelector('.search-section');
  const searchInputEl = poiSearchEl.querySelector('.poi-search');
  const filterMethodsEl = poiSearchEl.querySelector('.filter-methods');
  const poisListEl = rightEl.querySelector('#poi-list');

  //
  // Create the pois list without any filtering...
  //

  // Initialize the list items
  const poisListItems = {};

  function initListItems() {
    for (const poi of pois) {
      const poiType = poi.properties['Type'];
      const poiName = poi.properties['Name'];
      const poiSubcategory = poi.properties['Subcategory'];
      const poiTime = poi.properties['Time'];
      const item = document.createElement('li');

      item.innerHTML = `
        <button class="poi" data-type="${ poiType }" data-name="${ poiName }" data-subcategory="${ poiSubcategory }" data-time="${ poiTime }" aria-pressed="false">
          <span class="poi-name">${ poiName }</span>
          <span class="poi-subcategory">${ poiSubcategory }</span>
          <span class="poi-time">${ poiTime }mins</span>
        </button>
      `;
      poisListItems[poiName] = item;
    }
  }
  initListItems();

  // Populate the list of pois
  function populateList(pois) {
    poisListEl.innerHTML = '';

    pois = pois.sort((a, b) => {
      return a.properties['Name'].localeCompare(
        b.properties['Name'],
      );
    });

    for (const poi of pois) {
      const poiName = poi.properties['Name'];
      const item = poisListItems[poiName];
      poisListEl.append(item);
    }
  }
  populateList(pois);

  //
  // Filter the pois list by multiple criteria...
  //

  // Capture the selected poi type
  let filteredTypePois = pois;

  events.addEventListener('typeselected', (evt) => {
    const { selectedType } = evt.detail;

    if (selectedType.length === 0) {
      filteredTypePois = pois;
    } else {
      filteredTypePois = pois.filter((poi) => {
        return selectedType.includes(poi.properties['Type']);
      });
    }

    performfiltering();
  });
  let currentFilterMethod = 'name';

  // Capture the filter method

  // Capture the search input

  // Define the filtering function
  function performfiltering() {
    const searchValue = searchInputEl.value.toLowerCase();

    const finalFilteredPois = filterPois(filteredTypePois, currentFilterMethod);
    function filterPois(filteredTypePois, currentFilterMethod) {

    }

    populateList(finalFilteredPois);
  }
}

export { initPoisList };
