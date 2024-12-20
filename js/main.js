const mapElement = document.querySelector('#map');
const map = L.map(mapElement).setView([55.6761, 12.5683], 12.5);

// Map Style
const mapboxKey = 'pk.eyJ1IjoiamppaXl5IiwiYSI6ImNtMHlidTN1cDBtNnEybHBzYWRpYzFxNXIifQ.2iHj6INb3fqTB_zAkGrlpg';
const mapboxStyle = 'mapbox/satellite-v9';

// The Base Tile Layer
const baseTileLayer = L.tileLayer(`http://api.mapbox.com/styles/v1/${mapboxStyle}/tiles/512/{z}/{x}/{y}?access_token=${mapboxKey}`, {
  tileSize: 512,
  opacity:1,
  zoomOffset: -1,
  maxZoom: 16,
  attribution: '&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://stamen.com/" target="_blank">Stamen Design</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
});
baseTileLayer.addTo(map);

// Original mapview
const initialCenter = [55.68, 12.57];
const initialZoom = 12.4;

// Function to add tooltips and popups
function onEachFeature(feature, layer) {
  if (feature.properties && feature.properties.navn) {
      // Tooltip content: Display project name (navn)
      const tooltipContent = `<strong>${feature.properties.navn}</strong>`;

      // Add tooltip to the marker
      layer.bindTooltip(tooltipContent, {
          permanent: false,   
          direction: 'top',   
          className: 'custom-tooltip', 
      });

      // Add popup with additional project details
      const popupContent = `
          <strong>${feature.properties.navn}</strong><br>
          Status: ${feature.properties.status || 'N/A'}<br>
          Area: ${feature.properties.omraadenav || 'N/A'}
      `;
      layer.bindPopup(popupContent);
  }
}

// Save markers
const markers = []; 

// Load GeoJSON
fetch('data/kvarterloeft_fromSHP.geojson')
    .then((response) => response.json())
    .then((data) => {
        L.geoJSON(data, {
            onEachFeature: onEachFeature, 
        }).addTo(map);
    displaySidebarList(data); 
  });

// Projects
function displaySidebarList(geojsonData) {
  const siteList = document.querySelector('.projects');
  siteList.innerHTML = '<h3>Project List</h3>'; 

  // Reset View Button
  const resetButton = document.createElement('button');
  resetButton.textContent = 'Reset View';
  resetButton.classList.add('reset-button');
  resetButton.style.marginBottom = '10px';
  resetButton.style.display = 'block';

  resetButton.addEventListener('click', () => {
    map.setView(initialCenter, initialZoom);
  });

  siteList.appendChild(resetButton);

  // Populate project list
  geojsonData.features.forEach((feature) => {
    const projectName = feature.properties.navn || 'Unnamed Project';

    const projectItem = document.createElement('div');
    projectItem.classList.add('site-item');
    projectItem.innerHTML = `<strong>${projectName}</strong>`;

    // Click event: find the corresponding marker and zoom
    projectItem.addEventListener('click', () => {
      const targetMarker = markers.find((m) => m.id === projectName);
      if (targetMarker) {
        map.setView(targetMarker.marker.getLatLng(), 15);
        targetMarker.marker.openPopup();
      }
    });

    siteList.appendChild(projectItem);
  });
}

// DOM Elements for Location Name Search
const locationFilterButton = document.getElementById('locationFilterButton');
const locationInput = document.getElementById('locationInput');
const resetLocationButton = document.getElementById('resetLocationButton');

