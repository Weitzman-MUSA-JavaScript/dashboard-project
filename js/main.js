const mapElement = document.querySelector('#map');
const map = L.map(mapElement).setView([38.9072, -77.0369], 13);

// Map Style
const mapboxKey = 'pk.eyJ1IjoiZWNoaW5saSIsImEiOiJjbTEybWVsY3kwZW1nMmxwbTY4bGx1dDM1In0.Cncmmjeonp1yp1AXZrOqvQ';
const mapboxStyle = 'echinli/cm1h3iqj5012y01qk46i24fdk';

// The Base Tile Layer
const baseTileLayer = L.tileLayer(`http://api.mapbox.com/styles/v1/${mapboxStyle}/tiles/512/{z}/{x}/{y}?access_token=${mapboxKey}`, {
  tileSize: 512,
  zoomOffset: -1,
  maxZoom: 16,
  attribution: '&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://stamen.com/" target="_blank">Stamen Design</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
});
baseTileLayer.addTo(map);

// Custom Icon
const foodIcon = L.icon({
    iconUrl: 'pic/FoodIcon.svg',
    iconSize: [48, 48],
});

// Function to add popups
function onEachFeature(feature, layer) {
    if (feature.properties && feature.properties.NAME && feature.properties.ADDRESS) {
        const tooltipContent = `<strong>${feature.properties.NAME}</strong><br>Address: ${feature.properties.ADDRESS}`;
        layer.bindTooltip(tooltipContent, {
            permanent: false,
            direction: 'top',
            className: 'custom-tooltip'
        });
    }
}

// Save markers
const markers = [];

// Load GeoJSON
fetch('data/SummerMeals.geojson')
   .then(response => response.json())
   .then(data => {
       L.geoJSON(data, {
           pointToLayer: (feature, latlng) => {
               const marker = L.marker(latlng, { icon: foodIcon });
               markers.push({ marker, feature });
               return marker;
           },
           onEachFeature: onEachFeature
       }).addTo(map);

       displaySidebarList(data);
   });

// Show namelist on the left, and add the click function to namelist
// Add click site to displaySidebarList
function displaySidebarList(geojsonData) {
    const siteList = document.querySelector('.site-list');
    siteList.innerHTML = '<h3>Site List</h3>';

    // Recover button below the title
    // Original mapview
    const initialCenter = [38.9072, -77.0369];
    const initialZoom = 13;
    // Create button
    const resetButton = document.createElement('button');
    resetButton.textContent = 'Original View';
    resetButton.classList.add('reset-button');
    resetButton.style.marginBottom = '10px';
    resetButton.style.display = 'block';
    
    resetButton.addEventListener('click', () => {
        map.setView(initialCenter, initialZoom);
        displaySidebarList(geojsonData);
    });

    siteList.appendChild(resetButton);

    geojsonData.features.forEach((feature, index) => {
        const { NAME, ADDRESS } = feature.properties;

        const siteItem = document.createElement('div');
        siteItem.classList.add('site-item');

        const siteName = document.createElement('h2');
        siteName.textContent = NAME;
        siteName.classList.add('site-name');
        siteItem.appendChild(siteName);

        const siteAddress = document.createElement('p');
        siteAddress.textContent = `Address: ${ADDRESS}`;
        siteAddress.classList.add('site-address');
        siteItem.appendChild(siteAddress);

        siteItem.addEventListener('click', () => {
            // Find the marker and zoom in
            const { marker } = markers[index];
            map.setView(marker.getLatLng(), 16);

            // Highlight
            marker.openTooltip();
            const highlightCircle = L.circleMarker(marker.getLatLng(), {
                radius: 30,
                color: 'red',
                weight: 2,
                fillOpacity: 0.1
            }).addTo(map);

            // Timer to remove highlight
            setTimeout(() => map.removeLayer(highlightCircle), 3000);
        });

        // Add site to list
        siteList.appendChild(siteItem);
    });
}

// Filter by Zip and name
const zipFilterButton = document.getElementById('zipFilterButton');
const nameFilterButton = document.getElementById('nameFilterButton');
const zipInput = document.getElementById('zipInput');
const nameInput = document.getElementById('nameInput');
const resetZipButton = document.getElementById('resetZipButton');
const resetNameButton = document.getElementById('resetNameButton');

// ZIP Code filter
zipFilterButton.addEventListener('click', () => {
    const zipCode = zipInput.value.trim();

    fetch('data/SummerMeals.geojson')
        .then(response => response.json())
        .then(data => {
            const filteredFeatures = data.features.filter(feature => {
                return feature.properties.ZIPCODE === zipCode;
            });

            // Clear current markers
            map.eachLayer(layer => {
                if (layer instanceof L.Marker) {
                    map.removeLayer(layer);
                }
            });

            // Add new markers for filtered features
            const geoJsonLayer = L.geoJSON(filteredFeatures, {
                pointToLayer: (feature, latlng) => L.marker(latlng, { icon: foodIcon }),
                onEachFeature: onEachFeature
            }).addTo(map);

            // Set the map view to the bounds of the filtered markers
            if (filteredFeatures.length > 0) {
                const group = new L.featureGroup(geoJsonLayer.getLayers());
                map.fitBounds(group.getBounds());
            }

            displaySidebarList({ features: filteredFeatures });
        });
});

