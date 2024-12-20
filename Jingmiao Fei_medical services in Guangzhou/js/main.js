/*********************************Add Base Map************************************* */
const mapEl = document.querySelector('#map');
const map = L.map(mapEl).setView([23.1291, 113.2644], 12);  // Center map to Guangzhou with zoom level 12

// Add Mapbox basemap
L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    attribution: '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> contributors',
    maxZoom: 18,
    id: 'mapbox/streets-v12',  
    tileSize: 512,
    zoomOffset: -1,
    detectRetina: true,
    accessToken: 'pk.eyJ1IjoiamFzbWluZTQwNCIsImEiOiJjbTFmdXE0NWEzY2diMm1wem4xcGs3bWFrIn0.w-nHq5x4vpU3o2NEQ8frTQ'  
}).addTo(map);

/*********************************Add Neighborhood Data*********************************************** */
const hoodsResponse = await fetch('data/Guangzhou_neighborhoods.geojson');
const hoodsCollection = await hoodsResponse.json();
// Define the style for the neighborhood layer
const neighborhoodStyle = {
  fillColor: 'white',    // Fill color of the neighborhoods
  weight: 0.5,               // Border (stroke) width
  opacity: 1,              // Border opacity
  color: '#000000',        // Border (stroke) color
  fillOpacity: 0.7         // Fill opacity
};
// Create the geoJSON layer with the defined style
const hoodsLayer = L.geoJSON(hoodsCollection, {
  style: neighborhoodStyle  
}).addTo(map);

hoodsLayer.addTo(map);
map.fitBounds(hoodsLayer.getBounds());

/*********************************Add Medical Data*********************************************** */
const stationsResponse =  await fetch('data/Medical_Services.geojson');
const stationsData = await stationsResponse.json();
const typeColors = {
    "hospital": "red",  // Red for Hospitals
    "pet hospital": "orange",    // Green for Clinics
    "pharmacy": "skyblue",  // Blue for Pharmacies
    "community health centre": "green",
    "dental clinic": "purple", 
    "outpatient clinic":"pink"     // Magenta for others
  };
  
  const stationsLayer = L.geoJSON(stationsData, {
    pointToLayer: function (feature, latlng) {
      // Determine the color based on the "TYPE" property
      const serviceType = feature.properties.TYPE;
      const color = typeColors[serviceType] || "#007cbf"; // Default color if type is not found
  
      return L.circleMarker(latlng, {
        radius: 2,             // Size of the circle
        fillColor: color,      // Set color based on service type
        color: "#000",         // Border color
        weight: 1,             // Border thickness
        opacity: 1,            // Border opacity
        fillOpacity: 0.8       // Fill opacity
      });
    }
});

//stationsLayer.addTo(map);

/*********************************Add Legend*********************************************** */
// Add legend content to the #legend container
const legendEl = document.getElementById("legend");
legendEl.innerHTML += "<h4>Medical Service Types</h4>";

for (let type in typeColors) {
    const color = typeColors[type];
    legendEl.innerHTML += `<i style="background:${color}; width: 12px; height: 12px; display: inline-block; margin-right: 6px; border-radius: 2px;"></i> ${type}<br>`;
}

/********************************Add Tooltip****************************************************** */
hoodsLayer.bindTooltip(layer => {
    const hood = layer.feature;
    const name = hood.properties['NAME'];
    return `${name}`;
  });

/********************************Dropdown box********************************************************** */
// Declare markers array globally
let markers = [];

// Function to add markers to the map
function addMarkers(data) {
    data.features.forEach(feature => {
        // Get the neighborhood this service belongs to
        const neighborhood = feature.properties.NEIGHBORHO;
        
        const marker = L.circleMarker([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], {
            radius: 5,
            fillColor: typeColors[feature.properties.TYPE] || "#000", // Default color
            color: "#000",
            weight: 1,
            opacity: 1,
            fillOpacity: 0.7
        }).addTo(map);

        // Store the neighborhood and type of service for filtering
        marker.neighborhood = neighborhood; // Store neighborhood
        marker.serviceType = feature.properties.TYPE; // Store service type
        // bind tooltip for medical service points
        marker.bindTooltip(`Name: ${feature.properties.NAME_CN}<br>Phone: ${feature.properties.TELEPHONE}`,{
            permanent: false, // Set to true if you want the tooltip to always show
                direction: 'top', // Position the tooltip above the marker
                className: 'custom-tooltip', // Add a custom class for styling (optional)
        });
        // Add click event to show information when clicking on the marker
        marker.on('click', function() {
            // Assuming you have a box with the id 'info-box' to show marker info
            const infoBox = document.getElementById('info-box');
            infoBox.innerHTML = `Name: ${feature.properties.NAME_CN}<br>Phone: ${feature.properties.TELEPHONE}<br>Type:  ${feature.properties.TYPE}<br>District: ${feature.properties.NEIGHBORHO}<br>Address:  ${feature.properties.address}`;
        });
        markers.push(marker); // Add the marker to the global array
    });
}

