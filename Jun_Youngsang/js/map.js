mapboxgl.accessToken = 'pk.eyJ1IjoieWptYXJrIiwiYSI6ImNtMHlwOG81NTBxZ2kya3BsZXp5MXJ5Z2wifQ.ijwd5rmGXOOJtSao2rNQhg';

    const map = new mapboxgl.Map({
        container: 'map',
        // Choose from Mapbox's core styles, or make your own style with Mapbox Studio
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: [-98, 38.88],
        maxZoom: 15,
        minZoom: 1,
        zoom: 3
    });

    // 마우스 오버/아웃을 위한 전역 변수
    let hoveredPolygonId = null;
    let bases = [];

    const nav = new mapboxgl.NavigationControl();
    map.addControl(new mapboxgl.ScaleControl());
    // Holds visible airport features for filtering
    map.addControl(nav, 'top-left');
    
    const popup = new mapboxgl.Popup({ closeOnClick: false })
    .setLngLat([-96, 62.8])
    .setHTML(`
        <h1>DefenseBoard</h1>
        <h2>About DefenseBoard</h2>
        <p>- DefenseBoard is a dashboard that uses spatial data to link various types of attributes in the defense sector such as military personnel, facilities, budget, logistics, etc. </p>
        <p>- The map on the right displays publicly accessible base locations across the United States, while on the left, users can view attribute data by base, military unit, or region.</p>
        <p>- Users can also access congressional inquiries and related laws and regulations via links.</p>
        <h2>Notes</h2>
        <p>- The DoD installations are commonly referred to as a base, camp, post, station, yard, center, homeport facility for any ship, or other activity under the jurisdiction, custody, control of the DoD. Publicly releasable locations of DoD Sites in the 50 states, Puerto Rico, and Guam available through data.gov.</p>
        <p>- This dataset was created from source data provided by the four Military Service Component headquarters and was compiled by the Defense Installation Spatial Data Infrastructure (DISDI) Program within the Office of the Deputy Under Secretary of Defense for Installations and Environment, Business Enterprise Integration Directorate. Sites were selected from the 2009 Base Structure Report (BSR), a summary of the DoD Real Property Inventory.</p>
        <p>- The military facility budgets per base for 2023-2025 used in DefenseBoard are fictitious and do not reflect actual data.</p>
        <h2>Reference</h2>
        <p>https://comptroller.defense.gov/Budget-Materials/Budget2025/#press</p>
    `)
    .addTo(map);

    const filterEl = document.getElementById('feature-filter');
    const listingEl = document.getElementById('feature-listing');

    function renderListings(features) {
        const empty = document.createElement('p');
        // Clear any existing listings
        listingEl.innerHTML = '';
        
        features = features.sort((a, b) => {
            return a.properties['siteName'].localeCompare(
              b.properties['siteName']
            );
          })

        if (features.length) {
            for (const feature of features) {
                const itemLink = document.createElement('a');
                const label = `${feature.properties.siteName} (${feature.properties.siteReportingComponent})`;
                let currentPopup = null; 
                itemLink.href = '#';
                itemLink.textContent = label;
                itemLink.addEventListener('mouseover', () => {
                    const coordinates = feature.geometry.coordinates;
                    const center = Array.isArray(coordinates[0]) ? coordinates[0][0] : coordinates;
                    
                    if (currentPopup) {
                        currentPopup.remove();
                    }
                
                    // 새 팝업 생성 및 전역 변수에 저장
                    currentPopup = new mapboxgl.Popup()
                        .setLngLat(center)
                        .setHTML(label) 
                        .addTo(map);
                });
                itemLink.addEventListener('mouseout', () => {
                    if (currentPopup) {
                        currentPopup.remove();
                        currentPopup = null; // 팝업 변수 초기화
                    }
                });
                itemLink.addEventListener('click', (e) => {
                    e.preventDefault(); // 기본 동작 방지
    
                    const coordinates = feature.geometry.coordinates;
                    const center = Array.isArray(coordinates[0]) ? coordinates[0][0] : coordinates;
    
                    map.flyTo({
                        center: center,
                        zoom: 9, // 원하는 줌 레벨
                        essential: true // 애니메이션 필수로 설정
                    });
                });
                
                
                
                listingEl.appendChild(itemLink);
            }

            // Show the filter input
            filterEl.parentNode.style.display = 'block';
        } else if (features.length === 0 && filterEl.value !== '') {
            empty.textContent = 'No results found';
            listingEl.appendChild(empty);
        } else {
            empty.textContent = 'Drag the map to populate results';
            listingEl.appendChild(empty);

            // Hide the filter input
            filterEl.parentNode.style.display = 'none';

            // remove features filter
            map.setFilter('base-fills', ['has', 'siteReportingComponent']);
        }

        
    }

    function normalize(string) {
        return string.trim().toLowerCase();
    }

    // Because features come from tiled vector data,
    // feature geometries may be split
    // or duplicated across tile boundaries.
    // As a result, features may appear
    // multiple times in query results.
    function getUniqueFeatures(features, comparatorProperty) {
        const uniqueIds = new Set();
        const uniqueFeatures = [];
        for (const feature of features) {
            const id = feature.properties[comparatorProperty];
            if (!uniqueIds.has(id)) {
                uniqueIds.add(id);
                uniqueFeatures.push(feature);
            }
        }
        return uniqueFeatures;
    }

