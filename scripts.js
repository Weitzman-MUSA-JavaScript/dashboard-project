/* global L */

document.addEventListener('DOMContentLoaded', function() {
    var map = L.map('map').setView([44.260111, -72.575412], 15);

    const baseTileLayer = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}.png', {
        maxZoom: 16,
        attribution: '&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://stamen.com/" target="_blank">Stamen Design</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
    });
    baseTileLayer.addTo(map);

    var architectureLayer, shadowLayer, luLineLayer, inundationLayer, parcelLayer; 

    const inundationLayers = {};
    const parcelLayers = {};

    for (let level = 515; level <= 526; level++) {
        fetch(`data/water_${level}.geojson`)
            .then(response => response.json())
            .then(data => {
                inundationLayers[level] = L.geoJSON(data, {
                    style: {
                        color: "#73B2FF",
                        fillColor: '#73B2FF',
                        weight: 0,
                        fillOpacity: 0.6,
                    }
                });
            });

        fetch(`data/parcel_${level}.geojson`)
            .then(response => response.json())
            .then(data => {
                parcelLayers[level] = L.geoJSON(data, {
                    style: {
                        color: '#A80000',
                        fillColor: 'transparent',
                        weight: 1,
                        fillOpacity: 1
                    },
                    onEachFeature: function (feature, layer) {
                        layer.on('click', function () {
                            displayParcelInfo(feature);
                        });

                        layer.on('mouseover', function () {
                            const owner = feature.properties.OWNER1 || "Unknown";
                            const landuse = feature.properties.CAT || "Unknown Land Use Type";
                            const address = feature.properties.E911ADDR || "No address available";
                            const value = feature.properties.REAL_FLV ? `$${(feature.properties.REAL_FLV / 1000000).toFixed(2)}M` : "$0";

                            const tooltipContent = `
                                <strong>Owner:</strong> ${owner}<br>
                                <strong>Land Use Category:</strong> ${landuse}<br>
                                <strong>Address:</strong> ${address}<br>
                                <strong>Total Listed Value:</strong> ${value}
                            `;

                            layer.bindTooltip(tooltipContent, {
                                sticky: true,
                                direction: 'top',
                                opacity: 0.8,
                            }).openTooltip();
                        });
                    }
                });
            });
    }

    fetch('data/bf_shadow.geojson')
        .then(response => response.json())
        .then(data => {
            shadowLayer = L.geoJSON(data, {
                style: {
                    color: 'black',
                    fillColor: 'black',
                    weight: 0,
                    fillOpacity: 0.4
                }
            }).addTo(map); 
        });

        fetch('data/lu_line2.geojson')
        .then(response => response.json())
        .then(data => {
            luLineLayer = L.geoJSON(data, {
                style: {
                    color: 'grey',
                    fillColor: 'transparent',
                    weight: 0.4,
                    fillOpacity: 1
                },
                onEachFeature: function (feature, layer) {
                    layer.on('click', function () {
                        displayParcelInfo(feature); 
                    });
    
                    layer.on('mouseover', function () {
                        const owner = feature.properties.OWNER1 || "Unknown";
                        const landuse = feature.properties.CAT || "Unknown Land Use Type";
                        const address = feature.properties.E911ADDR || "No address available";
                        const value = feature.properties.REAL_FLV ? `$${(feature.properties.REAL_FLV / 1000000).toFixed(2)}M` : "$0";
    
                        const tooltipContent = `
                            <strong>Owner:</strong> ${owner}<br>
                            <strong>Land Use Category:</strong> ${landuse}<br>
                            <strong>Address:</strong> ${address}<br>
                            <strong>Total Listed Value:</strong> ${value}
                        `;
    
                        layer.bindTooltip(tooltipContent, {
                            sticky: true,
                            direction: 'top',
                            opacity: 0.8,
                        }).openTooltip();
                    });
                }
            }).addTo(map); 
        });

    fetch('data/bf.geojson')
        .then(response => response.json())
        .then(data => {
            architectureLayer = L.geoJSON(data, {
                style: {
                    color: 'black',
                    fillColor: 'white',
                    weight: 0.4,
                    fillOpacity: 1
                }
            }).addTo(map); 
        });

    const levelToYear = {
        526: "High water mark from flood on 07-11-2023.",
        525: "High water mark from 1992 ice jam flood.",
        522: "High water mark from flood on 05-27-2011. Center line of State Street in front of federal building/post office will be flooded.",
        521: "High water mark from flood on 08-29-2011.",
        520: "High water mark from flood on 01-13-2018. Street flooding in Montpelier. Low spot in federal building parking lot will be flooded.",
        519: "High water mark from flood on 12-18-2023, 07-11-2024.",
        515: "Cellar flooding begins. Equivalent of 7.5 ft mark on Langdon Street bridge."
    };

    var slider = document.getElementById('water-level-slider');
    slider.min = 515;
    slider.max = 526;
    slider.step = 1;
    slider.value = 515; 

    updateInundationLayer(515);
    updateSliderValue(515);

    slider.addEventListener('input', function () {
        var waterLevel = parseInt(slider.value);
        updateInundationLayer(waterLevel);
        updateSliderValue(waterLevel);
    });

    function updateSliderValue(level) {
        document.getElementById('current-level').textContent = level;

        let yearInfo = levelToYear[level] ? `${levelToYear[level]}` : "Unknown.";
        document.getElementById('corresponding-year').textContent = yearInfo;

        updateStatistics(level);
    }

    function updateInundationLayer(level) {
        if (inundationLayer) {
            map.removeLayer(inundationLayer);
        }
        if (parcelLayer) {
            map.removeLayer(parcelLayer);
        }

        if (parcelLayers[level]) {
            parcelLayer = parcelLayers[level].addTo(map);
        }

        if (luLineLayer) {
            map.addLayer(luLineLayer); 
        }

        if (shadowLayer) {
            map.addLayer(shadowLayer); 
        }

        if (inundationLayers[level]) {
            inundationLayer = inundationLayers[level].addTo(map);
        }

        if (architectureLayer) {
            map.addLayer(architectureLayer); 
        }
    }

    function updateStatistics(level) {
        if (parcelLayers[level]) {
            var inundatedFeatures = parcelLayers[level].toGeoJSON().features;
            var inundatedCount = inundatedFeatures.length;
            var totalValue = inundatedFeatures.reduce((acc, feature) => acc + feature.properties.REAL_FLV, 0);

            document.getElementById('inundated-parcels').textContent = `${inundatedCount}`;
            document.getElementById('total-value').textContent = `$${(totalValue / 1000000).toFixed(2)}M`;
        } else {
            document.getElementById('inundated-parcels').textContent = "0";
            document.getElementById('total-value').textContent = "$0";
        }
    }

    function displayParcelInfo(feature) {
        const properties = feature.properties;
    
        function formatToMillions(value) {
            if (!value || value === 0) {
                return "$0M";
            }
            return `$${(value / 1000000).toFixed(2)}M`;
        }
    
        let tableHTML = `
            <table border="1" cellspacing="0" cellpadding="5" style="width: 100%; border-collapse: collapse; font-size: 0.9em;">
                <thead>
                    <tr>
                        <th>Attribute</th>
                        <th>Value</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td>Owner</td><td>${properties.OWNER1 || "Unknown"}</td></tr>
                    <tr><td>Description</td><td>${properties.DESCPROP || "No description available"}</td></tr>
                    <tr><td>Land Use Category</td><td>${properties.CAT || "Unknown Land Use Type"}</td></tr>
                    <tr><td>Address</td><td>${properties.E911ADDR || "No address available"}</td></tr>
                    <tr><td>Total Listed Value</td><td>${formatToMillions(properties.REAL_FLV)}</td></tr>
                    <tr><td>Homestead Listed Value</td><td>${formatToMillions(properties.HSTED_FLV)}</td></tr>
                    <tr><td>Nonresidential Listed Value</td><td>${formatToMillions(properties.NRES_FLV)}</td></tr>
                    <tr><td>Land Listed Value</td><td>${formatToMillions(properties.LAND_LV)}</td></tr>
                    <tr><td>Improvement Value</td><td>${formatToMillions(properties.IMPRV_LV)}</td></tr>
                    <tr><td>Will Be Inundated at Water Level: </td><td>${getInundationLevels(properties)}</td></tr>
                </tbody>
            </table>
        `;
    
        document.getElementById('parcel-info-table').innerHTML = tableHTML;
    }

    function getInundationLevels(properties) {
        let inundationLevels = [];
        
        for (let level = 515; level <= 526; level++) {
            if (parcelLayers[level]) {
                const parcelFeature = parcelLayers[level].toGeoJSON().features.find(feature => feature.properties.PARCID === properties.PARCID);
                if (parcelFeature) {
                    inundationLevels.push(level);
                }
            }
        }
    
        if (inundationLevels.length > 0) {
            return `${Math.min(...inundationLevels)} ft`;  
        } else {
            return "Not inundated at any recorded level."; 
        }
    }
});
