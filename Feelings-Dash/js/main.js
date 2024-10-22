import { importmapSelector} from "./map_select.js";
import {radar} from "./radar_chart.js";
const url = './data/layers/emotions_main.geojson';

async function getData(url) {
  const response = await fetch(url);

  return response.json();
}

const data = await getData(url);

console.log('main data loaded', data )


async function handleFilteredGeoJSON() {
    try {
      const filteredGeojson2 = await importmapSelector('./data/layers/emotions_main.geojson');
      
      // Now you can use `filteredGeojson2` here
    } catch (error) {
      console.error('Error handling filtered GeoJSON:', error);
    }
  }
  
  handleFilteredGeoJSON();
  radar(data)





  
  
  
