function initializeSearch(stationInfo, events) {
  const searchBox = document.querySelector('#search-box');
  const cityRadio = document.querySelector('#city');
  const addressRadio = document.querySelector('#address');
  const productCheckboxes = document.querySelectorAll('.checkbox input[type="checkbox"]');

  function filterStations() {
    const searchText = searchBox.value.toLowerCase();
    const filterType = cityRadio.checked ? 'city' : 'address_1';
    const selectedProducts = Array.from(productCheckboxes)
      .filter((checkbox) => checkbox.checked && checkbox.id !== 'SelectAll')
      .map((checkbox) => checkbox.value);
  
    const filteredStations = stationInfo.features.filter((feature) => {
      const properties = feature.properties;
  
      const matchesSearchText =
        properties[filterType] && properties[filterType].toLowerCase().includes(searchText);
  
      const matchesProducts =
        selectedProducts.length === 0 || selectedProducts.some((product) =>
          (properties.product_name || '').toLowerCase().includes(product.toLowerCase())
        );
  
      return matchesSearchText && matchesProducts;
    });
  
    // Dispatch event to update map and station list
    const event = new CustomEvent('filter-stations', { detail: { filteredStations } });
    events.dispatchEvent(event);
  }  

  searchBox.addEventListener('input', filterStations);
  productCheckboxes.forEach((checkbox) => checkbox.addEventListener('change', filterStations));
}


function updateFiltersAndList(stationGeoJSON, events) {
  const searchBox = document.querySelector('#search-box');
  // const divisionCheckboxes = document.querySelectorAll('#division-filter input[type="checkbox"]:checked');
  const searchText = searchBox.value.toLowerCase();
  // const selectedDivisions = Array.from(divisionCheckboxes).map(cb => cb.value);

  const filteredStadiums = stationGeoJSON.features.filter((feature) => {
    const stadium = feature.properties;
    //const matchesDivision = selectedDivisions.length === 0 || selectedDivisions.includes(stadium.Division);
    const matchesSearchText = stadium.Team.toLowerCase().includes(searchText);
    // return matchesDivision && matchesSearchText;
    return matchesSearchText;
  });

  // updateTeamList(filteredStadiums, events);
  const newEvent = new CustomEvent('filter-stadiums', { detail: { filteredStadiums } });
  events.dispatchEvent(newEvent);
}

function updateTeamList(stadiums, events) {
  const listElement = document.querySelector('#station-list');
  listElement.innerHTML = ''; // Clear existing list

  stadiums.forEach((stadium, index) => {
    const li = document.createElement('li');
    li.textContent = stadium.properties.Team;
    li.dataset.index = index; // Add index to each list item
    // li.addEventListener('click', () => focusOnMap(stadium, index, events));
    listElement.appendChild(li);
  });
}

function focusOnMap(stadium, index, events) {
  const mapZoomSelect = stadium.ID; // .dataset is get the attribute in html (get your customized attribute!)

  // define a customized event
  const zoomId = new CustomEvent('zoom-map', { detail: { mapZoomSelect } }); // define your own event
  events.dispatchEvent(zoomId);
}

export {
  initializeSearch,
};

// Get reference to the search box and the "X" button
const searchBox = document.querySelector('#search-box');
const clearSearchButton = document.querySelector('.cross-icon');

// Import stationLayer and stationInfo to reload all points
import { stationLayer, updateMapStations } from './map.js';
import { stationInfo } from './main.js'; // Ensure stationInfo is exported from main.js

// " Search Box" functionality
clearSearchButton.addEventListener('click', () => {
  // Clear the search box input
  searchBox.value = '';

  // Reload all points on the map
  updateMapStations(stationInfo.features, stationLayer);
  updateStationList(stationInfo.features);

  // Dispatch event to reset the station list and other UI components
  const event = new CustomEvent('filter-stations', { detail: { filteredStations: stationInfo.features } });
  events.dispatchEvent(event);
});

clearSearchButton.addEventListener('click', () => {
  searchBox.value = '';

  // Reload all points and reset the list
  updateMapStations(stationInfo.features, stationLayer);
  updateStationList(stationInfo.features);

  // Dispatch event for consistency
  const event = new CustomEvent('filter-stations', { detail: { filteredStations: stationInfo.features } });
  events.dispatchEvent(event);
});

