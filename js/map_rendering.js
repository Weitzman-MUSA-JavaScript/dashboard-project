
function initializeMapRendering(dataGeoJSON, map, evt){

  const layerGroup = L.layerGroup();

  const houseIcon = L.icon({
    iconUrl: './img/home.png',

    iconSize:     [16, 16], // size of the icon
    // iconAnchor:   [22, 94], // point of the icon which will correspond to marker's location
    // popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
});

  layerGroup.addTo(map);

  renderData(0, layerGroup, dataGeoJSON, houseIcon);

  evt.addEventListener("select-neighborhood", (e) => {
    renderData(e.detail.district, layerGroup, dataGeoJSON, houseIcon);
  }) 

}

function renderData(district, layerGroup, dataGeoJSON, houseIcon) {
  const defaultOptions = {
    pointToLayer: (feature, latlng) => L.marker(latlng, {icon: houseIcon}),
    style: (feature) =>
      feature.geometry.type === 'Point' ?
        { stroke: false,
          radius: 2,
          fillOpacity: 1,
          color: '#AA4A44',
          icon: houseIcon} :
        {},
    interactive: true,
    onEachFeature: (feature, layer) => {
      return(layer.bindPopup('Real Price: ' + feature.properties.realPrice + '<br/>'
      + 'Predicted Price: ' + feature.properties.predPrice));
    }
  };

  let filteredData = dataGeoJSON
  
  if (district != 0) {
    filteredData = dataGeoJSON.filter(
      (feature) => feature.properties.district == district);
  }

  layerGroup.clearLayers();

  L.geoJSON(filteredData, defaultOptions).addTo(layerGroup);
}

export {
  initializeMapRendering,
};
