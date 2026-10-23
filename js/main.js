import { getSkiResorts } from './resort_data.js';
import { initResortsSelect } from './resorts_select.js';

const map = new mapboxgl.Map({
    accessToken: 'pk.eyJ1IjoieWp0aSIsImEiOiJjbXR1amNmYm0wbDYxMndvaXN4eTJvMDRkIn0.bNNFtykpp1aHpvlsFUJ3YA',
    container: 'map', 
    style: 'mapbox://styles/yjti/cmvfktv2g00jl01s81f3df35r',
    center: [-98, 44], 
    zoom: 3
});


map.on('load', async () => {
    try {
        const resorts = await getSkiResorts();
        initResortsSelect(
            document.querySelector('.sidepanel'),
            resorts.features,
            selectResort,
            (filteredResorts) => {
                const visibleNames = filteredResorts.map(
                    (resort) => resort.properties.name
                );

                map.setFilter('ski-resorts-points', [
                    'in',
                    ['get', 'name'],
                    ['literal', visibleNames],
                ]);
            }
        );

        map.addSource('ski-resorts', {
            type: 'geojson',
            data: resorts,
        });

        map.addLayer({
            id: 'ski-resorts-points',
            type: 'circle',
            source: 'ski-resorts',
            paint: {
                'circle-radius': 5,
                'circle-color': '#2ea7e4',
                'circle-stroke-color': '#ffffff',
                'circle-stroke-width': 1,
            },
        });


map.on('click', 'ski-resorts-points', (event) => {
    selectResort(event.features?.[0]);
});
    } catch (error) {
        console.error('Could not load ski resorts:', error);
    }
});

const panel = document.querySelector('#resort-panel');
const resortName = document.querySelector('#resort-name');
const resortState = document.querySelector('#resort-state');
const resortSlopes = document.querySelector('#resort-slopes');
const resortSlopeLength = document.querySelector('#resort-slope-length');
const resortLifts = document.querySelector('#resort-lifts');
const resortElevation = document.querySelector('#resort-elevation');
const resortElevationDifference = document.querySelector('#resort-elevation-difference');
const resortSearch = document.querySelector('#resort-search');
const resortClearButton = document.querySelector('#resort-clear-button');

resortClearButton.addEventListener('click', () => {
    resortSearch.value = '';
    resortSearch.dispatchEvent(new Event('input'));
});

function selectResort(feature) {
    if (!feature) return;

    const properties = feature.properties;
    map.stop();

    resortName.textContent = properties.name || 'Unnamed resort';
    resortState.textContent =
        `${properties.location_region || ''}, ${properties.location_country || ''}`;

    const slopes = Number(properties.number_of_slopes);
    resortSlopes.textContent = Number.isFinite(slopes)
        ? `Slopes: ${Math.round(slopes)}`
        : 'Slopes not available';

    resortSlopeLength.textContent = properties.total_slope_length_km
        ? `Total Slope Length: ${properties.total_slope_length_km} km`
        : 'Slope length not available';

    const lifts = Number(properties.number_of_lifts);
    resortLifts.textContent = Number.isFinite(lifts)
        ? `Lifts: ${Math.round(lifts)}`
        : 'Lifts not available';
    
    const elevation = Number(properties.elevation_top_m);
    resortElevation.textContent = Number.isFinite(elevation)
        ? `Elevation: ${Math.round(elevation)} m`
        : 'Elevation not available';

    const elevationDifference = Number(properties.elevation_difference_m)
    resortElevationDifference.textContent = Number.isFinite(elevationDifference)
        ? `Elevation Difference: ${Math.round(elevationDifference)} m`
        : 'Elevation difference not available';

    panel.hidden = false;

    const isMobile = window.matchMedia('(max-width: 600px)').matches;
    const padding = isMobile
        ? { bottom: panel.offsetHeight }
        : { left: panel.offsetWidth };

    map.easeTo({
        center: feature.geometry.coordinates,
        zoom: 11,
        pitch: 70,
        padding,
        duration: 800,
    });
}


document.querySelector('#close-panel').addEventListener('click', () => {
    map.stop();
    panel.hidden = true;

    map.easeTo({
        center: [-98, 40],
        zoom: 3,
        pitch: 0,
        bearing: 0,
        padding: 0,
        duration: 1000,
    });
});

map.on('mouseenter', 'ski-resorts-points', () => {
    map.getCanvas().style.cursor = 'pointer';
});

map.on('mouseleave', 'ski-resorts-points', () => {
    map.getCanvas().style.cursor = '';
});