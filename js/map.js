import * as turf from 'https://cdn.jsdelivr.net/npm/@turf/turf@7.1.0/+esm';

/**
* Initialize the Leaflet map with base layers and controls
* @param {HTMLElement} mapElement - DOM element to attach the map to
*/
async function initMap(mapElement, initialData) {
    // Initialize the Leaflet map
    map = L.map(mapElement, {
        center: [39.95, -75.19], // Philadelphia coordinates
        zoom: 10,
    });
    
    // Add base tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);
    
    // Load initial data  
    const initialLayer = L.geoJSON(initialData, {
        style: standardStyle,
    });
    initialLayer.addTo(map);
    map.fitBounds(initialLayer.getBounds());
    
    // Add legend
    var legend = L.control({position: 'bottomright'});
    
    legend.onAdd = function (map) {
        
        var div = L.DomUtil.create('div', 'info legend'),
        grades = ['Eliminated', 'Shortened', 'Remaining'],
        labels = [];
        div.innerHTML += '<b>Route status</b><br><br>';
        
        // loop through and generate a label with a colored square for each interval
        for (var i = 0; i < grades.length; i++) {
            div.innerHTML +=
            '<i style="background:' + getColor(grades[i]) + '"></i> ' +
            grades[i] + '<br>';
        }
        
        return div;
    };
    
    legend.addTo(map);
    
    return map;
}

/**
* Defines colors to be used on the map.
* @param {string} category The feature attribute relevant for determining color.
* @return {function} Function specifying color to use.
*/
function getColor(category) {
    return category === 'Eliminated' ? '#800026' :
    category === 'Shortened' ? '#e3ae0cff' :
    category === 'Remaining' ? '#9b9696ff' :
    '#FFFFFF';
}

/**
* Defines default options for styling features.
* @param {string} feature The geojson feature.
* @return {function} Function specifying color to use.
*/
function standardStyle(feature) {
    return {
        color: getColor(feature.properties.cut_status),
        colorOpacity: 0.5,
        weight: 1,
    };
}

/**
* Overlay opaque mask depending on user's district.
* @param {EventTarget} events The event bus used to communicate between app components.
*/
function overlayMask(events) {
    // Get geometry of user's district from events bus
    events.addEventListener('districtData', async (event) => {
        const district = event.detail;
        // Created inverted polygon of district
        const invertedDistrict = turf.mask(district);
        // Add district mask to map
        L.geoJSON(invertedDistrict, {
            style: function () {
                return {
                    fillOpacity: 0.6,
                    color: '#a8a8a8ff',
                    weight: 1,
                };
            }
        }).addTo(map);
        // Fit map to bounds of user's district
        map.fitBounds(L.geoJSON(district).getBounds());

    });

}

export { initMap, overlayMask };