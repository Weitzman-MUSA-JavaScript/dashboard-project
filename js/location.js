import _ from 'https://cdn.jsdelivr.net/npm/lodash@4.17.21/+esm';
import * as turf from 'https://cdn.jsdelivr.net/npm/@turf/turf@7.1.0/+esm';

import { getGeojsonCollection } from './utils.js';

const geolocateButton = document.querySelector('#geolocate-button');
const addressInput = document.querySelector('#address-input');
const addressSuggestions = document.querySelector('#suggestions');

const districts = await getGeojsonCollection('districts.json');

/**
* Geolocate based on browser's geolocation API.
* @param {EventTarget} events The event bus used to communicate between app components.
*/
function geolocate(events) {
    geolocateButton.addEventListener('click', () => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                console.log(`Location acquired: Latitude: ${lat}, Longitude: ${lng}`);
                
                const evt = new CustomEvent('userLocationAcquired', {
                    detail: { lat, lng },
                });
                events.dispatchEvent(evt);
            },
            (error) => {
                console.error('Error obtaining location:', error);
                alert('Unable to retrieve your location. Did you allow location access?');
            }
        );
    });
}

/**
* Geocodes address input and presents results.
* @param {EventTarget} events The event bus used to communicate between app components.
*/
function suggestAddress(events) {
    const apiUrlBase = 'https://geocoding.geo.census.gov/geocoder/locations/address?city=Philadelphia&state=PA&benchmark=4&format=json&street=';
    
    const inputHandler = async () => {
        console.log('Input changed:', addressInput.value);
        
        const response = await fetch('https://corsproxy.io/?url=' + apiUrlBase + encodeURIComponent(addressInput.value));
        const data = await response.json();
        console.log('Autocomplete suggestions:', data);
        
        addressSuggestions.innerHTML = '';
        
        const suggestions = data.result.addressMatches;
        if (!suggestions || suggestions.length === 0) {
            const noResultsItem = document.createElement('li');
            noResultsItem.textContent = 'No matches found.';
            addressSuggestions.appendChild(noResultsItem);
        }
        
        for (const match of suggestions) {
            const listItem = document.createElement('li');
            listItem.innerHTML = `Select your address:<br><button>${match.matchedAddress}</button>`;
            listItem.querySelector('button').addEventListener('click', () => {
                addressInput.value = match.matchedAddress;
                addressSuggestions.innerHTML = '';
                
                const lat = match.coordinates.y;
                const lng = match.coordinates.x;
                const evt = new CustomEvent('userLocationAcquired', {
                    detail: { lat, lng },
                });
                events.dispatchEvent(evt);
                console.log(`Location acquired: Latitude: ${lat}, Longitude: ${lng}`);
            });
            addressSuggestions.appendChild(listItem);
        }
    };
    
    const debouncedInputHandler = _.debounce(inputHandler, 500);
    
    addressInput.addEventListener('input', debouncedInputHandler);
}

/**
* Based on the user's location, get correct PA Sen district number and print result.
* @param {EventTarget} events The event bus used to communicate between app components.
*/
function getDistrict(events) {
    events.addEventListener('userLocationAcquired', (event) => {   
        const { lat, lng } = event.detail;
        const pt = turf.point([lng, lat]);
        // Get the correct district number based on user's location
        const district = findIntersectingPolygon(pt, districts);
        console.log('Intersecting district:', district);
        // Dispatch the district data to event bus
        const evt = new CustomEvent('districtData', {
            detail: district,
        });
        events.dispatchEvent(evt);
        console.log('District data dispatched:', district);
    }
)
}

/**
* Given a point and a collection of polygons, find the polygon that contains the point.
* @param {Object} point A Turf point object.
* @param {Object} polygons A Turf FeatureCollection of polygons.
*/
function findIntersectingPolygon(point, polygons) {
    for (var i = 0; i < polygons.features.length; i++) {
        var polygon = polygons.features[i];
        if (turf.booleanPointInPolygon(point, polygon)) {
            return polygon; // Returns the specific polygon feature that contains the point
        }
    }
    return null; // No containing polygon found
}

export { geolocate, suggestAddress, getDistrict };