// 레이어 및 소스 추가 함수
    function addLayers() {

        // 소스 추가
        map.addSource('bases', {
            'type': 'geojson',
            'data': './data/layers/updated_geojson_file.geojson'
        });

        // Add a new source from our GeoJSON data and
        // set the 'cluster' option to true. GL-JS will
        // add the point_count property to your source data.
        map.addSource('bases_point', {
            type: 'geojson',
            data: './data/layers/NTAD_Military_Bases_updated_v2.geojson',
            cluster: true,
            clusterMaxZoom: 14, // Max zoom to cluster points on
            clusterRadius: 50,
            clusterProperties: {
              "totalAmount2025": ["+", ["coalesce", ["get", "B2025"], 0]], // amount 속성의 합계를 클러스터에 계산
              "totalAmount2024": ["+", ["coalesce", ["get", "B2024"], 0]], // amount 속성의 합계를 클러스터에 계산
              "totalAmount2023": ["+", ["coalesce", ["get", "B2023"], 0]] // amount 속성의 합계를 클러스터에 계산
          }
        });

        const layers = [
            {
                'id': 'base-borders',
                'source': 'bases',
                'type': 'line',
                'paint': {
                    'line-color': [
                        'match',
                        ['get', 'siteReportingComponent'],
                        'usaf', 'rgba(0, 240, 240, 0.5)',
                        'usa', 'rgba(0, 240, 0, 0.5)',
                        'usmc', 'rgba(240, 0, 0, 0.5)',
                        'usn', 'rgba(0, 0, 240, 0.5)',
                        'rgba(100, 100, 100, 0.5)', 
                    ],
                    'line-width': 4
                }
            },
            {
                'id': 'base-fills',
                'source': 'bases',
                'type': 'fill',
                'paint': {
                    'fill-color': [
                        'match',
                        ['get', 'siteReportingComponent'],
                        'usaf', 'rgba(0, 240, 240, 0.5)',
                        'usa', 'rgba(0, 240, 0, 0.5)',
                        'usmc', 'rgba(240, 0, 0, 0.5)',
                        'usn', 'rgba(0, 0, 240, 0.5)',
                        'rgba(100, 100, 100, 0.5)', 
                      ],
                    'fill-opacity': [
                        'case',
                        ['boolean', ['feature-state', 'hover'], false],
                        1,
                        0.5
                    ]
                }
            },
            {
                id: 'clusters2025',
                type: 'circle',
                source: 'bases_point',
                filter: [
                  'all',
                  ['has', 'point_count'], // 클러스터인 경우에만
                  ['>', ['get', 'totalAmount2025'], 0] // totalAmount > 0인 경우에만
              ],
                paint: {
                    // Use step expressions (https://docs.mapbox.com/style-spec/reference/expressions/#step)
                    // with three steps to implement three types of circles:
                    //   * Blue, 20px circles when point count is less than 100
                    //   * Yellow, 30px circles when point count is between 100 and 750
                    //   * Pink, 40px circles when point count is greater than or equal to 750
                    'circle-color': [
                        'step',
                        ['get', 'totalAmount2025'],
                        '#51bbd6',
                        100000,
                        '#f1f075',
                        750000,
                        '#f28cb1'
                    ],
                    'circle-radius': [
                        'step',
                        ['get', 'totalAmount2025'],
                        20,
                        100000,
                        30,
                        750000,
                        40
                    ]
                },
                layout: {
                    'visibility': 'none' // 기본적으로 비활성화
                }
            },
            {
                id: 'cluster-count2025',
                type: 'symbol',
                source: 'bases_point',
                filter: [
                  'all',
                  ['has', 'point_count'], // 클러스터인 경우에만
                  ['>', ['get', 'totalAmount2025'], 0] // totalAmount > 0인 경우에만
              ],
                layout: {
                    'text-field': '{totalAmount2025}',
                    'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                    'text-size': 12,
                    'visibility': 'none' // 기본적으로 비활성화
                }
            },
            {
                id: 'clusters2024',
                type: 'circle',
                source: 'bases_point',
                filter: [
                  'all',
                  ['has', 'point_count'], // 클러스터인 경우에만
                  ['>', ['get', 'totalAmount2024'], 0] // totalAmount > 0인 경우에만
              ],
                paint: {
                    // Use step expressions (https://docs.mapbox.com/style-spec/reference/expressions/#step)
                    // with three steps to implement three types of circles:
                    //   * Blue, 20px circles when point count is less than 100
                    //   * Yellow, 30px circles when point count is between 100 and 750
                    //   * Pink, 40px circles when point count is greater than or equal to 750
                    'circle-color': [
                        'step',
                        ['get', 'totalAmount2024'],
                        '#51bbd6',
                        100000,
                        '#f1f075',
                        750000,
                        '#f28cb1'
                    ],
                    'circle-radius': [
                        'step',
                        ['get', 'totalAmount2024'],
                        20,
                        100000,
                        30,
                        750000,
                        40
                    ]
                },
                layout: {
                    'visibility': 'none' // 기본적으로 비활성화
                }
            },
            {
                id: 'cluster-count2024',
                type: 'symbol',
                source: 'bases_point',
                filter: [
                  'all',
                  ['has', 'point_count'], // 클러스터인 경우에만
                  ['>', ['get', 'totalAmount2024'], 0] // totalAmount > 0인 경우에만
              ],
                layout: {
                    'text-field': '{totalAmount2024}',
                    'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                    'text-size': 12,
                    'visibility': 'none' // 기본적으로 비활성화
                }
            },
            {
                id: 'clusters2023',
                type: 'circle',
                source: 'bases_point',
                filter: [
                  'all',
                  ['has', 'point_count'], // 클러스터인 경우에만
                  ['>', ['get', 'totalAmount2023'], 0] // totalAmount > 0인 경우에만
              ],
                paint: {
                    // Use step expressions (https://docs.mapbox.com/style-spec/reference/expressions/#step)
                    // with three steps to implement three types of circles:
                    //   * Blue, 20px circles when point count is less than 100
                    //   * Yellow, 30px circles when point count is between 100 and 750
                    //   * Pink, 40px circles when point count is greater than or equal to 750
                    'circle-color': [
                        'step',
                        ['get', 'totalAmount2023'],
                        '#51bbd6',
                        100000,
                        '#f1f075',
                        750000,
                        '#f28cb1'
                    ],
                    'circle-radius': [
                        'step',
                        ['get', 'totalAmount2023'],
                        20,
                        100000,
                        30,
                        750000,
                        40
                    ]
                },
                layout: {
                    'visibility': 'none' // 기본적으로 비활성화
                }
            },
            {
                id: 'cluster-count2023',
                type: 'symbol',
                source: 'bases_point',
                filter: [
                  'all',
                  ['has', 'point_count'], // 클러스터인 경우에만
                  ['>', ['get', 'totalAmount2023'], 0] // totalAmount > 0인 경우에만
              ],
                layout: {
                    'text-field': '{totalAmount2023}',
                    'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                    'text-size': 12,
                    'visibility': 'none' // 기본적으로 비활성화
                }
            },
            {
                id: 'unclustered-point',
                type: 'circle',
                source: 'bases_point',
                filter: ['!', ['has', 'point_count']],
                paint: {
                    'circle-color': '#11b4da',
                    'circle-radius': 4,
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#fff'
                }
            }
        ];
        
        // 모든 레이어 추가
        layers.forEach((layer) => {
            map.addLayer(layer);
        });

        map.on('movestart', () => {
            // reset features filter as the map starts moving
            map.setFilter('base-fills', ['has', 'siteReportingComponent']);
        });

        map.on('moveend', () => {
            const features = map.queryRenderedFeatures({ layers: ['base-fills'] });

            if (features) {
                const uniqueFeatures = getUniqueFeatures(features, 'siteName');
                // Populate features for the listing overlay.
                renderListings(uniqueFeatures);

                // Clear the input container
                filterEl.value = '';

                // Store the current features in sn `airports` variable to
                // later use for filtering on `keyup`.
                bases = uniqueFeatures;
            }
        });

        filterEl.addEventListener('keyup', (e) => {
            const value = normalize(e.target.value);

            // Filter visible features that match the input value.
            const filtered = [];
            for (const feature of bases) {
                const name = normalize(feature.properties.siteName);
                const code = normalize(feature.properties.siteReportingComponent);
                if (name.includes(value) || code.includes(value)) {
                    filtered.push(feature);
                }
            }

            // Populate the sidebar with filtered results
            renderListings(filtered);

            // Set the filter to populate features into the layer.
            if (filtered.length) {
                map.setFilter('base-fills', [
                    'match',
                    ['get', 'siteName'],
                    filtered.map((feature) => {
                        return feature.properties.siteName;
                    }),
                    true,
                    false
                ]);
            }
        });

        // Call this function on initialization
        // passing an empty array to render an empty state
        renderListings([]);
        
        map.on('click', 'base-fills', (e) => {
            // if (currentPopup) {
            //     currentPopup.remove();
            // }
            new mapboxgl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(`${e.features[0].properties.siteName} (${e.features[0].properties.siteReportingComponent})`) 
                .addTo(map);
                const coordinates = e.lngLat;
                const center = Array.isArray(coordinates[0]) ? coordinates[0] : coordinates;
            map.flyTo({
                center: center,
                zoom: 9, // 원하는 줌 레벨
                essential: true // 애니메이션 필수로 설정
            });
        });
        // When the user moves their mouse over the state-fill layer, we'll update the
        // feature state for the feature under the mouse.
        map.on('mousemove', 'base-fills', (e) => {
            if (e.features.length > 0) {
                if (hoveredPolygonId !== null) {
                    map.setFeatureState(
                        { source: 'bases', id: hoveredPolygonId },
                        { hover: false }
                    );
                }
                hoveredPolygonId = e.features[0].installationId;
                map.setFeatureState(
                    { source: 'bases', id: hoveredPolygonId },
                    { hover: true }
                );
            }
        });

        // Change the cursor to a pointer when
        // the mouse is over the states layer.
        map.on('mouseenter', 'base-fills', () => {
            map.getCanvas().style.cursor = 'pointer';
        });

        // Change the cursor back to a pointer
        // when it leaves the states layer.
        // When the mouse leaves the state-fill layer, update the feature state of the
        // previously hovered feature.
        map.on('mouseleave', 'base-fills', () => {
            map.getCanvas().style.cursor = '';
            if (hoveredPolygonId !== null) {
                map.setFeatureState(
                    { source: 'bases', id: hoveredPolygonId },
                    { hover: false }
                );
            }
            hoveredPolygonId = null;
        });
            
        // inspect a cluster on click
        map.on('click', 'clusters2025', (e) => {
            const features = map.queryRenderedFeatures(e.point, {
                layers: ['clusters2025']
            });
            const clusterId = features[0].properties.cluster_id;
            map.getSource('bases_point').getClusterExpansionZoom(
                clusterId,
                (err, zoom) => {
                    if (err) return;

                    map.easeTo({
                        center: features[0].geometry.coordinates,
                        zoom: zoom
                    });
                }
            );
        });
        map.on('click', 'clusters2024', (e) => {
            const features = map.queryRenderedFeatures(e.point, {
                layers: ['clusters2024']
            });
            const clusterId = features[0].properties.cluster_id;
            map.getSource('bases_point').getClusterExpansionZoom(
                clusterId,
                (err, zoom) => {
                    if (err) return;

                    map.easeTo({
                        center: features[0].geometry.coordinates,
                        zoom: zoom
                    });
                }
            );
        });
        map.on('click', 'clusters2023', (e) => {
            const features = map.queryRenderedFeatures(e.point, {
                layers: ['clusters2023']
            });
            const clusterId = features[0].properties.cluster_id;
            map.getSource('bases_point').getClusterExpansionZoom(
                clusterId,
                (err, zoom) => {
                    if (err) return;

                    map.easeTo({
                        center: features[0].geometry.coordinates,
                        zoom: zoom
                    });
                }
            );
        });

        // When a click event occurs on a feature in
        // the unclustered-point layer, open a popup at
        // the location of the feature, with
        // description HTML from its properties.
        map.on('click', 'unclustered-point', (e) => {
            const coordinates = e.features[0].geometry.coordinates.slice();
            const mag = e.features[0].properties.B2025;
            const tsunami =
                e.features[0].properties.tsunami === 1 ? 'yes' : 'no';

            // Ensure that if the map is zoomed out such that
            // multiple copies of the feature are visible, the
            // popup appears over the copy being pointed to.
            if (['mercator', 'equirectangular'].includes(map.getProjection().name)) {
                while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                    coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
                }
            }
        });

        map.on('mouseenter', 'clusters2025', () => {
            map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'clusters2025', () => {
            map.getCanvas().style.cursor = '';
        });
        map.on('mouseenter', 'clusters2024', () => {
            map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'clusters2024', () => {
            map.getCanvas().style.cursor = '';
        });
        map.on('mouseenter', 'clusters2023', () => {
            map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'clusters2023', () => {
            map.getCanvas().style.cursor = '';
        });
        
    }

    // 레이어 그룹 토글 버튼 생성 함
    function createGroupToggleButton(groupName, layerIds) {
        const container = document.getElementById('groupToggleContainer');
        const button = document.createElement('button');
        button.textContent = `View/hide ${groupName}`;
        button.onclick = () => toggleGroupVisibility(layerIds);
        button.classList.add('toggle-button');
        container.appendChild(button);
    }
    
    // 레이어 가시성 토글 함수
    function toggleGroupVisibility(layerIds) {
        layerIds.forEach(layerId => {
            const visibility = map.getLayoutProperty(layerId, 'visibility');
    
            // 현재 가시성 상태에 따라 토글
            if (visibility === 'visible' || visibility === undefined) {
                map.setLayoutProperty(layerId, 'visibility', 'none');
            } else {
                map.setLayoutProperty(layerId, 'visibility', 'visible');
            }
        });
    }

    // 초기 레이어 및 소스 추가
    map.on('load', () => {
        addLayers();
    });

    // Add the control to the map.
    const geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        language: 'en-US',
        countries: 'us',
        mapboxgl: mapboxgl
    });
    
    document.getElementById('geocoder').appendChild(geocoder.onAdd(map));

    // 레이어 선택을 위한 버튼 설정
    const layerList = document.getElementById('backgroundmap');
    const inputs = layerList.getElementsByTagName('input');
    for (const input of inputs) {
        input.onclick = (layer) => {
            const layerId = layer.target.id;
            map.setStyle('mapbox://styles/mapbox/' + layerId);
        };
    }

    // 레이어 토글 버튼 생성
    createGroupToggleButton('Installations', ['base-borders', 'base-fills']);
    createGroupToggleButton('FY2025 Installation Budget', ['clusters2025', 'unclustered-point', 'cluster-count2025']);
    createGroupToggleButton('FY2024 Installation Budget', ['clusters2024', 'unclustered-point', 'cluster-count2024']);
    createGroupToggleButton('FY2023 Installation Budget', ['clusters2023', 'unclustered-point', 'cluster-count2023']);
    // 새로운 스타일 로드 시 레이어 복원
    map.on('styledata', () => {
        if (!map.getSource('bases')) {
            addLayers(); // 소스와 레이어가 없는 경우에만 추가
        }
    });
    
    