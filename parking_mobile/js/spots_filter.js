//lets create a function that filters spots value

//first, we start by taking empty values of our spots and timestamp

let spotsLayer;
let timestampInput = null;

//create our function that takes in a layer and map and a timestamp as input

function initializeFilter(layer, map){
    spotsLayer = layer;
    timestampInput = document.querySelector("#timestamp");
}

//checking function to ensure that timestamp has value 
function filterTime(feature) {
    if (!timestampInput || !timestampInput.value) {
      console.log("No timestamp set");
      return true;
    }

    //to begin, we would need to parse timestamp with two date inputs—the day of the week
    //and the hour of the day
    //create a date function with timestamp input
    const timeToCheck = new Date(timestampInput.value);
    //convert it to 24 hour format
    const checkTime = timeToCheck.toLocaleDateString('en-US',{
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
    });
    const checkDay = timeToCheck.getDay();

    //now, lets get our date variables from our properties

    const { noparkdays, start_time, end_time } = feature.properties;

    //now to create a time check function 
    //we assume that all spots are allowed, and will check restrictions recursively
    let isDayRestricted = false;
    //first, check whether the day falls in a restricted day 
    //if noparkdays is not null and it includes the day, the day is restricted

    if (noparkdays && noparkdays.includes(checkDay)){
        isDayRestricted = true;

        //hence, we would need to check for time. First, if day is restricted and times are null, then it is restricted
        if (!start_time || !end_time) {
            return false;  // Spot is NOT visible
        }
        
        // If day is restricted and time falls within range, spot is unavailable
        if (checkTime > start_time && checkTime < end_time) {
            return false;  // Spot is NOT visible
        }
    }
    //only returns value for which the restrictions are not met
    return true;
}

//now, lets filter our points by it being in a 500m buffer

function filterSpotsByBuffer(buffer) {
    //empty buffer points to store data
    let bufferPoints = [];
    //checking whether the point is in buffer and non-time restrictions
    spotsLayer.eachLayer((layer) => {
        const point = layer.feature.geometry
        const isInBuffer = turf.booleanPointInPolygon(point,buffer);
        const isTimeAllowed = filterTime(layer.feature)

        //conditional statement to change the opacity depending on whether conditions are met

        if (isInBuffer && isTimeAllowed) {
            layer.setStyle({ opacity: 1, fillOpacity: 0.8 });
            bufferPoints.push(layer.feature.properties); 
        } else {
            layer.setStyle({ opacity: 0, fillOpacity: 0 });
        }
    });

    //export all points within the buffer for other calculations
    return{ point: bufferPoints};
}

export {initializeFilter, filterSpotsByBuffer};