import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// =========================================
// 0. 配置区域
// =========================================

const firebaseConfig = {
  apiKey: "AIzaSyAMIT38af7QwiB9iiw8tl0v6k5pm0rZJ4I",
  authDomain: "yunnanodyssey.firebaseapp.com",
  projectId: "yunnanodyssey",
  storageBucket: "yunnanodyssey.firebasestorage.app",
  messagingSenderId: "184293573238",
  appId: "1:184293573238:web:3ae1188dfde704b6bad557",
  measurementId: "G-LDE0GNT38D"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 用户 ID 同步逻辑
function getLocalUserId() {
    let id = localStorage.getItem('yun_user_id');
    if (!id) {
        id = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('yun_user_id', id);
    }
    return id;
}
const CURRENT_USER_ID = getLocalUserId();
console.log("Interactive Planner - Current User ID:", CURRENT_USER_ID);

// Mapbox Token
const MAPBOX_TOKEN = 'pk.eyJ1IjoiY2hyaXN0aW5lY3VpMTIiLCJhIjoiY21qYTNiaXRnMDE4eTNrcHR6NnY2Y29ubCJ9.86q3rX0N3qbsbgvP9-6YAw';

// 全局变量
let poiData = []; 
const routeColors = ['#3494a6', '#e0b341', '#bf4328', '#1a3c5a', '#8e44ad', '#27ae60'];
let totalDaysCount = 0;
let map;
let routeLayer;
let markersLayer;

// =========================================
// 1. 初始化程序 (Init)
// =========================================

async function initInteractive() {
    console.log("Initializing Interactive Planner...");

    // 1.1 初始化地图
    map = L.map('map', { zoomControl: false }).setView([24.5, 101.5], 7);
    L.control.zoom({ position: 'topright' }).addTo(map);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(map);

    routeLayer = L.layerGroup().addTo(map);
    markersLayer = L.layerGroup().addTo(map);

    // 1.2 设置默认值 (会被 loadSavedTour 覆盖)
    document.getElementById('dateFrom').value = "2025-12-18";
    document.getElementById('dateTo').value = "2025-12-23";
    document.getElementById('budgetInput').value = "10";

    try {
        // 1.3 加载数据
        const [poiResponse, wishlistDoc] = await Promise.all([
            fetch('poi_new2_updated_with_pics.geojson'),
            getDoc(doc(db, "users", CURRENT_USER_ID))
        ]);

        if (!poiResponse.ok) throw new Error("Failed to fetch GeoJSON");
        const geoJson = await poiResponse.json();
        
        // 1.4 解析 POI
        poiData = geoJson.features.map(f => {
            const p = f.properties;
            const rawCost = p.Buget || ""; 
            const cost = parseInt(rawCost.replace(/[^0-9]/g, '') || 0);

            // ★★★ 修改点 1：读取 GeoJSON 中的 Rec_Time 字段 ★★★
            // 如果字段名不同，请修改 p.Rec_Time
            const recTime = p.Rec_Time || "2 h"; 

            return {
                id: String(p.osm_id), 
                name: p.name_E || p.name, 
                lat: f.geometry.coordinates[1],
                lng: f.geometry.coordinates[0],
                price: cost,
                ele: parseFloat(p.Elevation || 0),
                time: recTime, // 存储时间
                cat: p.Filter, 
                wifi: p.Wifi,
                park: p.Parking
            };
        });

        // 1.5 获取 Wishlist
        let wishlistIds = new Set();
        if (wishlistDoc.exists()) {
            const dbList = wishlistDoc.data().wishlist || [];
            dbList.forEach(id => wishlistIds.add(String(id)));
        }

        // 1.6 渲染地图标记
        renderMarkers(wishlistIds);

        // 1.7 初始化日期 (如果没有存档，这里会生成默认天数)
        syncDaysWithDate();

        // 1.8 尝试加载本地存储的行程
        loadSavedTour();

    } catch (e) {
        console.error("Error initializing interactive page:", e);
    }
}

function renderMarkers(wishlistIds) {
    markersLayer.clearLayers();
    
    poiData.forEach(p => {
        if (!wishlistIds.has(p.id)) return;
        
        let cssClass = `marker-wishlist cat-${p.cat}`; 
        let iconHtml = '<i class="fa-solid fa-location-dot"></i>';
        if(p.cat === 'Nature') iconHtml = '<i class="fa-solid fa-mountain"></i>';
        if(p.cat === 'Culture') iconHtml = '<i class="fa-solid fa-landmark"></i>';
        if(p.cat === 'Food') iconHtml = '<i class="fa-solid fa-utensils"></i>';
        if(p.cat === 'Stay') iconHtml = '<i class="fa-solid fa-bed"></i>';

        const icon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="marker-pin ${cssClass}">${iconHtml}</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });

        const marker = L.marker([p.lat, p.lng], { icon: icon }).addTo(markersLayer);

        marker.bindPopup(() => {
            let optionsHtml = '';
            if (totalDaysCount > 0) {
                for(let i=1; i<=totalDaysCount; i++) {
                    optionsHtml += `<option value="day${i}">Day ${i}</option>`;
                }
            } else {
                 optionsHtml = `<option disabled>Set dates first</option>`;
            }

            // ★★★ 修改点 2：弹窗中增加时间显示 ★★★
            return `
                <div style="text-align:center; min-width:180px;">
                    <h4 style="margin:0 0 5px 0;color:#1a3c5a;">${p.name}</h4>
                    <p style="margin:0 0 8px 0;font-size:12px;color:#666;">
                       <i class="fa-regular fa-clock"></i> ${p.time} | Ele: ${p.ele}m | Cost: $${p.price}
                    </p>
                    <div class="popup-controls">
                        <select id="targetDaySelect-${p.id}" class="popup-day-select">
                            ${optionsHtml}
                        </select>
                        <button class="popup-add-btn" onclick="window.addToPlan('${p.id}')">Add</button>
                    </div>
                </div>
            `;
        });
    });
}


