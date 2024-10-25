// function initMap(Whale) {
//     const map = L.map(Whale, {maxZoom: 18, zoomSnao: 0 }).setView([39.95, -75.16], 12);

//     const mapboxKey = 'pk.eyJ1Ijoic3lsdmlhdXBlbm4iLCJhIjoiY20weTdodGpiMGt4MDJsb2UzbzZnd2FmMyJ9.H6mn-LOHFUdv7swHpM7enA';
//     const mapboxStyle = 'mapbox/streets-v12';

//     L.tileLayer('https://api.mapbox.com/styles', {
//         tileSize: 512,
//         zoomOffset: -1,
//         detectRetina: true,
//         maxZoom: 19,
//         attribution: 
//     }).addTo(map);


// // Listen for the positionfound event, which is fired when the user's location is found

// events.addEventListener('positionfound', (evt) => {
//     const pos = evt.details;
//     const marker = L.circleMarker([pos.coord.latitude, pos.coord.longitude], {
//         radius: 5,
//     });
//     marker.addTo(map);
//     map.setView([pos.coord.latitude, pos.coord.longitude], 16);
// });

// }

// export { initMap };