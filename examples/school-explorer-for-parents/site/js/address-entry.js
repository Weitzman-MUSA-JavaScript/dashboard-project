/* globals turf */

import { debounce } from './function-tools.js';

const addressSearchInput = document.querySelector('[name="address-search"]');
const addressOptionsList = document.querySelector('#address-options');

function initializeAddressEntry(catchments, eventBus) {
  addressSearchInput.addEventListener(
    'input',
    debounce(() => handleAddressSearch(catchments, eventBus), 500),
  );
}

async function handleAddressSearch(catchments, eventBus) {
  const searchAddress = addressSearchInput.value;

  if (searchAddress === '') {
    const detail = { place: null, catchment: null };
    const evt = new CustomEvent('addresschanged', { detail });
    eventBus.dispatchEvent(evt);
    return;
  }

  const apiKey = 'pk.eyJ1IjoibWp1bWJlLXRlc3QiLCJhIjoiY2wwb3BudmZ3MWdyMjNkbzM1c2NrMGQwbSJ9.2ATDPobUwpa7Ou5jsJOGYA';
  const resp = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${searchAddress}.json?access_token=${apiKey}`);
  const addressOptions = await resp.json();

  addressOptionsList.innerHTML = `
    ${addressOptions.features.map((feature) => `
      <li data-lat="${feature.center[1]}"
          data-lon="${feature.center[0]}"
          data-name="${feature.place_name}">
        ${feature.place_name}
      </li>
    `).join('')}
  `;

  for (const option of addressOptionsList.querySelectorAll('li')) {
    option.addEventListener('click', (evt) => {
      handleAddressOptionSelect(evt, catchments, eventBus);
    });
  }
}

/**
 * Handle the click of an address option list item.
 *
 * @param {PointerEvent} evt The event from clicking the list item
 * @param {FeatureCollection} catchments An array of catchment features
 * @param {EventTarget} eventBus The application event bus
 */
function handleAddressOptionSelect(evt, catchments, eventBus) {
  const option = evt.target;

  addressSearchInput.value = option.dataset.name;
  addressOptionsList.innerHTML = '';

  const coords = [parseFloat(option.dataset.lon), parseFloat(option.dataset.lat)];
  const catchment = catchments.features.find((feature) => turf.booleanPointInPolygon(coords, feature));

  const detail = {
    place: {
      type: 'Feature',
      properties: {
        address: option.dataset.name,
      },
      geometry: {
        type: 'Point',
        coordinates: coords,
      },
    },
    catchment,
  };
  console.log(detail);
  const newEvt = new CustomEvent('addresschanged', { detail });
  eventBus.dispatchEvent(newEvt);
}

export {
  initializeAddressEntry,
};
