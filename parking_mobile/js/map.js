//call in filter function
import { initializeFilter } from "./spots_filter.js";
import { isSpotAvailable, reserveSpot } from './spot_reservation.js';

//call empty values for spotLayer
let spotsLayer = null;

function getSpotsLayer(){
    return spotsLayer;
}

//create function initmap that calls in map and spots data

function initMap(el, spots) {
    console.log("Initializing map...");

    const map = L.map(el, { preferCanvas: true, zoomSnap: 0 });

    const Mapboxkey = 'pk.eyJ1IjoiYWF2YW5pMTAzIiwiYSI6ImNtMTgxOGkyZzBvYnQyam16bXFydTUwM3QifQ.hXw8FwWysnOw3It_Sms3UQ';
    const Mapboxstyle = 'mapbox/dark-v11';
    L.tileLayer(
        `https://api.mapbox.com/styles/v1/${Mapboxstyle}/tiles/512/{z}/{x}/{y}{r}?access_token=${Mapboxkey}`,
        { maxZoom: 20 }
    ).addTo(map);

    map.setView([38.5816, -121.4944], 12);
    
    //Now, lets create the spots layer
    spotsLayer = L.geoJSON(spots, {
        pointToLayer: (feature, latlng) => {
            // Create the marker first
            const marker = L.circleMarker(latlng, {
                radius: 4,
                fillColor: "#e5e5e5",
                color: "#ffffff",
                weight: 1,
                opacity: 0,
                fillOpacity: 0
            });

            // Create popup content
            const popupContent = document.createElement('div');
            popupContent.className = 'spot-popup';
            
            // Add click handler to marker
            marker.on('click', async (e) => {
                const spotId = feature.properties.obj_code;
                const timeLimit = feature.properties.timelimit;
                
                try {
                    // Check if spot is available
                    const available = await isSpotAvailable(spotId);
                    
                    // Create and show popup
                    const popupContent = `
                        <div class="popup-content">
                            <h3>Parking Spot ${spotId}</h3>
                            <p>Time Limit: ${timeLimit} minutes</p>
                            ${available ? 
                                `<button class="reserve-btn" data-spot-id="${spotId}">Reserve</button>` :
                                '<p class="unavailable">Currently unavailable</p>'
                            }
                        </div>
                    `;

                    marker.bindPopup(popupContent).openPopup();

                    // Add click handler for reserve button after popup is created
                    setTimeout(() => {
                        const reserveBtn = document.querySelector('.reserve-btn');
                        if (reserveBtn) {
                            reserveBtn.addEventListener('click', async () => {
                                const success = await reserveSpot(spotId, timeLimit);
                                if (success) {
                                    // Update popup to show success
                                    marker.setPopupContent(`
                                        <div class="popup-content">
                                            <h3>Parking Spot ${spotId}</h3>
                                            <p class="success">Successfully reserved for ${timeLimit} minutes!</p>
                                        </div>
                                    `);
                                    
                                    // Update marker style to show as reserved
                                    marker.setStyle({
                                        fillColor: "#ff0000",
                                        color: "#ff0000"
                                    });
                                }
                            });
                        }
                    }, 0);
                } catch (error) {
                    console.error("Error handling spot click:", error);
                    marker.bindPopup("Error loading spot information").openPopup();
                }
            });
            
            return marker;
        }
    }).addTo(map);

    //now that we have our layer of spots, let us run it by the filter

    initializeFilter(spotsLayer, map);

    //this returns true/false depending on whether the filter conditions are met

    function updateVisibleSpots(buffer) {
        spotsLayer.eachLayer(async (layer) => {
            const point = layer.feature.geometry;
            const isInBuffer = turf.booleanPointInPolygon(point, buffer);
            const spotId = layer.feature.properties.obj_code;
            if (isInBuffer) {
                // Check availability when spot becomes visible
                const available = await isSpotAvailable(spotId);
                layer.setStyle({ 
                    opacity: 1, 
                    fillOpacity: 0.8,
                    fillColor: available ? "#e5e5e5" : "#ff0000",
                    color: available ? "#ffffff" : "#ff0000"
                });
            } else {
                layer.setStyle({ opacity: 0, fillOpacity: 0 });
            }
        });
    }

    return {map, updateVisibleSpots};
}
    
    export { initMap, getSpotsLayer };