// ============================================
// 2. 日期计算 & 侧边栏
// ============================================

const dateFromInput = document.getElementById('dateFrom');
const dateToInput = document.getElementById('dateTo');
const totalDaysDisplay = document.getElementById('totalDaysDisplay');
const daysContainer = document.getElementById('daysContainer');
const btnAddDay = document.getElementById('btnAddDay');

function syncDaysWithDate() {
    const dFromVal = dateFromInput.value;
    const dToVal = dateToInput.value;
    if (!dFromVal || !dToVal) return; 

    const d1 = new Date(dFromVal);
    const d2 = new Date(dToVal);
    
    if (isNaN(d1.getTime()) || isNaN(d2.getTime()) || d2 < d1) {
        totalDaysDisplay.innerText = "Invalid";
        return;
    }

    const diffTime = Math.abs(d2 - d1);
    const targetDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
    
    totalDaysDisplay.innerText = targetDays + " Days";
    
    // 增量更新 DOM
    if (targetDays > totalDaysCount) {
        for (let i = totalDaysCount + 1; i <= targetDays; i++) {
            createDaySection(i);
        }
    } 
    else if (targetDays < totalDaysCount) {
        for (let i = totalDaysCount; i > targetDays; i--) {
            const dayEl = document.getElementById(`day${i}`);
            if (dayEl) {
                const section = dayEl.closest('.day-section');
                if (section) section.remove();
            }
        }
    }
    
    totalDaysCount = targetDays;
    updateGlobalState(false);
}

function createDaySection(dayIndex) {
    const div = document.createElement('div');
    div.className = 'day-section';
    div.innerHTML = `
        <div class="day-title">DAY ${dayIndex}</div>
        <ul class="waypoint-list" id="day${dayIndex}"></ul>
    `;
    daysContainer.appendChild(div);
    
    new Sortable(document.getElementById(`day${dayIndex}`), {
        group: 'shared', 
        animation: 150, 
        ghostClass: 'sortable-ghost',
        onEnd: () => updateGlobalState(false) 
    });
}

