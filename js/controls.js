// Adapted from Week 6 hoods_select.js to cache, sort and search the list and send
// selections through the event bus. Buttons use click listeners from Week 6 user_events
// used claude and chat gpt both to edit/debug and understand
// and Week 8 address_autocomplete.

// getting the list of business categories to make a button for each one */
import { CATEGORIES } from './data.js';

// gets the panel (the side box), data (the 77 community areas) and event bus
// (the message board that tells the map what was clicked) from main.js, then finds the 3 empty spots
// to fill (Week 6 dom_manipulation hoods_select.js)
function initControls(el, areas, events) {
  const categoryListEl = el.querySelector('#category-list');
  const searchEl = el.querySelector('.search');
  const areaListEl = el.querySelector('#area-list');

  // creates a button for each business type and sends the selected category
  // through the event bus so other parts of the page can update
  // includes the category's key in the event so they know which business type was clicked
  // the side box only announces one choice, and the other things on the page update to that accordance
  for (const category of CATEGORIES) {
    const item = document.createElement('li');
    item.innerHTML = `<button type="button">${category.label}</button>`;
    item.querySelector('button').addEventListener('click', () => {
      const event = new CustomEvent('categorychanged', {
        detail: { categoryKey: category.key },
      });
      events.dispatchEvent(event);
    });
    categoryListEl.append(item);
  }

  // makes a button for each community area that tells the map to zoom to it when
  // clicked, and saves them for searching later (saving list items in an object:
  // from Week 6 hoods_select.js; buttons and clicks: Week 6 user_events)
  const areaListItems = {};
  for (const area of areas) {
    const props = area.properties;
    const item = document.createElement('li');
    item.innerHTML = `<button type="button">${props.name}</button>`;
    item.querySelector('button').addEventListener('click', () => {
      const event = new CustomEvent('areaselected', {
        detail: { areaNumber: props.area_numbe, fromList: true },
      });
      events.dispatchEvent(event);
    });
    areaListItems[props.area_numbe] = item;
  }

  // clears the current list and sorts the areas we want to show A to Z by name
  // uses each area's number to add its saved list item instead of creating a new one
  // populateList(areas) runs this function with all areas to show the full list at the start
  // (copied from Week 6 hoods_select.js populateList)
  function populateList(areasToShow) {
    areaListEl.innerHTML = '';

    areasToShow = areasToShow.sort((a, b) => {
      return a.properties.name.localeCompare(b.properties.name);
    });

    for (const area of areasToShow) {
      areaListEl.append(areaListItems[area.properties.area_numbe]);
    }
  }
  populateList(areas);

  // makes the search text and area names lowercase so capitalization does not affect the search
  // keeps only areas whose names include the search text, then updates the list with those areas
  // searches again each time we type or delete something in the search box
  // (copied from Week 6 hoods_select.js handleSearchInput)
  function handleSearchInput() {
    const filteredAreas = areas.filter((area) => {
      const searchValue = searchEl.value.toLowerCase();
      const areaName = area.properties.name.toLowerCase();
      return areaName.includes(searchValue);
    });

    populateList(filteredAreas);
  }
  searchEl.addEventListener('input', handleSearchInput);
}

// export so main.js can use it (Week 6 hoods_select.js)
export { initControls };
