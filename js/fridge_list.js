// define fridges as a global variable so i can use it in initFridgeList
let fridges;
let pos = null;

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
    calculateDistances();
    updateFridgeList(el);
  });
}

function calculateDistances() {
  if (!pos || !fridges.length) return;

  const lat = pos.coords.latitude;
  const long = pos.coords.longitude;

  for (const fridge of fridges) {
    const fridgeLat = fridge.geometry.coordinates[1];
    const fridgeLong = fridge.geometry.coordinates[0];

    const distance = Math.sqrt((lat - fridgeLat) ** 2 + (long - fridgeLong) ** 2);
    const distanceInMiles = distance * 69;

    Object.assign(fridge.properties, { distanceInMiles });
  }
}

function updateFridgeList(el) {
  if (!fridges.length) return;

  el.innerHTML = ''; // Clear existing list

  for (const fridge of fridges) {
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