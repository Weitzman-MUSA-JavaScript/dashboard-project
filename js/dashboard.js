import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, addDoc, query, where, orderBy, onSnapshot, Timestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

function getLocalUserId() {
    let id = localStorage.getItem('yun_user_id');
    if (!id) {
        id = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('yun_user_id', id);
    }
    return id;
}
const CURRENT_USER_ID = getLocalUserId();
console.log("Current User ID:", CURRENT_USER_ID);

// 变量定义
const categoryColors = { "Nature": "#3494a6", "Culture": "#1a3c5a", "Food": "#bf4328", "Stay": "#e0b341" };
const activityMapping = { "Floral & Splash": [3, 4, 5], "Mushroom Hunting": [6, 7, 8], "Golden Autumn": [9, 10, 11], "Snow & Sun": [12, 1, 2] };
const monthlyThemes = {
    4: { title: "Floral & Splash", desc: "Experience the Water Splashing Festival and blooming flowers.", emoji: "🌸" },
    7: { title: "Mushroom Hunting", desc: "The rainy season brings delicious wild mushrooms.", emoji: "🍄" },
    10: { title: "Golden Autumn", desc: "Golden rice terraces and harvest season.", emoji: "🌾" },
    12: { title: "Snow & Sun", desc: "Enjoy the snow-capped mountains under the warm sun.", emoji: "🏔️" }
};
const categoryImages = {
    "Stay": "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070",
    "Food": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070",
    "Nature": "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1948",
    "Culture": "https://images.unsplash.com/photo-1547823065-4cbbb2d4d185?q=80&w=2070"
};

let poiData = []; 
let userWishlist = new Set();
let map, markers;
let popChart = null; 
let tempChart = null;
let currentDetailPostLocationId = null;

async function initApp() {
    const INITIAL_CENTER = [24.5, 101.5]; 
    const INITIAL_ZOOM = 7;
    map = L.map('dash-map', { zoomControl: false }).setView(INITIAL_CENTER, INITIAL_ZOOM);
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map);
    markers = L.layerGroup().addTo(map);

    // ★★★ 修改点：删除了 loadBoundaries() 调用 ★★★
    await syncWishlist();

    try {
        const response = await fetch('poi_new2_updated_with_pics.geojson');
        const geoJson = await response.json();
        
        poiData = geoJson.features.map(f => {
            const p = f.properties;
            const cost = parseInt(p.Buget?.replace(/[^0-9]/g, '') || 0);
            const activities = [p.Activity, p.Activity2, p.Activity3, p.Activity4].filter(Boolean);
            return {
                id: String(p.osm_id), name: p.name_E || p.name,
                lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0],
                cat: p.Filter, score: parseFloat(p.Score || 0),
                desc: p.Description,
                img: p.Pic || categoryImages[p.Filter] || categoryImages['Nature'],
                fac: [p.Wifi, p.Parking, p.Accessibility, (p.Filter === 'Food' || p.Filter === 'Stay' ? 1 : 0)], 
                link: p.Link, tel: p.Tel_Number || "N/A", time: p.Time || 1, cost: cost, activities: activities
            };
        });

        initBaseCharts();
        renderMap();
        updateMonth(6); 
        loadAllPosts(); 
        initSearch();
        initCreatePostForm(); 

    } catch (error) { console.error("Failed to load POI data:", error); }
}

// ★★★ 修改点：删除了 async function loadBoundaries() {...} 整个函数 ★★★

async function syncWishlist() {
    try {
        const docRef = doc(db, "users", CURRENT_USER_ID);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) userWishlist = new Set(docSnap.data().wishlist.map(String) || []); 
        else await setDoc(docRef, { wishlist: [] });
    } catch(e) {}
}

window.toggleWishlist = async function(btn, poiId) {
    const poiIdStr = String(poiId);
    const docRef = doc(db, "users", CURRENT_USER_ID);
    if (userWishlist.has(poiIdStr)) {
        userWishlist.delete(poiIdStr);
        btn.classList.remove('added');
        btn.innerHTML = '<i class="fa-regular fa-heart"></i> Add to Wishlist';
        await updateDoc(docRef, { wishlist: arrayRemove(poiIdStr) });
    } else {
        userWishlist.add(poiIdStr);
        btn.classList.add('added');
        btn.innerHTML = '<i class="fa-solid fa-heart"></i> Added!';
        await updateDoc(docRef, { wishlist: arrayUnion(poiIdStr) });
    }
    renderMap(); 
};

