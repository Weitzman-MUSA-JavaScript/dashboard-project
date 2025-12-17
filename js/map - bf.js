// Map Setup centered on Pennsylvania
const PA_CENTER = [40.9, -77.5];
const INITIAL_ZOOM = 7;
let map;
let allFacilitiesData = [];

// Wait for the DOM to be fully loaded before initializing the map
document.addEventListener('DOMContentLoaded', function() {
	const map = L.map('map').setView(PA_CENTER, INITIAL_ZOOM);

	L.tileLayer(
		'https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoieHp5d2lzZGlsaSIsImEiOiJjbWZvODlrdmwwMzExMmxweGZmb285a202In0.AmX10MfI_c6jVFe5Uz8TeQ',
		{tileSize: 512, zoomOffset: -1},
	).addTo(map);

	// Layer Configuration
	// Define color, size (radius), and file path for each type
	const LAYERS_CONFIG = [
		{
			name: 'Hospitals',
			file: 'data/DOH_Hospitals202311.geojson',
			color: '#d63031',
			radius: 8,
			id: 'hospitals',
		},
		{
			name: 'Mental Health Centers',
			file: 'data/DOH_CommunityMentalHealthCenters202106.geojson',
			color: '#e67e22',
			radius: 7,
			id: 'MentalHealth',
		},
		{
			name: 'Intermediate Care',
			file: 'data/DOH_IntermediateCareFacilities202212.geojson',
			color: '#9cb6d7',
			radius: 6,
			id: 'InterCare',
		},
		{
			name: 'Home Health Agencies',
			file: 'data/DOH_HomeHealthAgencies202208.geojson',
			color: '#9cb6d7',
			radius: 4, 
			id: 'HomeHealth',
		}
	];

	// Custom Icons
	const ICONS = {
		hospitals: L.icon({
			iconUrl: 'img/hospital.svg',
			iconSize: [22, 22],
			iconAnchor: [14, 28],
		}),
		MentalHealth: L.icon({
			iconUrl: 'img/mental.svg',
			iconSize: [28, 28],
			iconAnchor: [14, 28],
		}),
		InterCare: L.icon({
			iconUrl: 'img/intermediate.svg',
			iconSize: [20, 20],
			iconAnchor: [14, 28],
		}),
		HomeHealth: L.icon({
			iconUrl: 'img/homehealth.svg',
			iconSize: [13, 13],
			iconAnchor: [14, 28],
		}),
	};

	// Helper function: Clean up dirty data
    function getProps(feature) {
        const p = feature.properties;
        return {
            name: p.FACILITY_N || 'Unknown Facility',
            city: p.CITY || p.CITY_OR_BO || '', 
            county: p.COUNTY || '',
            street: p.STREET || '',
            phone: p.TELEPHONE || p.TELEPHONE_ || 'N/A'
        };
    }

    // Render list function
    function renderList(data) {
        const list = document.getElementById('facility-list');
        list.innerHTML = ''; 

        // Display the number of search results
        if (data.length === 0) {
            list.innerHTML = '<li style="padding:10px; color:#999; text-align:center">No results</li>';
            return;
        }

        // Performance optimization
        const displayData = data.slice(0, 50); 

        displayData.forEach(item => {
            const li = document.createElement('li');
            li.className = 'facility-item';
            li.innerHTML = `
                <div class="facility-name">${item.name}</div>
                <div class="facility-address">${item.street}, ${item.city}</div>
                <span class="facility-tag" style="background-color: ${item.color}">${item.type}</span>
            `;
            li.addEventListener('click', () => {
                map.flyTo(item.latlng, 15);
                item.layer.openPopup();
            });
            list.appendChild(li);
        });
    }

    // Search Listening
    document.getElementById('search-input').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allFacilitiesData.filter(d => 
            d.name.toLowerCase().includes(term) || 
            d.street.toLowerCase().includes(term)
        );
        renderList(filtered);
    });

    // Reset Button
    document.getElementById('reset-view').addEventListener('click', () => {
        map.setView(PA_CENTER, INITIAL_ZOOM);
    });

    // Main loading function
    async function loadData() {
        const legendContainer = document.getElementById('legend-content');
        
        for (const config of LAYERS_CONFIG) {
            try {
                const response = await fetch(config.file);
                const data = await response.json();

                const layer = L.geoJSON(data, {
                    pointToLayer: function (feature, latlng) {
                        const icon = ICONS[config.id];
                        if (icon) return L.marker(latlng, {icon: icon});
                        return L.circleMarker(latlng, {
                            radius: config.radius,
                            fillColor: config.color,
                            color: '#fff',
                            weight: 1,
                            opacity: 1,
                            fillOpacity: 0.7
                        });
                    },
                    onEachFeature: function (feature, layer) {
                        const info = getProps(feature);

                        const popupContent = `
                            <div style="font-family: sans-serif;">
                                <h3 style="margin:0 0 5px; color:${config.color}">${info.name}</h3>
                                <strong>Type:</strong> ${config.name}<br>
                                <strong>Address:</strong> ${info.street}, ${info.city}<br>
                                <strong>Phone:</strong> ${info.phone}
                            </div>
                        `;
                        layer.bindPopup(popupContent);
                        
                        // Store global data for use by the list.
                        if (layer.getLatLng) {
                            allFacilitiesData.push({
                                name: info.name,
                                street: info.street,
                                city: info.city,
                                type: config.name,
                                color: config.color,
                                latlng: layer.getLatLng(),
                                layer: layer
                            });
                        }
                    }
                }).addTo(map);

                // Generate Legend
                const item = document.createElement('div');
                item.className = 'legend-item';
                const icon = ICONS[config.id];
                item.innerHTML = icon
                    ? `<img src="${icon.options.iconUrl}" class="legend-icon-img"> <span>${config.name}</span>`
                    : `<div class="legend-icon" style="background-color: ${config.color}"></div><span>${config.name}</span>`;
                
                item.addEventListener('click', () => {
                    if (map.hasLayer(layer)) {
                        map.removeLayer(layer);
                        item.style.opacity = '0.5';
                    } else {
                        map.addLayer(layer);
                        item.style.opacity = '1';
                    }
                });
                legendContainer.appendChild(item);

            } catch (error) {
                console.error(`Error loading ${config.name}:`, error);
            }
        }

        // After all data is loaded, render the list
        console.log("Total facilities loaded:", allFacilitiesData.length);
        renderList(allFacilitiesData);
    }

    loadData();
});