document.addEventListener('DOMContentLoaded', function() {
    
    // --- 1. Map Init (Zoom Enabled) ---
    const map = L.map('map', {
        zoomControl: true, 
        scrollWheelZoom: false, 
        doubleClickZoom: true, 
        dragging: true, 
        attributionControl: false
    }).setView([22.785, 100.97], 9);

    map.zoomControl.setPosition('topright');

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', {
        maxZoom: 19, attribution: '&copy; CARTO'
    }).addTo(map);

    // --- 2. Color Definitions ---
    const categoryColors = {
        'Nature': '#3494a6', 
        'Culture': '#1a3c5a', 
        'Food': '#bf4328',    
        'Stay': '#e0b341'     
    };

    // Layer Groups
    const storyLayer = L.layerGroup().addTo(map);
    const routeLayer = L.layerGroup().addTo(map);
    const indicatorLayer = L.layerGroup().addTo(map);

    // --- 3. Fractal Path Logic (Tea Horse Road) ---
    const keyLocations = {
        puer: [22.785, 100.97],
        dali: [25.69, 100.16],
        lijiang: [26.87, 100.23],
        snowmtn: [27.09, 100.20],
        shangrila: [27.82, 99.70]
    };

    function generateFractalPath(start, end, roughness = 0.5, iterations = 6) {
        let points = [start, end];
        for (let i = 0; i < iterations; i++) {
            let nextPoints = [];
            for (let j = 0; j < points.length - 1; j++) {
                const p1 = points[j];
                const p2 = points[j + 1];
                let midLat = (p1[0] + p2[0]) / 2;
                let midLng = (p1[1] + p2[1]) / 2;
                const dist = Math.sqrt(Math.pow(p2[0]-p1[0], 2) + Math.pow(p2[1]-p1[1], 2));
                const angle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
                const perpAngle = angle + (Math.PI / 2);
                const jitterAmount = (Math.random() - 0.5) * dist * roughness;
                midLat += Math.cos(perpAngle) * jitterAmount;
                midLng += Math.sin(perpAngle) * jitterAmount;
                nextPoints.push(p1);
                nextPoints.push([midLat, midLng]);
            }
            nextPoints.push(points[points.length - 1]);
            points = nextPoints;
            roughness *= 0.55; 
        }
        return points;
    }

    let fullPath = [];
    fullPath = fullPath.concat(generateFractalPath(keyLocations.puer, keyLocations.dali, 0.6, 6));
    fullPath = fullPath.concat(generateFractalPath(keyLocations.dali, keyLocations.lijiang, 0.4, 6));
    fullPath = fullPath.concat(generateFractalPath(keyLocations.lijiang, keyLocations.snowmtn, 0.9, 7));
    fullPath = fullPath.concat(generateFractalPath(keyLocations.snowmtn, keyLocations.shangrila, 0.5, 6));

    L.polyline(fullPath, { color: '#ffffff', weight: 6, opacity: 0.7, lineCap: 'round', lineJoin: 'round' }).addTo(routeLayer);
    L.polyline(fullPath, { color: '#8b4513', weight: 2.5, opacity: 1, dashArray: '4, 6', lineCap: 'round', lineJoin: 'round' }).addTo(routeLayer);

    function updateLocationIndicator(coords) {
        indicatorLayer.clearLayers();
        L.circleMarker(coords, {
            radius: 8, fillColor: '#8b4513', color: '#fff', weight: 3, fillOpacity: 1, zIndexOffset: 1000
        }).addTo(indicatorLayer);
    }

    // --- 4. Configurations ---
    const chapters = [
        {
            id: 'step-0', // Pu'er
            center: [22.785, 100.97],
            zoom: 10,
            legendTitle: "Seasonal Activities",
            render: (data) => {
                updateLocationIndicator(keyLocations.puer); 
                data.features.forEach(f => {
                    const lat = f.geometry.coordinates[1];
                    if (lat < 24) {
                        const props = f.properties;
                        const actCount = [props.Activity, props.Activity2, props.Activity3, props.Activity4].filter(Boolean).length;
                        const radius = 5 + (actCount * 4);
                        const color = categoryColors[props.Filter] || '#999';

                        L.circleMarker([f.geometry.coordinates[1], f.geometry.coordinates[0]], {
                            radius: radius, fillColor: color, color: 'white', weight: 1, opacity: 1, fillOpacity: 0.8
                        })
                        .bindTooltip(props.name_E || props.name, { direction: 'top' })
                        .addTo(storyLayer);
                    }
                });
                return `
                    <div class="legend-item"><span class="legend-color" style="background:${categoryColors.Nature}"></span> Nature</div>
                    <div class="legend-item"><span class="legend-color" style="background:${categoryColors.Culture}"></span> Culture</div>
                    <div class="legend-item"><span class="legend-color" style="background:${categoryColors.Food}"></span> Food</div>
                    <div class="legend-item"><span class="legend-color" style="background:${categoryColors.Stay}"></span> Stay</div>
                `;
            }
        },
        {
            id: 'step-1', // Dali
            center: [25.69, 100.16],
            zoom: 12,
            legendTitle: "Accommodation Cost",
            render: (data) => {
                updateLocationIndicator(keyLocations.dali); 
                data.features.forEach(f => {
                    const lat = f.geometry.coordinates[1];
                    const cat = f.properties.Filter;
                    if (lat > 25 && lat < 26.5 && cat === 'Stay') {
                        const rawPrice = f.properties.Buget || '$?';
                        const price = rawPrice.replace('/person', ''); // 去掉 /person
                        const icon = L.divIcon({
                            className: 'custom-div-icon',
                            html: `<div class="price-bubble">${price}</div>`,
                            iconSize: [60, 30],
                            iconAnchor: [30, 30]
                        });
                        L.marker([f.geometry.coordinates[1], f.geometry.coordinates[0]], { icon: icon })
                        .bindTooltip(f.properties.name_E || f.properties.name, { direction: 'top' }) // 添加 tooltip
                        .addTo(storyLayer);
                    }
                });
                return `
                    <div class="legend-item"><i class="fa-solid fa-bed" style="color:${categoryColors.Stay}; margin-right:8px;"></i> Hotels Only</div>
                    <div style="font-size:0.8em; color:#555;">Bubbles show price/night</div>
                `;
            }
        },
        {
            id: 'step-2', // Lijiang
            center: [27.00, 100.20],
            zoom: 10,
            legendTitle: "Elevation Zones",
            render: (data) => {
                updateLocationIndicator(keyLocations.lijiang); 
                data.features.forEach(f => {
                    const lat = f.geometry.coordinates[1];
                    if (lat > 26.5 && lat < 27.5) {
                        const ele = f.properties.Elevation || 0;
                        let color = categoryColors.Nature; 
                        if(ele > 2400) color = categoryColors.Stay; 
                        if(ele > 3000) color = categoryColors.Food; 

                        L.circleMarker([f.geometry.coordinates[1], f.geometry.coordinates[0]], {
                            radius: 8, fillColor: color, color: 'white', weight: 2, fillOpacity: 0.9
                        })
                        .bindTooltip(`Ele: ${ele}m`, { direction: 'top' })
                        .addTo(storyLayer);
                    }
                });
                return `
                    <div class="legend-item"><span class="legend-color" style="background:${categoryColors.Nature}"></span> < 2400m</div>
                    <div class="legend-item"><span class="legend-color" style="background:${categoryColors.Stay}"></span> 2400m - 3000m</div>
                    <div class="legend-item"><span class="legend-color" style="background:${categoryColors.Food}"></span> > 3000m</div>
                `;
            }
        },
        {
            id: 'step-3', // Shangri-La
            center: [27.82, 99.70],
            zoom: 11,
            legendTitle: "Cultural Sites",
            render: (data) => {
                updateLocationIndicator(keyLocations.shangrila); 
                data.features.forEach(f => {
                    const lat = f.geometry.coordinates[1];
                    if (lat > 27.5 && f.properties.Filter === 'Culture') {
                        const icon = L.divIcon({
                            className: 'custom-target',
                            html: `<div class="target-icon"><div class="target-ring"></div><div class="target-dot"></div></div>`,
                            iconSize: [30, 30],
                            iconAnchor: [15, 15]
                        });
                        L.marker([f.geometry.coordinates[1], f.geometry.coordinates[0]], { icon: icon })
                        .bindTooltip(f.properties.name_E || "Unknown", { direction: 'top' })
                        .addTo(storyLayer);
                    }
                });
                return `
                    <div class="legend-item"><span class="legend-color" style="border: 2px solid ${categoryColors.Culture}; background:transparent;"></span> Cultural Site</div>
                `;
            }
        },
        {
            id: 'step-4', // End
            center: [25.5, 100.5],
            zoom: 7,
            legendTitle: "",
            render: () => { indicatorLayer.clearLayers(); return ""; } 
        }
    ];

    // --- 5. Load Data & Run (USING FETCH WITH NEW FILENAME) ---
    // 确保 poi_new2_updated_with_pics.geojson 和 html 在同一个文件夹
    fetch('poi_new2_updated_with_pics.geojson')
        .then(res => res.json())
        .then(geojsonData => {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const stepId = entry.target.id;
                        const config = chapters.find(c => c.id === stepId);
                        
                        if (config) {
                            map.flyTo(config.center, config.zoom, { animate: true, duration: 1.5 });
                            storyLayer.clearLayers();
                            const legendHTML = config.render(geojsonData);

                            const legendBox = document.getElementById('map-legend');
                            if(legendHTML) {
                                legendBox.style.display = 'block';
                                legendBox.innerHTML = `<strong>${config.legendTitle}</strong><hr style="margin:5px 0; border:0; border-top:1px solid rgba(0,0,0,0.1);">` + legendHTML;
                            } else {
                                legendBox.style.display = 'none';
                            }

                            document.querySelectorAll('.story-step').forEach(el => el.classList.remove('active'));
                            entry.target.classList.add('active');
                        }
                    }
                });
            }, { rootMargin: '-40% 0px -40% 0px', threshold: 0 });

            document.querySelectorAll('.story-step').forEach(step => observer.observe(step));
        })
        .catch(error => {
            console.error('Error loading GeoJSON:', error);
            // 这里可以加一个 alert 提醒文件加载失败，方便排查
            // alert('无法加载数据文件，请确保使用了 Live Server 打开网页！');
        });

    setTimeout(() => { map.invalidateSize(); }, 200);
});