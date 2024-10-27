d3.csv('data/workforce_training_cleaned.csv').then(function (data) {

    var geojson = {
        type: "FeatureCollection",
        features: data.map(function (d, index) {
            var organizationType = (d["Organization Type"] || "Unknown").trim();

            return {
                type: "Feature",
                id: d.org_id || index,
                geometry: {
                    type: "Point",
                    coordinates: [parseFloat(d.geo_lon), parseFloat(d.geo_lat)]
                },
                properties: {
                    org_name: d.org_name,
                    org_address: d.org_address,
                    organization_type: organizationType,
                    state: d.state
                }
            };
        }).filter(function (d) {
            return d.geometry.coordinates.every(coord => !isNaN(coord)) && d.properties.organization_type !== "NA";
        })
    };

    var organizationTypeColors = {
        "Non-profit organization": "#7F5A83",
        "Higher education institution": "#E8D0A9",
        "Registered apprenticeship": "#01B3CA",
        "WIOA-eligible": "#76A08A",
        "Multiple types": "#E06D10",
        "Unknown": "#C34121",
        "default": "#3FB1CE"
    };

    map.on('load', function () {
        map.addSource('workforceTrainingData', {
            'type': 'geojson',
            'data': geojson
        });

        map.addLayer({
            'id': 'workforce-points',
            'type': 'circle',
            'source': 'workforceTrainingData',
            'paint': {
                'circle-color': [
                    'match',
                    ['get', 'organization_type'],
                    'Non-profit organization', organizationTypeColors['Non-profit organization'],
                    'Higher education institution', organizationTypeColors['Higher education institution'],
                    'Registered apprenticeship', organizationTypeColors['Registered apprenticeship'],
                    'WIOA-eligible', organizationTypeColors['WIOA-eligible'],
                    'Multiple types', organizationTypeColors['Multiple types'],
                    'Unknown', organizationTypeColors['Unknown'],
                    organizationTypeColors['default']
                ],
                'circle-radius': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false], 6,
                    4
                ]
            }
        });

        var popup = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false
        });

        var hoveredStateId = null;

        map.on('mouseenter', 'workforce-points', function (e) {
            map.getCanvas().style.cursor = 'pointer';

            var features = map.queryRenderedFeatures(e.point, {
                layers: ['workforce-points']
            });

            if (!features.length) {
                return;
            }

            var feature = features[0];

            if (hoveredStateId !== null) {
                map.setFeatureState({ source: 'workforceTrainingData', id: hoveredStateId }, { hover: false });
            }
            hoveredStateId = feature.id;
            map.setFeatureState({ source: 'workforceTrainingData', id: hoveredStateId }, { hover: true });
            

            var coordinates = feature.geometry.coordinates.slice();
            var orgName = feature.properties.org_name;
            var orgAddress = feature.properties.org_address;
            var orgType = feature.properties.organization_type;

            // Retrieve the color for the organization type
            var orgTypeColor = organizationTypeColors[orgType] || organizationTypeColors["default"];

            // Tooltip contents with a dot before the organization type
            var popupContent = `<div style="font-family: 'Source Code Pro', monospace;">
                <h4>${orgName}</h4>
                <p>Address:<br>${orgAddress}</p>
                <p>Organization Type:<br><span style="display:inline-block; width:10px; height:10px; background-color:${orgTypeColor}; border-radius:50%; margin-right:5px;"></span>${orgType}</p>
            </div>`;

            // Add the tooltip to the map
            popup
                .setLngLat(coordinates)
                .setHTML(popupContent)
                .addTo(map);
        });

        map.on('mouseleave', 'workforce-points', function () {
            map.getCanvas().style.cursor = '';
            popup.remove();

            if (hoveredStateId !== null) {
                map.setFeatureState({ source: 'workforceTrainingData', id: hoveredStateId }, { hover: false });
            }
            hoveredStateId = null;
        });

        var checkboxes = document.querySelectorAll('#organization-types input[type=checkbox]');
        checkboxes.forEach(function (checkbox) {
            checkbox.addEventListener('change', filterPoints);
        });

        function filterPoints() {
            var selectedTypes = Array.from(checkboxes)
                .filter(function (checkbox) {
                    return checkbox.checked;
                })
                .map(function (checkbox) {
                    return checkbox.value;
                });

            if (selectedTypes.length === 0) {
                map.setFilter('workforce-points', null);
            } else {
                map.setFilter('workforce-points', ['in', ['get', 'organization_type'], ['literal', selectedTypes]]);
            }
        }
    });
});



