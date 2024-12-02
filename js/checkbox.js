// Get references to all checkboxes and buttons
const checkboxes = document.querySelectorAll('input[type="checkbox"]:not(#SelectAll)');
const selectAllCheckbox = document.getElementById('SelectAll');
const clearAllButton = document.getElementById('ClearAll');

// Import stationLayer and stationInfo to reload all points
import { stationLayer, updateMapStations } from './map.js';
import { stationInfo } from './main.js';

clearAllButton.addEventListener('click', () => {
  checkboxes.forEach((checkbox) => {
    checkbox.checked = false;
  });
  selectAllCheckbox.checked = false;

  // Reload all points and reset the list
  updateMapStations(stationInfo.features, stationLayer);
  updateStationList(stationInfo.features);

  // Dispatch event for consistency
  const event = new CustomEvent('filter-stations', { detail: { filteredStations: stationInfo.features } });
  events.dispatchEvent(event);
});

// Handle "Select All" checkbox
selectAllCheckbox.addEventListener('change', () => {
  const isChecked = selectAllCheckbox.checked;
  checkboxes.forEach((checkbox) => {
    checkbox.checked = isChecked;
  });

  // Trigger filtering logic if necessary
  filterStations();
});

// Automatically update "Select All" based on individual checkboxes
checkboxes.forEach((checkbox) => {
  checkbox.addEventListener('change', () => {
    const allChecked = Array.from(checkboxes).every((cb) => cb.checked);
    selectAllCheckbox.checked = allChecked;

    // Trigger filtering logic if necessary
    filterStations();
  });
});

// Function to trigger station filtering (imported from search.js)
//import { filterStations } from './search.js';
