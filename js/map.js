// Create the stationLayer and export it for external use
export const stationLayer = L.layerGroup();
export let map; // Export the map globally

function initializeMap(stationInfo, events) {
  // Initialize the map and set the initial view to California
  const map = L.map('map').setView([34.0, -118.4096], 12); //

  // ## The Base Tile Layer
  const mapboxKey = 'pk.eyJ1IjoibWp1bWJlLXRlc3QiLCJhIjoiY2w3ZTh1NTIxMTgxNTQwcGhmODU2NW5kaSJ9.pBPd19nWO-Gt-vTf1pOHBA';
  const mapboxStyle = 'mapbox/light-v11';
  
  L.tileLayer(`https://api.mapbox.com/styles/v1/${mapboxStyle}/tiles/512/{z}/{x}/{y}{r}?access_token=${mapboxKey}`, {
    tileSize: 512,
    zoomOffset: -1,
    detectRetina: true,
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);
 
  // Add the stationLayer to the map
  stationLayer.addTo(map);

   // Add the combined legend
  const legend = L.control({ position: 'bottomright' });

  legend.onAdd = function () {
    const div = L.DomUtil.create('div', 'info legend');
    const colors = ['#f8a39c', '#c98fa0', '#9a79a8', '#5d5eaf', '#3a4db3'];
    const radii = [1, 3, 5, 7, 9]; // Example radii corresponding to color range

    div.innerHTML = `<strong>Overall Rating</strong><br>`;

    for (let i = 0; i < colors.length; i++) {
      div.innerHTML += `
        <div style="display: flex; align-items: center; margin-bottom: 5px;">
          <svg width="40" height="40" style="margin-right: 8px;">
            <circle cx="20" cy="20" r="${radii[i]}" fill="${colors[i]}" stroke="${colors[i]}" opacity="0.8"></circle>
          </svg>
          <span>${i * 1.0} - ${(i + 1) * 1.0}</span>
        </div>
      `;
    }

    return div;
  };
 
   legend.addTo(map);

  // Populate the map with initial stations  data
  updateMapStations(stationInfo.features, stationLayer);

  // Event listener for filtering stations 
  events.addEventListener('filter-stations ', (evt) => {
    const filteredStations = evt.detail.filteredStations;
    updateMapStations(filteredStations, stationLayer);
  });

  return stationLayer;
}

function updateMapStations(stationGeoJSON, stationLayer) {
  stationLayer.clearLayers();

  // Define the 5 colors for the gradient
  const colors = ['#f8a39c', '#c98fa0', '#9a79a8', '#5d5eaf', '#3a4db3'];

  stationGeoJSON.forEach((feature) => {
    const properties = feature.properties;
    const coordinates = feature.geometry.coordinates;

    // Map the overall_rating to one of the 5 colors
    const overallRating = parseFloat(properties.overall_rating) || 0; // Default to 0 if undefined
    const color = getColor(overallRating, colors);
  
    // Scale the radius (1 is smallest, 5 is largest)
    const radius = scaleRadius(overallRating);

    const marker = L.circleMarker([coordinates[1], coordinates[0]], {
      radius: radius,
      color: color,
      fillColor: color,
      fillOpacity: 0.8,
    });

    marker.bindTooltip(`${properties.loc_name || 'N/A'}, ${properties.city || 'N/A'}`, {
      permanent: false,
      direction: 'top',
    });

    marker.bindPopup(`
      <div>
        <strong>Station:</strong> ${properties.loc_name || 'N/A'}<br>
        <strong>Address:</strong> ${[properties.address_1, properties.address_2, properties.city]
          .filter((item) => item)
          .join(', ') || 'N/A'}<br>
        <strong>Overall Rating:</strong> ${overallRating.toFixed(2)}
      </div>
    `);

    // Add click event to zoom to marker
    marker.on('click', () => {
      const latLng = [coordinates[1], coordinates[0]];

      if (map) {
        map.setView(latLng, 15); // Center and zoom the map
        marker.openPopup(); // Open the marker's popup
      } else {
        console.error("Map instance is not defined.");
      }
    });
    
    marker.addTo(stationLayer);
  });
}

// Function to get color based on rating
function getColor(rating, colors) {
  if (rating <= 1) return colors[0];
  if (rating <= 2) return colors[1];
  if (rating <= 3) return colors[2];
  if (rating <= 4) return colors[3];
  return colors[4];
}

// Function to determine radius based on rating range
function scaleRadius(rating) {
  if (rating <= 1) return 0.1;
  if (rating <= 2) return 1;
  if (rating <= 3) return 3;
  if (rating <= 4) return 5;
  return 7;
}

export { initializeMap, updateMapStations };

