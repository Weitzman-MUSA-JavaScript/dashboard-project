import { resourceLayers, resourceMap } from './resource-map.js';
import { resourceIcons, darkBlueIcon } from './map-styles.js';

const addressEntry = document.querySelector('#address-search');
const addressChoiceList = document.querySelector('#address-choices');
let currentMarker = null;

  // Create marker for each resource icon bigger
export function zoomToResource(resource) {
  const { lat, lon, name, type } = resource;

  resourceMap.setView([lat, lon], 16);

  if (currentMarker) {
      resourceMap.removeLayer(currentMarker);
  }


  currentMarker = L.marker([lat, lon], { 
      icon: L.icon({
          iconUrl: resourceIcons[type].options.iconUrl, 
          iconSize: [48, 48],
          iconAnchor: [24, 48],
          popupAnchor: [0, -48],
      })
  }).addTo(resourceMap);

  // Create a popup
  const popup = currentMarker.bindPopup(name, { className: 'zoomed-popup' }).openPopup();

  // Remove the marker after 3 seconds
  setTimeout(() => {
      resourceMap.removeLayer(currentMarker);
      currentMarker = null; 
  }, 3000);
}


export function initializeAddressSearch(map) {
  addressEntry.addEventListener('input', debounce(() => handleAddressEntryChange(map), 300));

async function handleAddressEntryChange(map) {
  addressChoiceList.classList.remove('hidden');
  const partialAddress = addressEntry.value;

  if (partialAddress.trim() === '') {
    addressChoiceList.classList.add('hidden');
    return;
  }

  // Limit search to Philadelphia
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(partialAddress + ', Philadelphia')}&countrycodes=us`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      addressChoiceList.innerHTML = '<li>No results found</li>';
      return;
    }

    let html = '';
    for (const result of data) {
      const lihtml = `
      <li data-lat="${result.lat}" data-lon="${result.lon}">
        ${result.display_name}
      </li>
      `;
      html += lihtml;
    }
    addressChoiceList.innerHTML = html;

    const choices = addressChoiceList.querySelectorAll('li');
    for (const choice of choices) {
      choice.addEventListener('click', (evt) => handleAddressChoice(evt, map));
    }
  } catch (error) {
    console.error('Error fetching address data:', error);
    addressChoiceList.innerHTML = '<li>Error fetching address data</li>';
  }
}

let currentMarker = null; 

function handleAddressChoice(evt, map) {
  const li = evt.target;
  const lat = parseFloat(li.getAttribute('data-lat'));
  const lon = parseFloat(li.getAttribute('data-lon'));

  addressEntry.value = li.innerText;
  addressChoiceList.classList.add('hidden');

  // Set the map view to the selected location with a zoom level of 15
  map.setView([lat, lon], 15);

  if (currentMarker) {
    map.removeLayer(currentMarker);
  }

  // Create the custom dark blue marker
  currentMarker = L.marker([lat, lon], { icon: darkBlueIcon }).addTo(map);

  showNearbyResources(lat, lon, map);
}

function showNearbyResources(lat, lon, map) {
  const searchPoint = turf.point([lon, lat]);
  let nearbyResources = [];

  Object.keys(resourceLayers).forEach(resourceType => {
    if (resourceLayers[resourceType]) {
      resourceLayers[resourceType].eachLayer(layer => {
        const resourcePoint = turf.point([layer.getLatLng().lng, layer.getLatLng().lat]);
        const distance = turf.distance(searchPoint, resourcePoint, { units: 'miles' });

        // Log feature properties
        console.log('Resource Type:', resourceType, 'Properties:', layer.feature.properties);
        let siteName = layer.feature.properties.site_name;
        let contactNumber = layer.feature.properties.phone_number || "-";

        if (distance <= 5) {
          nearbyResources.push({
            name: siteName,
            type: resourceType,
            contact: contactNumber,
            distance: distance.toFixed(2),
            lat: layer.getLatLng().lat,
            lon: layer.getLatLng().lng
          });
        }
      });
    }
  });
  displayNearbyResourcesList(nearbyResources);
}

function formatResourceType(type) {
  if (type === 'intakeCenters') {
    return 'Intake Centers';
  }
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function displayNearbyResourcesList(resources) {
  const listContainer = document.getElementById('nearby-resources-list');  
  listContainer.innerHTML = '';

  resources.sort((a, b) => a.distance - b.distance);

  resources.forEach((resource, index) => {
    const formattedType = formatResourceType(resource.type);
    const iconUrl = resourceIcons[resource.type].options.iconUrl;

    const listItem = document.createElement('li');
    listItem.setAttribute('data-resource-id', index);
    
    listItem.innerHTML = `
      <div style="display: flex; align-items: center;">
        <img src="${iconUrl}" alt="${formattedType} icon" style="width:24px; height:24px; margin-right:8px;"> 
        <span>${formattedType}</span>
      </div>
      <strong style="font-weight: bold;">${resource.name}</strong>
      <br> Contact: ${resource.contact}
      <br>(Distance: ${resource.distance} mil)
    `;

    listItem.addEventListener('mouseenter', () => zoomToResource(resource));
    listItem.addEventListener('mouseleave', () => resetZoomToResource(resource));
    listItem.addEventListener('click', () => zoomToResource(resource));

    listContainer.appendChild(listItem);
  });
}



function resetZoomToResource(resource) {
  const { lat, lon, type } = resource;
  resourceLayers[type].eachLayer(layer => {
    const layerLatLng = layer.getLatLng();
    if (layerLatLng.lat === lat && layerLatLng.lng === lon) {
      layer.setIcon(resourceIcons[type]);
    }
  });
}
}

function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}