// Function to populate neighborhood dropdown
function populateNeighborhoods(hoodsCollection) {
    const neighborhoodSelect = document.getElementById('neighborhood-search');
    hoodsCollection.features.forEach(feature => {
        const option = document.createElement('option');
        option.value = feature.properties.NAME;
        option.text = feature.properties.NAME;
        neighborhoodSelect.add(option);
    });
}

// Function to populate service type dropdown
function populateServiceTypes(data) {
    const serviceTypeSelect = document.getElementById('service-type-search');
    const serviceTypes = [...new Set(data.features.map(f => f.properties.TYPE))]; // Get unique service types
    serviceTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.text = type;
        serviceTypeSelect.add(option);
    });
}

// Event listener for neighborhood selection
document.getElementById('neighborhood-search').addEventListener('change', function () {
    const selectedNeighborhood = this.value;
    const selectedServiceType = document.getElementById('service-type-search').value;

    // Show/hide markers based on selected neighborhood and service type
    markers.forEach(marker => {
        const matchesNeighborhood = selectedNeighborhood === '' || (marker.neighborhood === selectedNeighborhood);
        const matchesServiceType = selectedServiceType === '' || (marker.serviceType === selectedServiceType);

        if (matchesNeighborhood && matchesServiceType) {
            marker.addTo(map); // Show marker if it matches both filters
        } else {
            map.removeLayer(marker); // Hide marker if it doesn't match
        }
        });
        // Zoom to the selected neighborhood if applicable
        if (selectedNeighborhood) {
            const selectedNeighborhoodFeature = hoodsCollection.features.find(feature => feature.properties.NAME === selectedNeighborhood);

            // Fly to the selected neighborhood's centroid
            if (selectedNeighborhoodFeature) {
                const lon = selectedNeighborhoodFeature.properties.lon; 
                const lat = selectedNeighborhoodFeature.properties.lat;
                const targetLatLng = [lat, lon]; 
                const targetZoom = 12;                
                map.flyTo(targetLatLng, targetZoom, {
                    duration: 1, 
                    easeLinearity: 0.25 
                });
            }
        }
});

// Event listener for service type selection
document.getElementById('service-type-search').addEventListener('change', function () {
    const selectedServiceType = this.value;
    const selectedNeighborhood = document.getElementById('neighborhood-search').value;

    // Show/hide markers based on selected service type and neighborhood
    markers.forEach(marker => {
        const matchesNeighborhood = selectedNeighborhood === '' || (marker.neighborhood === selectedNeighborhood);
        const matchesServiceType = selectedServiceType === '' || (marker.serviceType === selectedServiceType);

        if (matchesNeighborhood && matchesServiceType) {
            marker.addTo(map); // Show marker if it matches both filters
        } else {
            map.removeLayer(marker); // Hide marker if it doesn't match
        }
    });
});

// Fetch medical services data and neighborhoods
Promise.all([
    fetch('data/Medical_Services.geojson'),
    fetch('data/Guangzhou_neighborhoods.geojson')
]).then(responses => Promise.all(responses.map(response => response.json())))
  .then(data => {
      const medicalServicesData = data[0];
      const hoodsCollection = data[1];

      addMarkers(medicalServicesData, hoodsCollection); // Add medical service markers
      populateNeighborhoods(hoodsCollection); // Populate neighborhoods dropdown
      populateServiceTypes(medicalServicesData); // Populate service types dropdown
  })
  .catch(error => console.error('Error fetching data:', error));
