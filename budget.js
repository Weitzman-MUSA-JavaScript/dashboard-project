export const TOTAL_GF = 6_526_217;
export const CITY_SHARE = 0.45; 
export const SALES_RATE = 0.01; 


const Q = "/query?where=1%3D1&outFields=*&f=geojson";
const ARC = "https://services.arcgis.com/fLeGjb7u4uXqeF9q/arcgis/rest/services";

export const SERVICES = [
  { label: "Fire",       iconUrl: "icons/icons8-fire-extinguisher-48.png", circle: "rgba(255, 255, 255, 0.80)", budget: 460_875_843, url: "https://hub.arcgis.com/api/v3/datasets/341526186e014aa0aa3ef7e08a394a78_0/downloads/data?format=geojson&spatialRefId=4326&where=1%3D1"},
  { label: "Police",     iconUrl: "icons/icons8-doughnut-48.png", circle: "rgba(255, 255, 255, 0.80)", budget: 934_395_772, url: "https://hub.arcgis.com/api/v3/datasets/7e522339d7c24e8ea5f2c7780291c315_0/downloads/data?format=geojson&spatialRefId=4326&where=1%3D1"},
  { label: "Parks",      iconUrl: "icons/icons8-flower-48.png", circle: "rgba(255, 255, 255, 0.80)", budget: 89_318_447, url: "https://opendata.arcgis.com/api/v3/datasets/9eb26a787a6e448ba426eea7f9f0d93a_0/downloads/data?format=geojson&spatialRefId=4326" },  
  {label: "Correctional Facilities", iconUrl: "icons/icons8-prison-50.png", circle: "rgba(255, 255, 255, 0.80)", budget: 318_000_000, url: "https://hub.arcgis.com/api/v3/datasets/955eb7bc845d4b16ade05924fb235cf2_0/downloads/data?format=geojson&spatialRefId=4326&where=1%3D1" },
  {label: "Libraries", iconUrl: "icons/icons8-books-48.png", circle: "rgba(255, 255, 255, 0.80)", budget: 50_000_000, url: "data/library_locations.geojson" },

];