// Location Name Search Functionality
locationFilterButton.addEventListener('click', () => {
    const searchQuery = locationInput.value.trim().toLowerCase();

    fetch('data/kvarterloeft_fromSHP.geojson')
        .then((response) => response.json())
        .then((data) => {
            // Filter projects by omraadenav (location name)
            const filteredFeatures = data.features.filter((feature) => {
                const areaName = feature.properties.omraadenav || '';
                return areaName.toLowerCase().includes(searchQuery);
            });

            // Clear existing map markers
            map.eachLayer((layer) => {
                if (layer instanceof L.Marker) {
                    map.removeLayer(layer);
                }
            });

            // Add filtered markers to the map
            const geoJsonLayer = L.geoJSON(filteredFeatures, {
                onEachFeature: (feature, layer) => {
                    layer.bindPopup(`<b>${feature.properties.navn || 'Unnamed Project'}</b><br>
                                     Status: ${feature.properties.status || 'N/A'}<br>
                                     Area: ${feature.properties.omraadenav || 'N/A'}`);
                }
            }).addTo(map);

            // Adjust map view to fit filtered markers
            if (filteredFeatures.length > 0) {
                const group = new L.FeatureGroup(geoJsonLayer.getLayers());
                map.fitBounds(group.getBounds());
            } else {
                alert('No projects found for the given location.');
            }

            // Update sidebar list
            displaySidebarList({ features: filteredFeatures });
        });
});

// Reset Button for Location Name Search
resetLocationButton.addEventListener('click', () => {
    locationInput.value = '';

    fetch('data/kvarterloeft_fromSHP.geojson')
        .then((response) => response.json())
        .then((data) => {
            // Clear existing markers
            map.eachLayer((layer) => {
                if (layer instanceof L.Marker) {
                    map.removeLayer(layer);
                }
            });

            // Reload all markers
            L.geoJSON(data, {
                onEachFeature: onEachFeature,
            }).addTo(map);

            displaySidebarList(data);

            // Reset to initial map view
            map.setView(initialCenter, initialZoom);
        });
});

// DOM Elements for project name search
const projectFilterButton = document.getElementById('projectFilterButton');
const projectInput = document.getElementById('projectInput');
const resetProjectButton = document.getElementById('resetProjectButton');

// Project Name Search Functionality
projectFilterButton.addEventListener('click', () => {
    const searchQuery = projectInput.value.trim().toLowerCase();

    fetch('data/kvarterloeft_fromSHP.geojson')
        .then(response => response.json())
        .then(data => {
            // Filter projects by navn (project name)
            const filteredFeatures = data.features.filter((feature) => {
                const projectName = feature.properties.navn || '';
                return projectName.toLowerCase().includes(searchQuery);
            });

            // Clear existing map markers
            map.eachLayer((layer) => {
                if (layer instanceof L.Marker) {
                    map.removeLayer(layer);
                }
            });

            // Add filtered markers to the map
            const geoJsonLayer = L.geoJSON(filteredFeatures, {
                onEachFeature: (feature, layer) => {
                    layer.bindPopup(`<b>${feature.properties.navn}</b><br>
                                     Status: ${feature.properties.status || 'N/A'}<br>
                                     Area: ${feature.properties.omraadenav || 'N/A'}`);
                }
            }).addTo(map);

            // Adjust map view to fit filtered markers
            if (filteredFeatures.length > 0) {
                const group = new L.FeatureGroup(geoJsonLayer.getLayers());
                map.fitBounds(group.getBounds());
            } else {
                alert('No projects found for the given project name.');
            }

            // Update sidebar list
            displaySidebarList({ features: filteredFeatures });
        });
});

// Reset Button for Project Name Search
resetProjectButton.addEventListener('click', () => {
    projectInput.value = '';

    fetch('data/kvarterloeft_fromSHP.geojson')
        .then(response => response.json())
        .then(data => {
            // Reload all markers
            map.eachLayer((layer) => {
                if (layer instanceof L.Marker) {
                    map.removeLayer(layer);
                }
            });

            L.geoJSON(data, {
                onEachFeature: onEachFeature,
            }).addTo(map);

            displaySidebarList(data);
            map.setView(initialCenter, initialZoom); 
        });
});

// Select all category checkboxes
const categoryCheckboxes = document.querySelectorAll('.category-checkbox');