btnAddDay.addEventListener('click', function() {
    const d2 = new Date(dateToInput.value);
    d2.setDate(d2.getDate() + 1);
    dateToInput.value = d2.toISOString().split('T')[0];
    syncDaysWithDate();
});

dateFromInput.addEventListener('change', syncDaysWithDate);
dateToInput.addEventListener('change', syncDaysWithDate);


// ============================================
// 3. 行程操作 (Add / Remove)
// ============================================

// 封装一个创建 DOM 元素的函数，供 Add 按钮和 Load 功能共用
function createTripItemDOM(p, dayIndex) {
    const li = document.createElement('li');
    li.className = 'trip-item';
    
    // 保存 ID 到 dataset
    li.dataset.id = p.id; 
    li.dataset.lat = p.lat; 
    li.dataset.lng = p.lng; 
    li.dataset.ele = p.ele; 
    li.dataset.price = p.price; 
    li.dataset.name = p.name;
    // ★★★ 修改点 3：将 Time 存入 dataset ★★★
    li.dataset.time = p.time; 
    
    const color = routeColors[(dayIndex - 1) % routeColors.length];
    li.style.borderLeftColor = color;

    // ★★★ 修改点 4：在 HTML 中显示 Time (Clock Icon) ★★★
    li.innerHTML = `
        <div class="item-info">
            <span class="item-name">${p.name}</span>
            <span class="item-meta">
                <i class="fa-regular fa-clock"></i> ${p.time} &nbsp;|&nbsp; Ele: ${p.ele}m
            </span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
            <span class="item-price">$${p.price}</span>
            <i class="fa-solid fa-xmark item-remove" onclick="window.removePoint(this)"></i>
        </div>
    `;
    return li;
}

window.addToPlan = function(idString) {
    const p = poiData.find(x => x.id === idString);
    if (!p) return;

    const selectEl = document.getElementById(`targetDaySelect-${idString}`);
    const targetDayId = selectEl ? selectEl.value : null;

    if(!targetDayId) {
        alert("Please select a day first.");
        return;
    }
    
    const list = document.getElementById(targetDayId);
    if (!list) return; 

    // 使用封装的函数创建卡片
    const dayIndex = parseInt(targetDayId.replace('day', ''));
    const li = createTripItemDOM(p, dayIndex);

    list.appendChild(li);
    map.closePopup();
    updateGlobalState(true); 
};

window.removePoint = function(el) {
    el.closest('li').remove();
    updateGlobalState(false);
};


// ============================================
// 4. 全局计算 (Cost, Chart, Routing)
// ============================================

async function updateGlobalState(isNewAdd) {
    let totalCost = 0;
    let allPointsFlat = []; 
    let groupedPoints = []; 
    
    const allLists = document.querySelectorAll('.waypoint-list');
    
    allLists.forEach((list) => {
        const dayPoints = [];
        const items = list.querySelectorAll('.trip-item');
        
        items.forEach(item => {
            totalCost += parseInt(item.dataset.price || 0);
            const p = {
                lat: parseFloat(item.dataset.lat),
                lng: parseFloat(item.dataset.lng),
                ele: parseInt(item.dataset.ele || 0),
                name: item.dataset.name,
                // 这里也可以获取 item.dataset.time 如果需要计算总时间
                time: item.dataset.time 
            };
            dayPoints.push(p);
            allPointsFlat.push(p);
        });
        
        if(dayPoints.length > 0) groupedPoints.push(dayPoints);
    });

    const costEl = document.getElementById('totalCostDisplay');
    costEl.innerText = `$${totalCost}`;
    document.getElementById('totalStopsDisplay').innerText = allPointsFlat.length;

    const budgetLimit = parseInt(document.getElementById('budgetInput').value) || 0;
    if (totalCost > budgetLimit) {
        costEl.classList.add('over-budget'); 
        if (isNewAdd) {
            alert(`⚠️ Budget Exceeded!\nCurrent: $${totalCost} / Limit: $${budgetLimit}`);
        }
    } else {
        costEl.classList.remove('over-budget');
    }

    await updateRoute(groupedPoints); 
    updateChart(allPointsFlat);
}

