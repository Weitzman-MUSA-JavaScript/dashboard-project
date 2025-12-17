// ================= Global Config =================
const MAPBOX_TOKEN = 'pk.eyJ1IjoieHp5d2lzZGlsaSIsImEiOiJjbWZvODlrdmwwMzExMmxweGZmb285a202In0.AmX10MfI_c6jVFe5Uz8TeQ';
const PA_CENTER = [40.9, -77.5];
const INITIAL_ZOOM = 8;
let map;
let allFacilitiesData = [];
let layerGroups = {};

// Layer Configuration
const LAYERS_CONFIG = [
    { name: 'Hospitals', file: 'data/DOH_Hospitals202311.geojson', color: '#d63031', radius: 8, id: 'hospitals' },
    { name: 'Mental Health Centers', file: 'data/DOH_CommunityMentalHealthCenters202106.geojson', color: '#e67e22', radius: 7, id: 'MentalHealth' },
    { name: 'Intermediate Care', file: 'data/DOH_IntermediateCareFacilities202212.geojson', color: '#00cec9', radius: 6, id: 'InterCare' },
    { name: 'Home Health Agencies', file: 'data/DOH_HomeHealthAgencies202208.geojson', color: '#e84393', radius: 4, id: 'HomeHealth' }
];

const ICONS = {
    hospitals: L.icon({ iconUrl: 'img/hospital.svg', iconSize: [22, 22], iconAnchor: [11, 11] }),
    MentalHealth: L.icon({ iconUrl: 'img/mental.svg', iconSize: [28, 28], iconAnchor: [14, 14] }),
    InterCare: L.icon({ iconUrl: 'img/intermediate.svg', iconSize: [20, 20], iconAnchor: [10, 10] }),
    HomeHealth: L.icon({ iconUrl: 'img/homehealth.svg', iconSize: [13, 13], iconAnchor: [6, 6] }),
};

// ================= Helper Functions =================

// 1. Color Generator: Return color based on "facilities per 100k people"
// Red (Low) -> Yellow (Medium) -> Green (High)
function getDensityColor(d) {
    return d > 5  ? '#27ae60' : // Rich resources (Green)
           d > 3  ? '#2ecc71' :
           d > 2  ? '#f1c40f' : // Moderate resources (Yellow)
           d > 1  ? '#e67e22' :
           d > 0  ? '#e74c3c' : // Poor resources (Red)
                    '#bdc3c7';  // No data (Grey)
}

// 2. Name Normalization (Remove "County" suffix and convert to uppercase to ensure CSV and GeoJSON match)
function normalizeName(name) {
    if (!name) return "";
    return name.toUpperCase().replace(" COUNTY", "").trim();
}

// 3. Parse CSV (Simple Version)
function parseCSV(text) {
    const lines = text.split('\n');
    const result = {};
    // Skip header (first line), start from second line
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        // Assume CSV is comma-separated and format is fixed
        // Based on the provided glimpse, name is in the first column, population in the last
        // Note: If name contains commas, this simple split will fail, but county names usually don't
        const cols = line.split(','); 
        if (cols.length >= 2) {
            const name = normalizeName(cols[0]); // e.g., "ADAMS"
            const pop = parseInt(cols[cols.length - 1]); // Last column is population
            if (name && pop) {
                result[name] = pop;
            }
        }
    }
    return result;
}

// ================= Main Logic =================
let searchLayerGroup = L.layerGroup();

