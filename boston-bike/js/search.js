document.getElementById('search-button').addEventListener('click', function() {
    const searchValue = document.getElementById('station-search').value.toLowerCase(); // 獲取搜索值，轉換為小寫
    const station = bikeStations.find(station => station.properties.Name.toLowerCase() === searchValue); // 不區分大小寫查找站點

    if (station) {
        const coords = station.geometry.coordinates; // 獲取站點的坐標
        map.setView([coords[1], coords[0]], 15); // 放大到該站點，縮放級別設置為 15
        L.marker([coords[1], coords[0]]).addTo(map).bindPopup(station.properties.Name).openPopup(); // 在站點位置添加標記並打開彈出框
    } else {
        alert('Station not found. Please try again.'); // 提示未找到站點
    }
});

// 顯示潛在的站點建議
document.getElementById('station-search').addEventListener('input', function() {
    const inputValue = this.value.toLowerCase(); // 獲取當前輸入值
    const suggestionsList = document.getElementById('suggestions');
    suggestionsList.innerHTML = ''; // 清空建議列表

    if (inputValue) {
        const suggestions = bikeStations.filter(station => 
            station.properties.Name.toLowerCase().includes(inputValue) // 查找包含當前輸入的站點
        ).map(station => `<li>${station.properties.Name}</li>`); // 創建建議列表項目

        suggestionsList.innerHTML = suggestions.join(''); // 添加建議項目到列表中
    }
});

// 點擊建議時將其填入搜索框
document.getElementById('suggestions').addEventListener('click', function(e) {
    if (e.target.tagName === 'LI') {
        document.getElementById('station-search').value = e.target.innerText; // 將選中的建議填入搜索框
        suggestionsList.innerHTML = ''; // 清空建議列表
    }
});




// 根據所選的地區過濾站點
document.getElementById('district-dropdown').addEventListener('change', function() {
    const selectedDistrict = this.value; // 獲取選中的地區
    const filteredStations = selectedDistrict ? 
        bikeStations.filter(station => station.properties.District === selectedDistrict) : 
        bikeStations; // 過濾站點

    displayStations(filteredStations); // 更新地圖顯示
});

 
// Add button click event listener 添加按鈕來切換顯示/隱藏 bike path
document.getElementById('toggle-bike-path').addEventListener('click', function() {
    if (map.hasLayer(bikePathLayer)) {
        map.removeLayer(bikePathLayer); // Remove layer if it exists
        this.textContent = 'Show Bike Path of Boston City'; // Update button text
    } else {
        map.addLayer(bikePathLayer); // Add layer if it doesn't exist
        this.textContent = 'Hide Bike Path of Boston City'; // Update button text
    }
});

