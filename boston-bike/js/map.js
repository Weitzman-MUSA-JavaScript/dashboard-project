// Mapbox access token and style
const mapboxKey = 'pk.eyJ1IjoibWp1bWJlLXRlc3QiLCJhIjoiY2w3ZTh1NTIxMTgxNTQwcGhmODU2NW5kaSJ9.pBPd19nWO-Gt-vTf1pOHBA';
const mapboxStyle = 'mapbox/light-v11';

// Initialize the map
const map = L.map('map').setView([42.35, -71.0589], 11);

// Mapbox tile layer with custom style
L.tileLayer(`https://api.mapbox.com/styles/v1/${mapboxStyle}/tiles/{z}/{x}/{y}?access_token=${mapboxKey}`, {
    maxZoom: 18,
    tileSize: 512,
    zoomOffset: -1,
    attribution: '© <a href="https://www.mapbox.com/">Mapbox</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// 定義變數來存儲自行車站點數據
let bikeStations;
let bikePathLayer; // 用於存儲 bike path layer

// 使用 fetch API 獲取自行車站點的 GeoJSON 數據
fetch('https://services.arcgis.com/sFnw0xNflSi8J0uh/arcgis/rest/services/Blue_Bike_Stations/FeatureServer/0/query?outFields=*&where=1%3D1&f=geojson')
    .then(response => response.json())
    .then(data => {
        bikeStations = data.features; // 將 GeoJSON 特徵數據存儲在變數中
        const districtDropdown = document.getElementById('district-dropdown');

        // 提取所有不重複的地區並添加到下拉列表中
        const districts = [...new Set(bikeStations.map(station => station.properties.District))];
        districts.forEach(district => {
            const option = document.createElement('option');
            option.value = district;
            option.textContent = district;
            districtDropdown.appendChild(option);
        });

        // 為每個站點添加到地圖上
        displayStations(bikeStations); // 顯示所有站點
    })
    .catch(error => console.error('Error loading the GeoJSON data:', error)); // 錯誤處理

// 顯示自行車站點
function displayStations(stations) {
    // 清空現有標記
    map.eachLayer(layer => {
        if (layer instanceof L.Marker) {
            map.removeLayer(layer);
        }
    });

    // 自定義小圖標
    const smallIcon = L.icon({
        iconUrl: 'data/blue-bike.jpeg',  // 替換為您自定義的小圖標的路徑
        iconSize: [18, 18],                      // 設置圖標大小
        iconAnchor: [10, 10],                    // 圖標錨點
        popupAnchor: [0, -10]                    // 彈出框錨點
    });

    // 添加新的標記
    stations.forEach(station => {
        const coords = station.geometry.coordinates; // 獲取坐標
        L.marker([coords[1], coords[0]], { icon: smallIcon }) // 使用小圖標
            .addTo(map)
            .bindPopup(station.properties.Name); // 在標記上綁定彈出框顯示站點名稱
    });
}


// 加載並初始化 bike path 的 GeoJSON layer，但默認不顯示
fetch('data/Boston_Bicycle_Network_2023.geojson')
    .then(response => response.json())
    .then(data => {
        bikePathLayer = L.geoJSON(data, {
            style: {
                color: 'grey', // 設置 bike path 顏色
                weight: 3, // 粗細
                opacity: 0.8          // 設置透明度

            }
        });
    });


