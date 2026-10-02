import { getGeojsonCollection } from './utils.js';
import { initMap, overlayMask } from './map.js';
import { geolocate, suggestAddress, getDistrict } from './location.js';

// Events in event bus:
// - userLocationAcquired: { detail: { lat, lng } }
// - districtData: { detail: { features of district } }
const events = new EventTarget();

const mapElement = document.querySelector('#map');
const septaNetwork = await getGeojsonCollection('overall_network.json');

const districtNum = document.querySelector('#district-num');
const results = document.querySelector('#results');

function displayDistrictData(events) {
    events.addEventListener('districtData', (event) => {
        const district = event.detail;
        // Get attributes of the district
        const districtNumber = district.properties.leg_district_no;
        const routes_eliminated = district.properties.routes_eliminated;
        const routes_shortened = district.properties.routes_shortened;
        const percent_eliminated = district.properties.percent_eliminated;
        const percent_shortened = district.properties.percent_shortened;
        const s_firstname = district.properties.s_firstname;
        const s_lastname = district.properties.s_lastname;
        // Display the district number, or error message if district number is not found
        if (!district) {
            districtNum.textContent = 'Please enter an address within Philadelphia.';
        }
        else {
            districtNum.textContent = `Your PA Senate district is: ${districtNumber}`;
        }
        // Display custom message in results section
        results.innerHTML = `
            <h3>Impacts in your area</h3>
            <p>In Senate District ${districtNumber}, <b>${routes_eliminated}</b> bus routes (${percent_eliminated} of routes), were completely eliminated and <b>${routes_shortened}</b> routes (${percent_shortened} of routes) were shortened.</p>
            <p>While these cuts were reversed in September 2025, without dedicated funding, these cuts may occur again. To advocate for sustainable transit funding, please consider contacting your state senator, ${s_firstname} ${s_lastname}, <a href="https://www.palegis.us/senate/members">here</a>.</p>
        `;
    });
}

initMap(mapElement, septaNetwork);
geolocate(events);
suggestAddress(events);
getDistrict(events);
displayDistrictData(events);
overlayMask(events);





