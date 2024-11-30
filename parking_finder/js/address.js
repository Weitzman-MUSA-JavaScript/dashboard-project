import { filterSpotsByBuffer } from './spots_filter.js';

const addressEntry = document.querySelector("#entry")
const addressChoices = document.querySelector("#address-choices")
const timestampInput = document.querySelector("#timestamp");
const searchButton = document.querySelector("#search");

let selectedLocation = null;

function initializeAddressEntry(events) {
  addressEntry.mycustomfunc = () => {
    handleAddressEntryChange(events);
  };
  addressEntry.addEventListener('input', addressEntry.mycustomfunc);

  // Listen for the address-zoom-map event to update spots visibility
  events.addEventListener('address-zoom-map', (evt) => {
    const { buffer } = evt.detail;
    filterSpotsByBuffer(buffer);
  });

  // Search button is now the primary trigger
  searchButton.addEventListener('click', () => {
    if (selectedLocation && timestampInput.value) {
      const selectedPoint = turf.point([selectedLocation.lon, selectedLocation.lat]);
      const buffer = turf.buffer(selectedPoint, 0.5, {units: 'kilometers'});
      
      const addressLL = new CustomEvent('address-zoom-map', {
        detail: {
          lat: selectedLocation.lat,
          lon: selectedLocation.lon,
          buffer: buffer,
          bounds: turf.bbox(buffer)
        }
      });
      events.dispatchEvent(addressLL);
    }
  });

  // Add click outside listener to hide address choices
  document.addEventListener('click', (event) => {
    if (!addressChoices.contains(event.target) && event.target !== addressEntry) {
      addressChoices.classList.add('hidden');
    }
  });
}

async function handleAddressEntryChange(events) {
  addressChoices.classList.remove('hidden');
  const partialAddress = addressEntry.value;
  const apiKey = 'pk.eyJ1IjoiYWF2YW5pMTAzIiwiYSI6ImNtMTgxOGkyZzBvYnQyam16bXFydTUwM3QifQ.hXw8FwWysnOw3It_Sms3UQ';
  const bbox = [-121.5801,38.4375,-121.3852,38.685].join(',');
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${partialAddress}.json?bbox=${bbox}&access_token=${apiKey}`;

  if (partialAddress === '') {
    addressChoices.classList.add('hidden');
    selectedLocation = null;
    return;
  }

  const resp = await fetch(url);
  const data = await resp.json();

  let html = '';
  for (const feature of data.features) {
    const lihtml = `
    <li data-lat="${feature.center[1]}" data-lon="${feature.center[0]}">
      ${feature.place_name}
    </li>
    `;
    html += lihtml;
  }
  addressChoices.innerHTML = html;

  const choices = addressChoices.querySelectorAll('li');
  for (const choice of choices) {
    choice.addEventListener('click', (evt) => {
      handleAddressChoice(evt, events);
    });
  }
}

function handleAddressChoice(evt, events) {
  const li = evt.target;
  const lat = parseFloat(li.getAttribute('data-lat'));
  const lon = parseFloat(li.getAttribute('data-lon'));
  
  const text = li.innerText;
  addressEntry.value = text;
  addressChoices.classList.add('hidden');
  
  selectedLocation = { lat, lon };
}

export {
  initializeAddressEntry
};