let activeFilters = new Set(['all']);
let currentMonth = 7; 

function renderMap() {
    markers.clearLayers();
    let currentThemeTag = null;
    for (const [tag, months] of Object.entries(activityMapping)) {
        if (months.includes(currentMonth)) { currentThemeTag = tag; break; }
    }

    let visiblePois = poiData.filter(p => activeFilters.has('all') || activeFilters.has(p.cat));
    const sortedPois = [...visiblePois].sort((a, b) => b.score - a.score);
    const top10Ids = new Set(sortedPois.slice(0, 10).map(p => p.id));
    const rankMap = {};
    sortedPois.slice(0, 10).forEach((p, index) => { rankMap[p.id] = index + 1; });

    visiblePois.forEach(p => {
        let isActivityMatch = (currentThemeTag && p.activities && p.activities.includes(currentThemeTag));
        const isTop10 = top10Ids.has(p.id);
        const isWishlisted = userWishlist.has(p.id);
        const finalOpacity = (isWishlisted || isTop10) ? 1.0 : (isActivityMatch ? 1.0 : 0.4);
        let marker;
        
        if (isWishlisted) {
            let iconHtml = '<i class="fa-solid fa-location-dot"></i>';
            if(p.cat === 'Nature') iconHtml = '<i class="fa-solid fa-mountain"></i>';
            if(p.cat === 'Culture') iconHtml = '<i class="fa-solid fa-landmark"></i>';
            if(p.cat === 'Food') iconHtml = '<i class="fa-solid fa-utensils"></i>';
            if(p.cat === 'Stay') iconHtml = '<i class="fa-solid fa-bed"></i>';
            const size = isActivityMatch ? 34 : 28;
            marker = L.marker([p.lat, p.lng], { 
                icon: L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div class="marker-pin marker-wishlist cat-${p.cat}" style="width:${size}px;height:${size}px;font-size:${size/2}px;opacity:${finalOpacity}">${iconHtml}</div>`,
                    iconSize: [size, size], iconAnchor: [size/2, size/2]
                }) 
            });
        } else if (isTop10) {
            const rank = rankMap[p.id];
            const size = 30;
            const iconHtml = `<div style="background:#e74c3c;width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:2px 2px 6px rgba(0,0,0,0.4);border:2px solid white;"><span style="transform:rotate(45deg);color:white;font-weight:bold;font-family:Arial;font-size:14px;">${rank}</span></div>`;
            marker = L.marker([p.lat, p.lng], { 
                icon: L.divIcon({ className: 'custom-div-icon', html: iconHtml, iconSize: [size, size], iconAnchor: [size/2, size + 5] }),
                opacity: finalOpacity
            });
        } else {
            let color = categoryColors[p.cat] || '#3494a6';
            marker = L.circleMarker([p.lat, p.lng], { radius: isActivityMatch ? 8 : 5, fillColor: color, color: '#fff', weight: 1, fillOpacity: finalOpacity, opacity: finalOpacity });
        }
        
        marker.bindPopup(createPopupContent(p, isWishlisted), { maxWidth: 400, minWidth: 300, className: 'custom-popup-wrapper' });
        p.markerRef = marker;
        marker.on('click', function() { map.flyTo([p.lat, p.lng], 13, { duration: 1.5 }); window.loadPostsForLocation(p.id, p.name); });
        markers.addLayer(marker);
    });
    updateRankChart(visiblePois);
}

function createPopupContent(poi, isAdded) {
    const btnClass = isAdded ? 'added' : '';
    const btnText = isAdded ? '<i class="fa-solid fa-heart"></i> Added!' : '<i class="fa-regular fa-heart"></i> Add to Wishlist';
    const iconsConfig = [{ c: 'fa-solid fa-wifi', t: 'WiFi' }, { c: 'fa-solid fa-square-parking', t: 'Parking' }, { c: 'fa-solid fa-wheelchair', t: 'Accessible' }, { c: 'fa-solid fa-utensils', t: 'Dining' }];
    let facHtml = poi.fac.map((has, i) => `<i class="${iconsConfig[i].c} fac-item ${has?'active':''}" title="${iconsConfig[i].t}"></i>`).join('');
    return `<div class="custom-popup"><div class="popup-left"><img src="${poi.img}" class="popup-img" onerror="this.src='https://via.placeholder.com/120'"><a href="${poi.link}" target="_blank" class="official-link-btn">Trip.com Link</a></div><div class="popup-right"><div class="popup-top-actions"><div class="action-icon" onclick="alert('Tel: ${poi.tel}')"><i class="fa-solid fa-phone"></i></div></div><div class="popup-title">${poi.name}</div><div class="popup-meta-row"><span><i class="fa-solid fa-star"></i> Score: ${poi.score}</span><span style="color:#ddd">|</span><span><i class="fa-solid fa-sack-dollar"></i> $${poi.cost}</span></div><div class="popup-meta-row"><span><i class="fa-regular fa-clock"></i> Rec. Time: ${poi.time} h</span></div><div class="popup-desc">${poi.desc}</div><div class="popup-facilities">${facHtml}</div><button class="popup-wishlist-btn ${btnClass}" onclick="window.toggleWishlist(this, '${poi.id}')">${btnText}</button></div></div>`;
}

function initSearch() {
    const searchInput = document.getElementById('poiSearchInput');
    const resultsList = document.getElementById('searchResults');
    searchInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        resultsList.innerHTML = '';
        if (val.length < 1) { resultsList.classList.remove('show'); return; }
        const matches = poiData.filter(p => p.name.toLowerCase().includes(val)).slice(0, 6); 
        if (matches.length > 0) {
            matches.forEach(p => {
                const li = document.createElement('li');
                li.className = 'search-item';
                li.innerHTML = `<span>${p.name}</span> <span class="search-item-cat">${p.cat}</span>`;
                li.onclick = () => {
                    searchInput.value = ''; resultsList.classList.remove('show');
                    if(!activeFilters.has('all') && !activeFilters.has(p.cat)) {
                        activeFilters.clear(); activeFilters.add('all');
                        document.querySelectorAll('.tag').forEach(t => t.classList.toggle('active', t.dataset.cat === 'all'));
                        renderMap(); 
                    }
                    map.flyTo([p.lat, p.lng], 14, { duration: 1.5 });
                    setTimeout(() => { if (p.markerRef) { p.markerRef.openPopup(); window.loadPostsForLocation(p.id, p.name); } }, 1000);
                };
                resultsList.appendChild(li);
            });
            resultsList.classList.add('show');
        } else { resultsList.classList.remove('show'); }
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('.search-wrapper')) resultsList.classList.remove('show'); });
}

document.querySelectorAll('.tag').forEach(tag => {
    tag.addEventListener('click', (e) => {
        const selectedCat = e.target.dataset.cat;
        if (selectedCat === 'all') { activeFilters.clear(); activeFilters.add('all'); } 
        else {
            activeFilters.delete('all');
            if (activeFilters.has(selectedCat)) activeFilters.delete(selectedCat); else activeFilters.add(selectedCat);
            if (activeFilters.size === 0) activeFilters.add('all');
        }
        document.querySelectorAll('.tag').forEach(t => t.classList.toggle('active', activeFilters.has(t.dataset.cat)));
        renderMap();
    });
});
document.getElementById('monthSlider').addEventListener('input', (e) => updateMonth(e.target.value - 1));

function updateMonth(mIndex) {
    currentMonth = mIndex + 1;
    document.getElementById('monthDisplay').innerText = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][mIndex];
    let themeKey = 4;
    if (monthlyThemes[currentMonth]) themeKey = currentMonth;
    else if ([12, 1, 2].includes(currentMonth)) themeKey = 12;
    else if ([6, 7, 8].includes(currentMonth)) themeKey = 7;
    else if ([9, 10, 11].includes(currentMonth)) themeKey = 10;
    
    const theme = monthlyThemes[themeKey];
    document.getElementById('themeTitle').innerText = theme.title;
    document.getElementById('themeDesc').innerText = theme.desc;
    document.getElementById('themeEmoji').innerText = theme.emoji;

    if (tempChart) {
        const pointColors = new Array(12).fill('rgba(191, 67, 40, 0.0)');
        pointColors[mIndex] = '#bf4328';
        tempChart.data.datasets[0].pointBackgroundColor = pointColors;
        tempChart.data.datasets[0].pointRadius = pointColors.map(c => c === '#bf4328' ? 5 : 0);
        tempChart.update();
        document.getElementById('dispTemp').innerText = `${tempChart.data.datasets[0].data[mIndex]}°C`;
        document.getElementById('dispRain').innerText = `${tempChart.data.datasets[1].data[mIndex]}mm`;
    }
    renderMap();
}

function initBaseCharts() {
    const ctxPop = document.getElementById('popChart').getContext('2d');
    popChart = new Chart(ctxPop, { type: 'bar', data: { labels: [], datasets: [] }, options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: false }, scales: { x: { display: false }, y: { grid: { display: false } } } } });
    const ctxTemp = document.getElementById('tempChart').getContext('2d');
    tempChart = new Chart(ctxTemp, { type: 'bar', data: { labels: ['J','F','M','A','M','J','J','A','S','O','N','D'], datasets: [{ type: 'line', label: 'Temp', data: [8,10,13,16,19,22,23,22,20,17,12,9], borderColor: '#bf4328', pointBackgroundColor: '#bf4328', tension: 0.4, yAxisID: 'y' }, { type: 'bar', label: 'Rain', data: [5,10,15,30,80,150,180,160,100,50,20,10], backgroundColor: 'rgba(52, 148, 166, 0.6)', yAxisID: 'y1' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: false }, scales: { x: { grid: { display: false } }, y: { display: false }, y1: { display: false } } } });
}

function updateRankChart(visiblePois) {
    if (!popChart) return;
    const sorted = [...visiblePois].sort((a, b) => b.score - a.score).slice(0, 10);
    popChart.data.labels = sorted.map(p => p.name.length > 12 ? p.name.substring(0, 10) + '..' : p.name);
    popChart.data.datasets = [{ data: sorted.map(p => p.score), backgroundColor: sorted.map(p => categoryColors[p.cat] || '#3494a6'), borderRadius: 4, barPercentage: 0.7 }];
    popChart.update();
}

window.handleHomeClick = function() {
    map.flyTo([24.5, 101.5], 7, { duration: 1.5 });
    currentSelectedLocationId = null;
    window.loadAllPosts(); 
    window.showSection('home');
    document.querySelectorAll('.tag').forEach(t => t.classList.remove('active'));
    document.querySelector('.tag[data-cat="all"]').classList.add('active');
    activeFilters.clear(); activeFilters.add('all');
    renderMap();
}

window.resetMapView = function() { window.handleHomeClick(); };

const contentArea = document.getElementById('appContentArea');
const createPostContainer = document.getElementById('createPostContainer');
let currentSelectedLocationId = null; 

window.loadPostsForLocation = function(poiId, poiName) {
    currentSelectedLocationId = poiId;
    updateLocationBadge(poiName, 'location', false);
    fetchPosts(poiId);
};

window.loadAllPosts = function() {
    currentSelectedLocationId = null;
    updateLocationBadge('All Yunnan', 'globe', false);
    fetchPosts(null);
};

window.loadMyPosts = function() {
    updateLocationBadge('My Posts', 'user', false);
    fetchPosts(null, true);
};

window.handleLocationBadgeClick = function() {
    if (contentArea.querySelector('.detail-view-container') && currentDetailPostLocationId) {
        const loc = poiData.find(p => p.id === currentDetailPostLocationId);
        if (loc) window.loadPostsForLocation(loc.id, loc.name);
    }
};

function updateLocationBadge(text, iconType, clickable) {
    const badge = document.getElementById('currentLocationTag');
    let icon = iconType === 'location' ? 'fa-location-dot' : (iconType === 'user' ? 'fa-user' : 'fa-globe');
    if(badge) {
        badge.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${text}</span>`;
        if (clickable) badge.classList.add('clickable'); else badge.classList.remove('clickable');
    }
}

function fetchPosts(locationId = null, onlyMine = false) {
    contentArea.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">Loading feeds...</div>';
    let q = collection(db, "posts");
    let constraints = [orderBy("timestamp", "desc")];
    if (locationId) constraints.push(where("locationId", "==", String(locationId)));
    if (onlyMine) constraints.push(where("userId", "==", CURRENT_USER_ID));
    
    const finalQuery = query(q, ...constraints);
    onSnapshot(finalQuery, (snapshot) => {
        let posts = [];
        snapshot.forEach(doc => posts.push({ id: doc.id, ...doc.data() }));
        renderFeedHTML(posts);
    });
}

function renderFeedHTML(posts) {
    if (posts.length === 0) { contentArea.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">No posts found.</div>'; return; }
    let html = '<div class="feed-container">';
    posts.forEach(item => {
        const likeCount = item.likes ? item.likes.length : 0;
        html += `<div class="feed-card" onclick="window.showPostDetail('${item.id}')">
            <img src="${item.img}" class="feed-img">
            <div class="feed-info"><div class="feed-title">${item.title}</div><div class="feed-meta"><div class="user-info"><div class="avatar"></div><span>${item.user}</span></div><div class="like-box"><i class="fa-regular fa-heart"></i> ${likeCount}</div></div></div></div>`;
    });
    html += '</div>';
    contentArea.innerHTML = html;
}

window.showPostDetail = async function(docId) {
    const docRef = doc(db, "posts", docId);
    onSnapshot(docRef, (docSnap) => {
        if (!docSnap.exists()) return;
        const item = { id: docSnap.id, ...docSnap.data() };
        currentDetailPostLocationId = item.locationId;
        updateLocationBadge(item.locationName || "Unknown Location", "location", true);
        const likes = item.likes || [];
        const isLiked = likes.includes(CURRENT_USER_ID);
        const comments = item.comments || [];
        let commentsHtml = comments.map(c => `<div class="comment-item"><span class="comment-user">${c.user}:</span>${c.text}</div>`).join('');
        
        const detailHtml = `
            <div class="detail-view-container" style="padding:20px; background:white; min-height:100%;">
                <div style="display:flex;align-items:center;margin-bottom:15px;color:#666;cursor:pointer;" onclick="window.showSection('home')"><i class="fa-solid fa-arrow-left"></i> &nbsp; Back to Feed</div>
                <img src="${item.img}" style="width:100%;border-radius:12px;margin-bottom:15px;">
                <h2 style="font-size:1.2rem;margin-bottom:5px;">${item.title}</h2>
                <div style="font-size:0.8rem;color:#999;margin-bottom:10px;"><i class="fa-solid fa-location-dot"></i> ${item.locationName}</div>
                <div style="display:flex;gap:10px;align-items:center;margin-bottom:15px;"><div class="avatar" style="width:30px;height:30px;"></div><span style="font-weight:bold;">${item.user}</span></div>
                <p style="color:#555;line-height:1.5;">${item.content}</p>
                <div class="detail-actions">
                    <button class="${isLiked ? 'action-btn liked' : 'action-btn'}" onclick="window.toggleLike('${item.id}')"><i class="${isLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart'}"></i> ${likes.length} Likes</button>
                    <button class="action-btn"><i class="fa-regular fa-comment"></i> ${comments.length} Comments</button>
                </div>
                <div class="comments-section">
                    <div class="comment-input-box"><input type="text" id="commentInput-${item.id}" class="comment-input" placeholder="Add a comment..."><button class="comment-submit-btn" onclick="window.submitComment('${item.id}')">Post</button></div>
                    <div class="comment-list">${commentsHtml}</div>
                </div>
            </div>`;
        contentArea.innerHTML = detailHtml;
    });
};

window.toggleLike = async function(postId) {
    const docRef = doc(db, "posts", postId);
    const docSnap = await getDoc(docRef);
    if(docSnap.exists()){
        const likes = docSnap.data().likes || [];
        if(likes.includes(CURRENT_USER_ID)) await updateDoc(docRef, { likes: arrayRemove(CURRENT_USER_ID) });
        else await updateDoc(docRef, { likes: arrayUnion(CURRENT_USER_ID) });
    }
};

window.submitComment = async function(postId) {
    const input = document.getElementById(`commentInput-${postId}`);
    const text = input.value.trim();
    if(!text) return;
    await updateDoc(doc(db, "posts", postId), { comments: arrayUnion({ user: "User " + CURRENT_USER_ID.substr(-3), text: text, time: Timestamp.now() }) });
    input.value = '';
};

window.showSection = function(section) {
    createPostContainer.style.display = 'none';
    contentArea.style.display = 'block';
    
    if (section === 'home') {
        if (!currentSelectedLocationId) window.loadAllPosts();
        else fetchPosts(currentSelectedLocationId);
    } else if (section === 'create') {
        contentArea.style.display = 'none';
        createPostContainer.style.display = 'flex';
        resetCreateForm();
    } else if (section === 'me') {
        window.loadMyPosts();
    }
};

function initCreatePostForm() {
    const imgInput = document.getElementById('postImageInput');
    const preview = document.getElementById('imgPreview');
    if (imgInput) {
        imgInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    preview.style.backgroundImage = `url(${e.target.result})`;
                    preview.style.display = 'block';
                    preview.dataset.base64 = e.target.result; 
                };
                reader.readAsDataURL(file);
            }
        });
    }

    const locInput = document.getElementById('newPostLocation');
    const locResults = document.getElementById('postLocationResults');
    if (locInput) {
        locInput.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            locResults.innerHTML = '';
            if(val.length < 1) { locResults.classList.remove('show'); return; }
            const matches = poiData.filter(p => p.name.toLowerCase().includes(val)).slice(0, 8);
            if (matches.length > 0) {
                matches.forEach(p => {
                    const li = document.createElement('li');
                    li.className = 'search-item';
                    li.innerHTML = `<span>${p.name}</span>`;
                    li.onclick = () => {
                        locInput.value = p.name;
                        document.getElementById('newPostLocationId').value = p.id;
                        locResults.classList.remove('show');
                    };
                    locResults.appendChild(li);
                });
                locResults.classList.add('show');
            } else { locResults.classList.remove('show'); }
        });
        
        document.addEventListener('click', (e) => { if (!e.target.closest('.location-input-wrapper')) locResults.classList.remove('show'); });
    }
}

