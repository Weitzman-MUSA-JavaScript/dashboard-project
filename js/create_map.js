function initMap(el) {
  const map = L.map(el, {maxZoom: 18, zoomsnap: 0, scrollWheelZoom: false}).setView([1.3521, 103.8198], 12);
  const mapboxKey = 'pk.eyJ1Ijoic2Vhbm1rb2giLCJhIjoiY20weGI2bm8zMGJmOTJqcHEzeTRnZXEwcCJ9.8OStU7WetpCxZ9YiUCiigA';
  const mapboxStyle = 'mapbox/standard';

  L.tileLayer(`https://api.mapbox.com/styles/v1/${mapboxStyle}/tiles/512/{z}/{x}/{y}{r}?access_token=${mapboxKey}`, {
    tileSize: 512,
    zoomOffset: -1,
    detectRetina: true,
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  return ( map );
}

export { initMap };