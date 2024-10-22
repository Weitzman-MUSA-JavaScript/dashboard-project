/* globals turf */

import { calLeadStyle } from './map-style.js';
import { calParkStyle } from './map-style.js';
import { legendStyle } from './map-style.js';
import { backButtonStyle } from './map-style.js';
import { leadAnalysis } from './cal.js';
import { setLeadLevel } from './chart.js';
import { handleClearButton } from './map-style.js';

// add layers to map
let phillyParkLayer = null;
let soilLayer = null;
let cityLayer = null;
const currentLocationLayer = L.layerGroup();
const routeLayer = L.geoJSON(null, {
  style: {
    color: '#F59B93',
    dashArray: '3 3',
    weight: 1.8,
  },
});


const mapboxApiKey = 'pk.eyJ1IjoianVueWl5IiwiYSI6ImNsbm03NGszNDFrbHgybW1uZXBrMTMwZ3EifQ.VJyFnRhnQtJ9yU5gl0SdoA';

function initializeMap(parks, leadSamples, cityLimits, events) { // remember to input all the layers specify below
  const map = L.map('map', {zoomSnap: 0}).setView([40.01, -75.15], 11); // zoomSnap 0 make the zoom level to real number
  const baseTileLayer = L.tileLayer('https://api.mapbox.com/styles/v1/junyiy/clng7r3oq083901qx0eu9gaor/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoianVueWl5IiwiYSI6ImNsdWVxcHowcDBxbWUyam92MWx5aW40MnkifQ.QR9kni83fZBO-EFBXAaX7g', {
    maxZoom: 19,
    zoomOffset: -1,
    tileSize: 512,
    attribution: `© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <strong><a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a></strong>`,
  });
  baseTileLayer.addTo(map);

  phillyParkLayer = L.geoJSON(parks,
    {style: calParkStyle,
    }).bindTooltip((l) => {
    return `<p class="tool-park"><strong>Green Space:</strong> ${l.feature.properties.SITE_NAME}</p>`;
  }).bindPopup((l) => {
    return `<h3 class="pop-title">${l.feature.properties.SITE_NAME}</h3>
    <p class="pop-content"><strong>Parent:</strong> ${l.feature.properties.CHILD_OF}</p>
    <p class="pop-content"><strong>Type:</strong> ${l.feature.properties.USE_}</p>
    <p class="pop-content"><strong>Area (acre):</strong> ${l.feature.properties.ACREAGE.toFixed(2)}</p>`;
  });
  phillyParkLayer.addTo(map);

  soilLayer = L.geoJSON(leadSamples,
    {style: calLeadStyle,
      pointToLayer: (parks, latlng) => L.circleMarker(latlng), // just type latlng or any names and leaflet know how to find goejson's coordinate
      // Can also do the latlng manually, remember to flip the lon lat (leaflet and geojson read it in the opposite way)
      // pointToLayer: (parks) => L.circleMarker([parks.geometry.coordinates[1], parks.geometry.coordinates[0]]),
    }).bindTooltip((l) => {
    return `<p class="tool-lead"><strong>Lead (ppm):</strong> ${l.feature.properties.Lead__ppm}</p>`;
  });

  soilLayer.addTo(map);

  cityLayer = L.geoJSON(cityLimits,
    { stroke: true,
      fill: false,
      color: '#446E5F',
      dashArray: '5 6',
      weight: 2,
    });
  cityLayer.addTo(map);

  // make the zoom level fit different browser size
  map.fitBounds(cityLayer.getBounds());

  // add legend
  const legend = L.control({position: 'bottomright'});
  legend.onAdd = (map) => {
    return legendStyle(map); // remeber to return the function
  };
  legend.addTo(map);

  // add back button
  const backView = L.control({position: 'topleft'});
  backView.onAdd = (map) => {
    return backButtonStyle(map);
  };
  backView.addTo(map);

  // call clear button function
  handleClearButton(map);

  // change map and chart when inputting park nane or click on park list
  events.addEventListener('zoom-map', (evt) => {
    // match the clicked park by polygon ID of geojson file
    const ID = evt.detail.mapZoomSelect;
    currentLocationLayer.clearLayers();
    routeLayer.clearLayers();
    idToPark(ID);
  });

  // change map and chart when inputting address
  events.addEventListener('address-zoom-map', (evt) => {
    const lat = parseFloat(evt.detail.lat); // original object is string, will cause error later, need to change to float here
    const lon = parseFloat(evt.detail.lon);

    const addressPoint = turf.point([lon, lat]);
    phillyParkLayer.resetStyle();

    // need to loop through each shape to get center points because the turf function only take one shape each time
    const parkCenters = [];
    for (const park of parks.features) {
      const parkCenter = turf.pointOnFeature(park);
      parkCenter.properties = park.properties; // add all park properties to point properties (although we don't need it later)
      parkCenter.id = park.id; // add the park ID to point feature
      parkCenters.push(parkCenter);
    }

    // find nearest center point and use that to get the park shape
    const parkNear = turf.nearestPoint(addressPoint, turf.featureCollection(parkCenters)); // truf function take turf feature collection, not just simple array
    console.log(parkNear.geometry.coordinates[0]);
    const ID = parkNear.id;

    async function fetchData() {
      const toPoint = parkNear.geometry.coordinates;
      const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${lon},${lat};${toPoint[0]},${toPoint[1]}` +
        `?geometries=geojson` +
        `&access_token=${mapboxApiKey}`;

      console.log(url);

      let resp;
      let data;
      try {
        resp = await fetch(url);

        if (resp.status !== 200) {
          throw new Error('Routing generation failed');
        }

        data = await resp.json();
        // Handle the response data here...
      } catch (err) {
        alert('Something exceptional happened.');
        console.error(err); // Log the error for debugging purposes
        return;
      }
      console.log(data);

      if (data.routes.length < 1) {
        alert('Looks like there are no routes to the nearest park from where you are.');
      }

      const routeGeom = data.routes[0].geometry;
      routeLayer.clearLayers();
      routeLayer.addData(routeGeom).addTo(map);
    }

    // Call the async function
    fetchData();


    idToPark(ID, addressPoint);

    currentLocationLayer.clearLayers();
    const currentLocationMarker = L.circleMarker([lat, lon], {
      stroke: false,
      fillColor: '#EA7A8F',
      fillOpacity: 1,
      radius: 8,
    }).bringToFront();
    currentLocationLayer.addLayer(currentLocationMarker).addTo(map);
  });

  // define a function for getting park shape from park ID and set the chart
  function idToPark(ID, addressPoint=null) {
    phillyParkLayer.resetStyle(); // clear all the red boundaries
    phillyParkLayer.eachLayer((layer) => { // .eachLayer is to get each object from this layer; this is because we change geojson object into a leaflet layer; if it is a geojson, we don't need this function
      if (layer.feature.id == ID) { // still need feature, if not, it will be an array; the feature here is a leaflet attribute, which get each feature from geojson "features", not the geojson path
        // specify the highlight color of zoomed in park
        layer.setStyle({
          stroke: true,
          color: '#EA7A8F',
          dashArray: '5 6',
          weight: 3,
        });
        layer.bringToFront(); // this is because some of parks overlapped

        // set zoomin level
        if (addressPoint != null) {
          const featureCollection = turf.featureCollection([layer.feature, addressPoint]);
          const zoomBuffer = turf.buffer(featureCollection, 0.25); // calculate buffer, 0.25km
          const [minLon, minLat, maxLon, maxLat] =turf.bbox(zoomBuffer); // this is because turf use bottom left and top right points but leaflet use top left and bottom right points as bounding box input
          map.flyToBounds([[minLat, minLon], [maxLat, maxLon]]); // .fitBounds will just show the final results, .flyToBound is fancy
        } else {
          const zoomBuffer = turf.buffer(layer.feature, 0.25);
          const [minLon, minLat, maxLon, maxLat] =turf.bbox(zoomBuffer);
          map.flyToBounds([[minLat, minLon], [maxLat, maxLon]]);
        }


        // updateSoilChart(layer.feature, leadSamples)
        const parkBuffer = turf.buffer(layer.feature, 0.2); // calculate buffer, 0.2km
        const parkLead = leadAnalysis(parkBuffer, leadSamples); // do the calculations
        setLeadLevel(parkLead); // change the chart
      }
    });
  }


  return map;
}

export {
  initializeMap,
  cityLayer,
  phillyParkLayer,
  currentLocationLayer,
  routeLayer,
};