//////////////////////////////////////////////////////////////////////////////////////////////////


// Load the state boundaries GeoJSON data
const stateBoundariesUrl = 'data/us_state_boundary.json';

map.on('load', function () {
    // Fetch the GeoJSON and assign unique IDs to each feature
    fetch(stateBoundariesUrl)
        .then(response => response.json())
        .then(data => {
            data.features.forEach((feature, i) => {
                feature.id = i;
            });

            // Add the state boundaries source
            map.addSource('stateBoundaries', {
                'type': 'geojson',
                'data': data
            });

            // Add a layer to show the state boundaries
            map.addLayer({
                'id': 'state-boundaries',
                'type': 'line',
                'source': 'stateBoundaries',
                'paint': {
                    'line-color': '#F1FAEE',
                    'line-width': 0.9
                }
            });

            // Add a fill layer to highlight the selected state
            map.addLayer({
                'id': 'highlighted-state',
                'type': 'fill',
                'source': 'stateBoundaries',
                'layout': {},
                'paint': {
                    'fill-color': '#FFDAB9',
                    'fill-opacity': 0.2
                },
                'filter': ['==', 'NAME', ''] 
            });

            map.setLayoutProperty('state-boundaries', 'visibility');
        });
});

// Load the ACS data for displaying state information
d3.csv('data/acs_data_cleaned.csv').then(function (dataset) {
    document.getElementById('stateDropdown').addEventListener('change', function () {
        const selectedState = this.value;

        map.setLayoutProperty('state-boundaries', 'visibility', 'visible');

        map.setFilter('highlighted-state', ['==', 'NAME', selectedState]);

        fetch(stateBoundariesUrl)
            .then(response => response.json())
            .then(data => {
                const stateFeature = data.features.find(feature => feature.properties.NAME === selectedState);
                
                if (stateFeature) {
                    const stateBounds = turf.bbox(stateFeature);
                    const center = [(stateBounds[0] + stateBounds[2]) / 2, (stateBounds[1] + stateBounds[3]) / 2];

                    // Pan and zoom to the selected state's center
                    map.easeTo({
                        center: center,
                        zoom: 6, 
                        duration: 1000, 
                        padding: { top: 50, bottom: 50, left: 60, right: 50 } 
                    });
                } else {
                    console.error(`State ${selectedState} not found in the geojson data.`);
                }
            });

        displayStateInfo(selectedState, dataset);
    });
});

function displayStateInfo(stateName, dataset) {
    const stateData = dataset.find(state => state.State === stateName);

    if (!stateData) {
        console.error(`State data not found for ${stateName}`);
        return;
    }

    const stateInfoHtml = `
        <h3 style="font-family: 'Source Code Pro', monospace;">| ${stateData.State}</h3>
        <p>Total population <span class="state-value">${stateData['Total population']}</span></p>
        <p>Per Capita Personal Income <span class="state-value">${stateData['Per Capita Personal Income']}</span></p>
        <p>Unemployment rate <span class="state-value">${stateData['Unemployment rate']}</span></p>
        <p>Poverty rate <span class="state-value">${stateData['Poverty rate']}</span></p>
        <p>Population identified as POC <span class="state-value">${stateData['Population identified as POC']}</span></p>
        <p>Population with less than Bachelor's degree <span class="state-value">${stateData['Population with less than Bachelor\'s degree']}</span></p>
        
    `;

    document.getElementById('state-info').innerHTML = stateInfoHtml;
}

function scrollToSection() {
    document.getElementById('about-section').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