function resetCreateForm() {
    document.getElementById('newPostTitle').value = '';
    document.getElementById('newPostContent').value = '';
    document.getElementById('postImageInput').value = '';
    const preview = document.getElementById('imgPreview');
    preview.style.display = 'none';
    delete preview.dataset.base64;
    
    const locInput = document.getElementById('newPostLocation');
    const locIdInput = document.getElementById('newPostLocationId');
    
    if (currentSelectedLocationId) {
        const loc = poiData.find(p => p.id === currentSelectedLocationId);
        if (loc) {
            locInput.value = loc.name;
            locIdInput.value = loc.id;
        }
    } else {
        locInput.value = '';
        locIdInput.value = '';
    }
}

window.submitNewPost = async function() {
    const title = document.getElementById('newPostTitle').value;
    const content = document.getElementById('newPostContent').value;
    const locId = document.getElementById('newPostLocationId').value;
    const locName = document.getElementById('newPostLocation').value;
    const imgBase64 = document.getElementById('imgPreview').dataset.base64;

    if (!title) return alert("Please add a title!");
    if (!content) return alert("Write something!");
    if (!locId || !locName) return alert("Please search and click a valid location from the list!");

    const finalImg = imgBase64 || "https://images.unsplash.com/photo-1504280590459-f2f293b9e597?q=80&w=2070";

    try {
        await addDoc(collection(db, "posts"), {
            title: title, content: content,
            locationId: String(locId), locationName: locName,
            userId: CURRENT_USER_ID, user: "User " + CURRENT_USER_ID.substr(-3),
            likes: [], comments: [], img: finalImg, timestamp: Timestamp.now()
        });
        window.handleHomeClick(); 
    } catch (e) { 
        alert("Failed to post: " + e.message + " (Image might be too large)"); 
    }
};

window.resetFeed = function() {
    window.handleHomeClick();
};

initApp();