// Function to filter by indsats categories
function filterByCategory(geojsonData) {
    // Get all checked categories
    const selectedCategories = Array.from(categoryCheckboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value);

    // Filter GeoJSON features based on selected categories
    const filteredFeatures = geojsonData.features.filter(feature => {
        const indsats = feature.properties.indsats || '';
        return selectedCategories.length === 0 || selectedCategories.includes(indsats);
    });

    return filteredFeatures;
}

// Function to update the map and sidebar
function updateMapAndSidebar() {
    fetch('data/kvarterloeft_fromSHP.geojson')
        .then(response => response.json())
        .then(geojsonData => {
            const filteredFeatures = filterByCategory(geojsonData);

            // Clear the map
            map.eachLayer(layer => {
                if (layer instanceof L.Marker || layer instanceof L.GeoJSON) {
                    map.removeLayer(layer);
                }
            });

            // Add filtered features to the map
            const geoJsonLayer = L.geoJSON(filteredFeatures, {
                onEachFeature: (feature, layer) => {
                    layer.bindPopup(`<b>${feature.properties.navn}</b><br>
                                    Category: ${feature.properties.indsats || 'N/A'}`);
                }
            }).addTo(map);

            // Fit bounds if there are filtered features
            if (filteredFeatures.length > 0) {
                const group = new L.FeatureGroup(geoJsonLayer.getLayers());
                map.fitBounds(group.getBounds());
            }

            // Update the sidebar list
            displaySidebarList({ features: filteredFeatures });
        });
}

// Event listener for checkbox changes
categoryCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', updateMapAndSidebar);
});


// Select all status checkboxes
const statusCheckboxes = document.querySelectorAll('.status-checkbox');

// Function to filter by status
function filterByStatus(geojsonData) {
    // Get all checked status values
    const selectedStatus = Array.from(statusCheckboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value);

    // Filter GeoJSON features based on selected status
    const filteredFeatures = geojsonData.features.filter(feature => {
        const status = feature.properties.status || '';
        return selectedStatus.length === 0 || selectedStatus.includes(status);
    });

    return filteredFeatures;
}

// Function to update the map and sidebar with both filters (status + category)
function updateMapAndSidebarWithFilters() {
    fetch('data/kvarterloeft_fromSHP.geojson')
        .then(response => response.json())
        .then(geojsonData => {
            // Apply both filters
            const categoryFiltered = filterByCategory(geojsonData);
            const fullyFilteredFeatures = filterByStatus({ features: categoryFiltered });

            // Clear the map
            map.eachLayer(layer => {
                if (layer instanceof L.Marker || layer instanceof L.GeoJSON) {
                    map.removeLayer(layer);
                }
            });

            // Add filtered features to the map
            const geoJsonLayer = L.geoJSON(fullyFilteredFeatures, {
                onEachFeature: (feature, layer) => {
                    layer.bindPopup(`
                        <b>${feature.properties.navn}</b><br>
                        Status: ${getStatusTranslation(feature.properties.status)}<br>
                        Category: ${feature.properties.indsats || 'N/A'}
                    `);
                }
            }).addTo(map);

            // Fit bounds if filtered features exist
            if (fullyFilteredFeatures.length > 0) {
                const group = new L.FeatureGroup(geoJsonLayer.getLayers());
                map.fitBounds(group.getBounds());
            }

            // Update the sidebar list
            displaySidebarList({ features: fullyFilteredFeatures });
        });
}

// Helper function to translate status to "English (Danish)" format
function getStatusTranslation(status) {
    const statusMap = {
        "Projektering": "Planning (Projektering)",
        "Idémodning": "Idea Development (Idémodning)",
        "Udført": "Completed (Udført)",
        "Anlæg": "Construction (Anlæg)",
        "Annulleret": "Cancelled (Annulleret)"
    };
    return statusMap[status] || status; // Default to the original status if no match
}

// Event listeners for status checkboxes
statusCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', updateMapAndSidebarWithFilters);
});

// Ensure category filters also trigger the combined filtering
categoryCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', updateMapAndSidebarWithFilters);
});