// Reset zip
resetZipButton.addEventListener('click', () => {
    zipInput.value = '';

    fetch('data/SummerMeals.geojson')
        .then(response => response.json())
        .then(data => {
            // Clear current markers
            map.eachLayer(layer => {
                if (layer instanceof L.Marker) {
                    map.removeLayer(layer);
                }
            });

            L.geoJSON(data, {
                pointToLayer: (feature, latlng) => L.marker(latlng, { icon: foodIcon }),
                onEachFeature: onEachFeature
            }).addTo(map);

            displaySidebarList(data);

            map.setView(initialCenter, initialZoom);
        });
});

// Name filter
nameFilterButton.addEventListener('click', () => {
    const nameQuery = nameInput.value.trim().toLowerCase();

    fetch('data/SummerMeals.geojson')
        .then(response => response.json())
        .then(data => {
            const filteredFeatures = data.features.filter(feature => {
                return feature.properties.NAME.toLowerCase().includes(nameQuery);
            });

            map.eachLayer(layer => {
                if (layer instanceof L.Marker) {
                    map.removeLayer(layer);
                }
            });

            // Add new markers for filtered features
            const geoJsonLayer = L.geoJSON(filteredFeatures, {
                pointToLayer: (feature, latlng) => L.marker(latlng, { icon: foodIcon }),
                onEachFeature: onEachFeature
            }).addTo(map);

            // Set the map view to the bounds of the filtered markers
            if (filteredFeatures.length > 0) {
                const group = new L.featureGroup(geoJsonLayer.getLayers());
                map.fitBounds(group.getBounds());
            }

            displaySidebarList({ features: filteredFeatures });
        });
});

// Reset name
resetNameButton.addEventListener('click', () => {
    nameInput.value = '';

    fetch('data/SummerMeals.geojson')
        .then(response => response.json())
        .then(data => {
            // Clear current markers
            map.eachLayer(layer => {
                if (layer instanceof L.Marker) {
                    map.removeLayer(layer);
                }
            });

            L.geoJSON(data, {
                pointToLayer: (feature, latlng) => L.marker(latlng, { icon: foodIcon }),
                onEachFeature: onEachFeature
            }).addTo(map);

            displaySidebarList(data);

            map.setView(initialCenter, initialZoom);
        });
});

// Days Open Filter
const dayCheckboxes = document.querySelectorAll('.day-checkbox');

dayCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        const selectedDays = Array.from(dayCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);

        fetch('data/SummerMeals.geojson')
            .then(response => response.json())
            .then(data => {
                let filteredFeatures;
                
                if (selectedDays.length > 0) {
                    filteredFeatures = data.features.filter(feature => {
                        const daysOpen = feature.properties.DAYS_OPEN.split(',');
                        return selectedDays.some(day => daysOpen.includes(day));
                    });
                } else {
                    // Recover if non-selected
                    filteredFeatures = data.features;
                }

                map.eachLayer(layer => {
                    if (layer instanceof L.Marker) {
                        map.removeLayer(layer);
                    }
                });

                // Add filtered marker
                L.geoJSON(filteredFeatures, {
                    pointToLayer: (feature, latlng) => L.marker(latlng, { icon: foodIcon })
                }).addTo(map);

                displaySidebarList({ features: filteredFeatures });
            });
    });
});

// Meal Type Filter
const mealCheckboxes = document.querySelectorAll('.meal-checkbox');

mealCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        const selectedMealTypes = Array.from(mealCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);

        // Recover if non-selected
        if (selectedMealTypes.length === 0) {
            fetch('data/SummerMeals.geojson')
                .then(response => response.json())
                .then(data => {
                    // Remove current marker
                    map.eachLayer(layer => {
                        if (layer instanceof L.Marker) {
                            map.removeLayer(layer);
                        }
                    });
                    // Add current marker to map
                    L.geoJSON(data, {
                        pointToLayer: (feature, latlng) => L.marker(latlng, { icon: foodIcon }),
                        onEachFeature: onEachFeature
                    }).addTo(map);

                    displaySidebarList(data);
                });
        } else {
            // Filter meal type
            fetch('data/SummerMeals.geojson')
                .then(response => response.json())
                .then(data => {
                    const filteredFeatures = data.features.filter(feature => {
                        const mealTypes = feature.properties.MEAL_TYPES ? feature.properties.MEAL_TYPES.split(',') : [];
                        return selectedMealTypes.some(type => mealTypes.includes(type));
                    });
                    // Remove current marker
                    map.eachLayer(layer => {
                        if (layer instanceof L.Marker) {
                            map.removeLayer(layer);
                        }
                    });
                    // Add current marker to map
                    L.geoJSON(filteredFeatures, {
                        pointToLayer: (feature, latlng) => L.marker(latlng, { icon: foodIcon }),
                        onEachFeature: onEachFeature
                    }).addTo(map);

                    displaySidebarList({ features: filteredFeatures });
                });
        }
    });
});
