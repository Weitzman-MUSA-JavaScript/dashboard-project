import { Observation } from "./Observation.js";

async function getData(){
  // Read data
  const dataResponse = await fetch('data/model_data.json');
  const dataRaw = await dataResponse.json();
  
  // Create array to hold final data objects
  const data = new Array(dataRaw.district.length);

  for (let i = 0; i < dataRaw.district.length; i++) {
    data[i] = new Observation(
        Number(dataRaw.district[i]),
        dataRaw.area[i],
        dataRaw.real_price[i],
        dataRaw.pred_price[i],
        dataRaw.Y[i],
        dataRaw.X[i])
  }

  // Create GeoJSON of data
  const dataGeoJSON = data.map(obsToFeature);

  // Read neighborhood information
  const neighborhoodsResponse = await fetch('data/neighborhoods.json');
  const neighborhoodsRaw = await neighborhoodsResponse.json();

    // Create array to hold final neighborhood objects
    const neighborhoods = new Array(neighborhoodsRaw.district.length);

    for (let i = 0; i < neighborhoodsRaw.district.length; i++) {
      neighborhoods[i] = {
        district: Number(neighborhoodsRaw.district[i]),
        name: neighborhoodsRaw.name[i],
        bach: neighborhoodsRaw.bach_rate[i],
        unemploy: neighborhoodsRaw.unemployment_rate[i]
      }
    }

  return({data, dataGeoJSON, neighborhoods})
}

function obsToFeature(obs) {
  return {
    type: 'Feature',
    properties: {
      "district": obs.district,
      "area": obs.area,
      "realPrice": obs.realPrice,
      "predPrice": obs.predPrice,
      "residual": obs.residual
    },
    geometry: {
      type: 'Point',
      coordinates: [obs.lon, obs.lat],
    }
  };
}

export {
    getData,
  };
