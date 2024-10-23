// define fridges as a global variable so i can use it in initFridgeList
let fridges;
let pos = null;

const mapboxKey = 'pk.eyJ1IjoiY2hpYmlha2kiLCJhIjoiY20xODh2NTNqMTBvaDJqb2ptbjM4ZGViayJ9.un9M1_-S6kI8M0ktqZLz_Q';

function initFridgeList(el, events) {
  el.innerHTML = '';

  // Add event listener for fridgedataready event
  events.addEventListener('fridgedataready', (evt) => {
    fridges = evt.detail.fridges; // Populate fridges with the event detail
    updateFridgeList(el);
  });

  // Add event listener for positionfound event
  events.addEventListener('positionfound', (evt) => {
    pos = evt.detail;
    const userLat = pos.coords.latitude;
    const userLong = pos.coords.longitude;
    calculateDistances(userLat, userLong);
    updateFridgeList(el);
  });

  // Add event listener for search-zip button
  document.getElementById('search-zip').addEventListener('click', () => {
    const zipCode = document.getElementById('zip-search').value;
    searchZipCode(zipCode, el, events);
  });
}

function searchZipCode(zipCode, el, events) {
  const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${zipCode}.json?access_token=${mapboxKey}`;

  fetch(geocodingUrl)
    .then((response) => response.json())
    .then((data) => {
      if (data.features.length > 0) {
        const center = data.features[0].center;
        const lat = center[1];
        const long = center[0];

        // Zoom the map to the coordinates of the zip code
        events.dispatchEvent(new CustomEvent('zoomto', { detail: { lat, long } }));

        // Calculate distances and update the fridge list
        calculateDistances(lat, long);
        updateFridgeList(el);
      } else {
        alert('ZIP code not found.');
      }
    })
    .catch((error) => console.error('Error fetching geocoding data:', error));
}

function calculateDistances(lat, long) {
  if (!fridges.length) return;

  for (const fridge of fridges) {
    const fridgeLat = fridge.geometry.coordinates[1];
    const fridgeLong = fridge.geometry.coordinates[0];

    const distance = Math.sqrt((lat - fridgeLat) ** 2 + (long - fridgeLong) ** 2);
    const distanceInMiles = distance * 69;

    Object.assign(fridge.properties, { distanceInMiles });

    // console.log(fridge.properties['name'], distanceInMiles, fridge.properties['distanceInMiles']);
  }

  fridges.sort((a, b) => a.properties['distanceInMiles'] - b.properties['distanceInMiles']);
}

function updateFridgeList(el) {
  if (!fridges.length) return;

  el.innerHTML = ''; // Clear existing list

  for (const fridge of fridges) {
    // console.log(fridge.properties['name'], fridge.properties['distanceInMiles']);
    el.innerHTML += `
      <li class="fridge">
        <a href="${fridge.properties['website']}" class="fridge-name">${fridge.properties['name']}</a>
        <span class="fridge-distance">${fridge.properties['distanceInMiles'] ? fridge.properties['distanceInMiles'].toFixed(2) : 'N/A'} mi</span>
        <span class="fridge-address">${fridge.properties['addressStreet']}</span>
      </li>
    `;
  }
}

export { initFridgeList };