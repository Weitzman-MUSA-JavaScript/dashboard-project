/*
* Read geojson file
* @param {string} filename - The name of the geojson file to load
* @return {object} The FeatureCollection as loaded from the data file
*/
async function getGeojsonCollection(filename) {
    const resp = await fetch(`data/${filename}`);
    const data = await resp.json();
    return data;
}

export { getGeojsonCollection };