document.getElementById('budgetInput').addEventListener('input', () => updateGlobalState(false));


// ============================================
// 5. 辅助功能 (Routing & Chart)
// ============================================

async function updateRoute(groupedPoints) {
    routeLayer.clearLayers();
    
    for (let i = 0; i < groupedPoints.length; i++) {
        const points = groupedPoints[i];
        if (points.length < 2) continue;

        const color = routeColors[i % routeColors.length];
        const coordsString = points.map(p => `${p.lng},${p.lat}`).join(';');
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsString}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.routes && data.routes.length > 0) {
                L.geoJSON(data.routes[0].geometry, {
                    style: { color: color, weight: 6, opacity: 0.9, lineJoin: 'round' }
                }).addTo(routeLayer);
            }
        } catch (e) {
            // Fallback: 直线
            const latlngs = points.map(p => [p.lat, p.lng]);
            L.polyline(latlngs, { color: color, weight: 4, dashArray: '5, 10' }).addTo(routeLayer);
        }
    }
}

let myChart = null;
function updateChart(points) {
    const ctx = document.getElementById('elevationChart').getContext('2d');
    if (myChart) myChart.destroy();
    const chartColor = '#3494a6'; 

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: points.map(p => p.name),
            datasets: [{
                label: 'Elevation (m)', 
                data: points.map(p => p.ele), 
                borderColor: chartColor, 
                backgroundColor: 'rgba(52, 148, 166, 0.2)', 
                fill: true, tension: 0.4, pointRadius: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: false },
            scales: { x: { display: false }, y: { display: true, grid: {color: '#eee'} } }
        }
    });
}


// ============================================
// 6. 本地存储 Save & Load 功能
// ============================================

window.saveTour = function() {
    const saveData = {
        dateFrom: document.getElementById('dateFrom').value,
        dateTo: document.getElementById('dateTo').value,
        budget: document.getElementById('budgetInput').value,
        itinerary: {} 
    };

    // 遍历每一天，收集 ID
    const allLists = document.querySelectorAll('.waypoint-list');
    allLists.forEach((list) => {
        const dayId = list.id; 
        const items = list.querySelectorAll('.trip-item');
        const ids = [];
        items.forEach(item => {
            if (item.dataset.id) ids.push(item.dataset.id);
        });
        if (ids.length > 0) {
            saveData.itinerary[dayId] = ids;
        }
    });

    const storageKey = `yun_saved_tour_${CURRENT_USER_ID}`;
    localStorage.setItem(storageKey, JSON.stringify(saveData));

    alert('Tour Saved locally! You can come back anytime.');
};

const saveBtn = document.querySelector('.btn-save');
if (saveBtn) {
    saveBtn.onclick = window.saveTour;
}

function loadSavedTour() {
    const storageKey = `yun_saved_tour_${CURRENT_USER_ID}`;
    const savedString = localStorage.getItem(storageKey);
    
    if (!savedString) return; 

    console.log("Found saved tour, restoring...");
    const data = JSON.parse(savedString);

    if (data.dateFrom) document.getElementById('dateFrom').value = data.dateFrom;
    if (data.dateTo) document.getElementById('dateTo').value = data.dateTo;
    if (data.budget) document.getElementById('budgetInput').value = data.budget;

    syncDaysWithDate();

    if (data.itinerary) {
        for (const [dayId, ids] of Object.entries(data.itinerary)) {
            const list = document.getElementById(dayId);
            if (!list) continue;

            const dayIndex = parseInt(dayId.replace('day', ''));

            ids.forEach(poiId => {
                const p = poiData.find(x => x.id === poiId);
                if (p) {
                    const li = createTripItemDOM(p, dayIndex);
                    list.appendChild(li);
                }
            });
        }
    }

    updateGlobalState(false);
}

// 启动
initInteractive();