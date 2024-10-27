
var config = {
    style: "mapbox://styles/mapbox/dark-v11", 
    accessToken: "pk.eyJ1IjoiZGFsaXZhbnBpY2Fzc29udW0yIiwiYSI6ImNtMTg0MGwzcTBxZnoybHB3dGsxOGs3N3MifQ.ubimGmdKCe9GNuSwkk5T6g",
    markerColor: "#3FB1CE", 
    theme: "light", 
    use3dTerrain: false, 
    mapSettings: {
        center: [-107.13038, 40.22634], 
        zoom: 3.74, 
        pitch: 0, 
        bearing: 0 
    }
};

mapboxgl.accessToken = config.accessToken;

var map = new mapboxgl.Map({
    container: 'map', 
    style: config.style, 
    center: config.mapSettings.center, 
    zoom: config.mapSettings.zoom, 
    pitch: config.mapSettings.pitch, 
    bearing: config.mapSettings.bearing 
});
