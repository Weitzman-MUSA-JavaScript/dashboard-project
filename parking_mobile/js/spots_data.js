//create a function to load spots_data

//here we use async function as it is better suited for calling data
//and allows us to use await

async function loadSpotsData(){

    //fetch parking data from its folder

    const spotsResponse = await fetch ("data/clean_parking.geojson");

    //read the response from file path as a json
    //here, we wait for the data to be loaded, then run it through a json function

    const spotsCollection = await spotsResponse.json();

    //get feature data for mapping

    const spots = spotsCollection.features;

    //return output of the function to be spots

    return { spots };

}

//export function to be called somewhere else
export { loadSpotsData }