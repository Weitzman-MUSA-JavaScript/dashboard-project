import { importmapSelector} from "./map_select.js";

async function handleFilteredGeoJSON() {
    try {
      const filteredGeojson2 = await importmapSelector();
      console.log('Filtered GeoJSON received:', filteredGeojson2);
      // Now you can use `filteredGeojson2` here
    } catch (error) {
      console.error('Error handling filtered GeoJSON:', error);
    }
  }
  
  handleFilteredGeoJSON();


  
