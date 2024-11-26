import _debounce from 'https://esm.run/lodash/debounce';

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
  console.log(poisListItems);

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
        return selectedType.includes(poi.properties.Type);
      });
    }

    performfiltering();
  });

  // Capture the filter method
  let currentFilterMethod = 'name';

  filterMethodsEl.addEventListener('change', (evt) => {
    if (evt.target.name === 'filter-method') {
      currentFilterMethod = evt.target.value;
      performfiltering();
    }
  });

  // Capture the search input
  searchInputEl.addEventListener(
    'input',
    _debounce((evt) => {
      performfiltering();
    }, 300),
  );

  const clearButton = poiSearchEl.querySelector('#clear-button');
  clearButton.addEventListener('click', (evt) => {
    searchInputEl.value = '';
    performfiltering();
  });

  // Define the filtering function
  function performfiltering() {
    const searchValue = searchInputEl.value.toLowerCase();
    const finalFilteredPois = filterPois(filteredTypePois, currentFilterMethod, searchValue);

    function filterPois(filteredTypePois, currentFilterMethod, searchValue) {
      return filteredTypePois.filter((poi) => {
        const poiName = poi.properties['Name'].toLowerCase();
        const poiSubcategory = poi.properties['Subcategory'].toLowerCase();

        if (currentFilterMethod === 'name') {
          return poiName.includes(searchValue);
        } else if (currentFilterMethod === 'subcategory') {
          return poiSubcategory.includes(searchValue);
        }
      });
    }

    populateList(finalFilteredPois);
  }

  //
  // Select pois from the list...
  //

  // Handle click event on each poi button
  poisListEl.addEventListener('click', (evt) => {
    const poiButton = evt.target.closest('.poi');
    if (!poiButton) return;

    const poiName = poiButton.dataset.name;
    const poi = pois.find((item) => item.properties.Name === poiName);

    if (poi) {
      const event = new CustomEvent('poiselected', { detail: { poi } });
      events.dispatchEvent(event);
    }
  });

  // Listen for updated selected pois list
  events.addEventListener('selectedlistupdated', (evt) => {
    const { poiSelectedList } = evt.detail;

    // Update aria-pressed attributes based on selection
    pois.forEach((poi) => {
      const poiName = poi.properties.Name;
      const item = poisListItems[poiName];

      // Check if the poi is selected
      if (item) {
        const isSelected = poiSelectedList.some((selected) => selected.properties.Name === poiName);
        item.querySelector('.poi').setAttribute('aria-pressed', isSelected.toString());
      }
    });
  });
}

export { initPoisList };