document.addEventListener('DOMContentLoaded', function() {
    map = L.map('map').setView(PA_CENTER, INITIAL_ZOOM);

    searchLayerGroup.addTo(map);

    // Dark base map
    L.tileLayer(
        `https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`,
        {tileSize: 512, zoomOffset: -1},
    ).addTo(map);

    // ------------------------------------------------------
    // New: Load and calculate county-level density map (Analysis Layer)
    // ------------------------------------------------------
    async function loadAnalysisLayer() {
        try {
            const [geoRes, popRes] = await Promise.all([
                fetch('data/PaCounty2025_10.geojson'),
                fetch('data/PA_population.csv')
            ]);

            const countyGeo = await geoRes.json();
            const popText = await popRes.text();
            const populationMap = parseCSV(popText);

            // ------------------------------------------------
            // Detailed Statistics
            // ------------------------------------------------
            const facilityCounts = {};

            allFacilitiesData.forEach(facility => {
                const cName = normalizeName(facility.county);
                if (!cName) return;

                // Initialize the data structure for this county.
                if (!facilityCounts[cName]) {
                    facilityCounts[cName] = { 
                        total: 0, 
                        hospitals: 0, 
                        MentalHealth: 0, 
                        InterCare: 0, 
                        HomeHealth: 0 
                    };
                }

                facilityCounts[cName].total += 1;
                
                if (facility.type === 'Hospitals') facilityCounts[cName].hospitals++;
                else if (facility.type === 'Mental Health Centers') facilityCounts[cName].MentalHealth++;
                else if (facility.type === 'Intermediate Care') facilityCounts[cName].InterCare++;
                else if (facility.type === 'Home Health Agencies') facilityCounts[cName].HomeHealth++;
            });

            // ------------------------------------------------
            // Initialize the GeoJSON layer
            // ------------------------------------------------
            const analysisLayer = L.geoJSON(countyGeo, {
                style: {
                    weight: 1,
                    color: '#fff',
                    fillOpacity: 0.6
                },
                onEachFeature: function(feature, layer) {
                    // 绑定基础事件
                    layer.on({
                        mouseover: function(e) {
                            var l = e.target;
                            l.setStyle({ weight: 3, color: '#666' });
                            l.bringToFront();
                        },
                        mouseout: function(e) {
                            analysisLayer.resetStyle(e.target);
                            updateSingleLayer(layer, currentMode); 
                        }
                    });
                }
            }).addTo(map);

            // Core Update Logic
            let currentMode = 'total'; 

            function getGeoName(props) {
                return normalizeName(props.COUNTY_NAM);
            }

            // Update the style and pop-up window of a single layer.
            function updateSingleLayer(layer, mode) {
                const geoName = getGeoName(layer.feature.properties);
                const pop = populationMap[geoName] || 0;
                const countsObj = facilityCounts[geoName] || { total:0 };
                
                // Get the quantity based on the pattern.
                let count = 0;
                if (mode === 'total') count = countsObj.total;
                else count = countsObj[mode] || 0; // hospitals, etc.

                // Calculate ratios
                let ratio = 0;
                if (pop > 0) ratio = (count / pop) * 100000;

                // Update colors
                if (mode === 'none') {
                    layer.setStyle({ fillOpacity: 0, weight: 0 });
                } else {
                    layer.setStyle({ 
                        fillColor: getDensityColor(ratio), 
                        fillOpacity: 0.6,
                        weight: 1,
                        color: 'white'
                    });
                }

                // Update Popup Content
                const ratioFixed = ratio.toFixed(2);
                const modeLabel = mode === 'total' ? 'Total Facilities' : mode;
                
                const content = `
                    <div style="min-width:160px">
                        <h3>${geoName || 'Unknown'}</h3>
                        <hr style="margin:5px 0; border:0; border-top:1px solid #ccc;">
                        <div style="display:flex; justify-content:space-between;">
                            <span>Population:</span> <strong>${pop.toLocaleString()}</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between;">
                            <span>${modeLabel}:</span> <strong>${count}</strong>
                        </div>
                        <div style="margin-top:8px; padding-top:5px; border-top:1px dashed #eee; color:${getDensityColor(ratio)}">
                            <strong style="font-size:14px">${ratioFixed}</strong> per 100k people
                        </div>
                    </div>
                `;
                layer.bindPopup(content);
            }

            // Update the map
            function updateMap(mode) {
                currentMode = mode;
                analysisLayer.eachLayer(layer => {
                    updateSingleLayer(layer, mode);
                });
            }

            // ------------------------------------------------
            // Create a custom top horizontal control.
            // ------------------------------------------------
            const barContainer = document.createElement('div');
            barContainer.className = 'density-control-bar';

            L.DomEvent.disableClickPropagation(barContainer);
            L.DomEvent.disableScrollPropagation(barContainer);

            const label = document.createElement('span');
            label.className = 'density-label';
            label.innerText = "Density Analysis:";
            barContainer.appendChild(label);

            const buttons = [
                { label: 'Off', mode: 'none' },
                { label: 'All', mode: 'total' },
                { label: 'Hospitals', mode: 'hospitals' },
                { label: 'Mental Health', mode: 'MentalHealth' },
                { label: 'Inter. Care', mode: 'InterCare' },
                { label: 'Home Health', mode: 'HomeHealth' }
            ];

            buttons.forEach(btn => {
                const b = document.createElement('div');
                b.className = 'density-btn';
                b.innerText = btn.label;
                
                // 默认选中 All
                if (btn.mode === 'total') b.classList.add('active');

                b.onclick = () => {
                    barContainer.querySelectorAll('.density-btn').forEach(el => el.classList.remove('active'));
                    b.classList.add('active');
                    updateMap(btn.mode);
                };
                barContainer.appendChild(b);
            });

            map.getContainer().appendChild(barContainer);

            // map.addControl(new AnalysisControl());
            updateMap('total');
            
        } catch (e) {
            console.error("Error creating analysis UI:", e);
        }
    }


    // ================= Original Data Loading Logic =================
    function getProps(feature) {
        const p = feature.properties;
        return {
            name: p.FACILITY_N || 'Unknown Facility',
            city: p.CITY || p.CITY_OR_BO || '', 
            county: p.COUNTY || '', // Ensure COUNTY field exists here
            street: p.STREET || '',
            phone: p.TELEPHONE || p.TELEPHONE_ || 'N/A'
        };
    }

    function renderList(data) {
        const list = document.getElementById('facility-list');
        list.innerHTML = ''; 
        if (data.length === 0) { list.innerHTML = '<li style="padding:10px; color:#999;">No results</li>'; return; }
        const displayData = data.slice(0, 50); 
        displayData.forEach(item => {
            const li = document.createElement('li');
            li.className = 'facility-item';
            li.innerHTML = `<div class="facility-name">${item.name}</div><div class="facility-address">${item.street}, ${item.city}</div><span class="facility-tag" style="background-color: ${item.color}">${item.type}</span>`;
            li.addEventListener('click', () => { map.flyTo(item.latlng, 15); item.layer.openPopup(); });
            list.appendChild(li);
        });
    }

    async function loadData() {
        // ... (Keep your previous loadData logic until loop ends) ...
        const legendContainer = document.getElementById('legend-content');
        
        for (const config of LAYERS_CONFIG) {
            try {
                const response = await fetch(config.file);
                const data = await response.json();
                
                // Suggest using the markerClusterGroup logic taught earlier, or plain GeoJSON
                const layer = L.geoJSON(data, {
                    pointToLayer: function (feature, latlng) {
                        const icon = ICONS[config.id];
                        if (icon) return L.marker(latlng, {icon: icon});
                        return L.circleMarker(latlng);
                    },
                    onEachFeature: function (feature, layer) {
                        const info = getProps(feature);
                        const popupContent = `<div style="font-family: sans-serif;"><h3 style="margin:0 0 5px; color:${config.color}">${info.name}</h3><strong>Type:</strong> ${config.name}<br><strong>Address:</strong> ${info.street}, ${info.city}<br><strong>Phone:</strong> ${info.phone}</div>`;
                        layer.bindPopup(popupContent);
                        
                        if (layer.getLatLng) {
                            allFacilitiesData.push({
                                name: info.name,
                                street: info.street,
                                city: info.city,
                                county: info.county, // Critical: Must save County for later statistics
                                type: config.name,
                                color: config.color,
                                latlng: layer.getLatLng(),
                                layer: layer
                            });
                        }
                    }
                }).addTo(map);
                
                layerGroups[config.id] = layer; // Save for Layer Control use

                // Legend generation code remains unchanged...
                const item = document.createElement('div');
                item.className = 'legend-item';
                const icon = ICONS[config.id];
                item.innerHTML = `<img src="${icon.options.iconUrl}" class="legend-icon-img"> <span>${config.name}</span>`;
                item.addEventListener('click', () => {
                   if(map.hasLayer(layer)){ map.removeLayer(layer); item.style.opacity='0.5'; }
                   else { map.addLayer(layer); item.style.opacity='1'; }
                });
                legendContainer.appendChild(item);

            } catch (error) { console.error(error); }
        }

        renderList(allFacilitiesData);

        // ★★★ Critical: Start analysis layer after all point data is loaded ★★★
        loadAnalysisLayer();
    }

    loadData();

    
    const searchInput = document.getElementById('search-input');

    searchInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            const query = e.target.value;
            if (query.length > 3) {
                await searchByAddress(query);
            }
        }
    });

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        if (term === '') {
            searchLayerGroup.clearLayers();
            renderList(allFacilitiesData);
            return;
        }
        
        const filtered = allFacilitiesData.filter(d => 
            d.name.toLowerCase().includes(term) || 
            d.street.toLowerCase().includes(term)
        );
        renderList(filtered);
    });

    async function searchByAddress(address) {
        searchInput.placeholder = "Searching location...";

        try {
            const bbox = "-80.519891,39.7198,-74.689516,42.516072"; 
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}&bbox=${bbox}&limit=1`;

            const res = await fetch(url);
            const data = await res.json();

            if (data.features && data.features.length > 0) {
                const result = data.features[0];
                const [lon, lat] = result.center;
                const userLocation = L.latLng(lat, lon);

                searchLayerGroup.clearLayers();

                L.marker(userLocation)
                 .bindPopup(`<b>Search Location:</b><br>${result.place_name}`)
                 .addTo(searchLayerGroup)
                 .openPopup();

                // Search for 10 km
                const radiusMeters = 10000; 
                L.circle(userLocation, {
                    color: '#3498db',
                    fillColor: '#3498db',
                    fillOpacity: 0.1,
                    radius: radiusMeters
                }).addTo(searchLayerGroup);

                const nearbyFacilities = allFacilitiesData.filter(facility => {
                    const dist = userLocation.distanceTo(facility.latlng);
                    return dist <= radiusMeters;
                });

                renderList(nearbyFacilities);
                
                map.flyTo(userLocation, 11);

                console.log(`Found ${nearbyFacilities.length} facilities within 10km.`);
                
            } else {
                alert("Location not found in PA. Please try a more specific address.");
            }
        } catch (err) {
            console.error("Geocoding error:", err);
            alert("Search failed: " + err.message);
        } finally {
            searchInput.placeholder = "Search name or address...";
        }
    }

    document.getElementById('reset-view').addEventListener('click', () => {
        map.setView(PA_CENTER, INITIAL_ZOOM);
        searchLayerGroup.clearLayers();
        searchInput.value = '';
        renderList(allFacilitiesData);
    });
});