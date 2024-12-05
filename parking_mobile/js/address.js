//lets call in our filter function
import { filterSpotsByBuffer } from "./spots_filter.js";

//here, we create an address entry custom function

//first, lets call up our main elements from the html
const addressEntry = document.querySelector("#entry")
const addressChoices = document.querySelector("#address-choices")
const timestampInput = document.querySelector("#timestamp");
const searchButton = document.querySelector("#search");

//create empty container for selected addresses
let selectedLocation = null;

//we need to have the event function trigger at certain events
function initializeAddressEntry(events) {
    //first, we are going to look at when user inputs address

    addressEntry.mycustomfunc = () => {
        //when address entry section has an input, run it by this function
        handleAddressEntryChange(events)
    };
    addressEntry.addEventListener('input', addressEntry.mycustomfunc)

    //create another event that zooms into the map when buffer is selected
    events.addEventListener('address-zoom-map', (evt) => {
        const { buffer } = evt.detail;
        filterSpotsByBuffer(buffer);
      });

      //add a listener event for clicks of search buttons

      searchButton.addEventListener('click', () => {
        //only run if both values have been added
        if (selectedLocation && timestampInput.value) {
            //take the lat longs of selected point
          const selectedPoint = turf.point([selectedLocation.lon, selectedLocation.lat]);
          //create a 500m buffer
          const buffer = turf.buffer(selectedPoint, 0.5, {units: 'kilometers'});
          
          //zoom to selected location
          const addressLL = new CustomEvent('address-zoom-map', {
            detail: {
              lat: selectedLocation.lat,
              lon: selectedLocation.lon,
              buffer: buffer,
              bounds: turf.bbox(buffer)
            }
          });
          events.dispatchEvent(addressLL);
        }
      });

}

//function taken from example project philly_lead_levels
async function handleAddressEntryChange(events) {
    //when the event is triggered, remove the hidden style of address choice
    addressChoices.classList.remove('hidden');

    //store partial address input in a new const
    const partialAddress = addressEntry.value;
    //mapbox info for setup
    const apiKey = 'pk.eyJ1IjoiYWF2YW5pMTAzIiwiYSI6ImNtMTgxOGkyZzBvYnQyam16bXFydTUwM3QifQ.hXw8FwWysnOw3It_Sms3UQ';
    const bbox = [-121.5801,38.4375,-121.3852,38.685].join(',');
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${partialAddress}.json?bbox=${bbox}&access_token=${apiKey}`;

    //first, create a check function that only runs the event if the partial address is filled

    if (partialAddress === '') {
        addressChoices.classList.add('hidden');
        selectedLocation = null;
        return;
      }

    //fetch address information from mapbox api using the partial address

    const resp = await fetch(url);
    const data = await resp.json();

    //now that we recieved our data, its time to change the html
    //first, create a empty html container

    let html = '';
    //then parse what we need to add to the hidden list
    for (const feature of data.features) { //take every feature from the partial address response
        const lihtml = `
        <li data-lat="${feature.center[1]}" data-lon="${feature.center[0]}">
          ${feature.place_name}
        </li>
        `;
        //here, we are creating a new list item that contains the coordiantes of likely address
        //and its name. This is what will be added to our hidden list. 

        html += lihtml;
    }
    //with everything defined ,lets change the list of address we get

    addressChoices.innerHTML = html;

    //okay great, now we should have the list of addresses to choose from.
    //we also need to account for the behaviour after an address has been selected so

    //listen for click events, then put the outcome of that event into the handleAddressChoice function

    const choices = addressChoices.querySelectorAll('li');
    for (const choice of choices) {
        choice.addEventListener('click', (evt) => {
            handleAddressChoice(evt, events);
        });
    }
}

//create function that extracts the coordiantes of the selected address and hides the list again

function handleAddressChoice(evt, events) {
    const li = evt.target;
    const lat = parseFloat(li.getAttribute('data-lat'));
    const lon = parseFloat(li.getAttribute('data-lon'));
    
    const text = li.innerText;
    addressEntry.value = text;
    addressChoices.classList.add('hidden');
    
    selectedLocation = { lat, lon };
  }

//finally, export function

export{
    initializeAddressEntry
};