import * as d3 from 'https://cdn.skypack.dev/d3';
import { visualizeCharts } from './vischarts.js';

class Vismap {
    constructor(map, customBreaks, columnName) {
        this.map = map;
        this.currentLayer = null;
        this.legendItems = [];
        this.geojsonLayer = null;
        this.customBreaks = customBreaks;
        this.columnName = columnName;
        this.geojsonData = null;
        this.locationNameToLayer = {};

        this.map.on('click', (e) => {
            const originalEvent = e.originalEvent;
            if (!originalEvent.target.closest('.leaflet-interactive') && this.currentLayer) {
                this.resetHighlight();
                visualizeCharts(null);
                this.map.fire('featureSelected', { properties: null });
            }
        });
    }

    fetchData(year) {
        const path = `assets/data/philly_${year}.geojson`;
        fetch(path)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                this.geojsonData = data;
                this.processData(data);
                this.visualize(this.columnName);
                this.map.fire('dataLoaded');
            })
            .catch(error => {
                console.error(`Error fetching data for year ${year}:`, error);
            });
    }

    processData(data) {
        const column = this.columnName;
        data.features.forEach(feature => {
            const value = feature.properties[column];
            if (value == null) return;
            let categoryIndex = this.customBreaks.length - 1;
            for (let i = 0; i < this.customBreaks.length; i++) {
                if (value <= this.customBreaks[i]) {
                    categoryIndex = i;
                    break;
                }
            }
            feature.properties.category = categoryIndex;
        });
    }

    generateViridisPalette() {
        return d3.scaleSequential(d3.interpolateViridis);
    }

    resetHighlight() {
        if (this.currentLayer) {
            this.geojsonLayer.resetStyle(this.currentLayer);
            this.currentLayer = null; 
        }
    
        this.legendItems.forEach(item => item.classList.remove('highlight'));
    }
    
    highlightFeature(layer, value) {
        layer.setStyle({
            fillColor: 'red',
            color: 'red',
            weight: 3
        });

        const index = this.findLegendIndex(value);
        if (index !== -1 && this.legendItems[index]) {
            this.legendItems[index].classList.add('highlight');
        }

        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
        }
    }

    findLegendIndex(value) {
        for (let i = 0; i < this.customBreaks.length; i++) {
            if (value <= this.customBreaks[i]) {
                return i;
            }
        }
        return this.customBreaks.length - 1;
    }

    onEachFeature(feature, layer, colname) {
        layer.on('click', () => {
            if (this.currentLayer !== layer) {
                this.resetHighlight();
            }

            const value = feature.properties[colname];
            if (value == null) {
                visualizeCharts(null);
                this.map.fire('featureSelected', { properties: null });
                return;
            }

            this.highlightFeature(layer, value);
            this.currentLayer = layer;

            const GEOID = feature.properties['GEOID']; 
            visualizeCharts(GEOID);

            const locationName = feature.properties['Name'];
            if (locationName) {
                const normalizedName = this.normalizeLocationName(locationName);
                this.locationNameToLayer[normalizedName] = layer;
            }

            this.map.fire('featureSelected', { properties: feature.properties });
        });

        const locationName = feature.properties['Name'];
        if (locationName) {
            const normalizedName = this.normalizeLocationName(locationName);
            this.locationNameToLayer[normalizedName] = layer;
        }
    }

    generateLegend(colname) {
        const existingLegend = document.querySelector('.legend-box');
        if (existingLegend) existingLegend.remove();

        const legend = L.DomUtil.create('div', 'legend-box');
        const colorScale = this.generateViridisPalette();

        this.legendItems = [];

        const title = document.createElement('div');
        title.className = 'legend-title';
        title.innerHTML = `${colname}`;
        legend.appendChild(title);

        for (let i = 0; i < this.customBreaks.length; i++) {
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';

            const colorBox = document.createElement('div');
            colorBox.className = 'legend-color';
            const normalizedValue = i / (this.customBreaks.length - 1);
            colorBox.style.backgroundColor = colorScale(normalizedValue);

            let label;
            if (i === 0) {
                label = `≤ ${this.customBreaks[i]}`;
            } else if (i < this.customBreaks.length - 1) {
                label = `${this.customBreaks[i - 1]} - ${this.customBreaks[i]}`;
            } else {
                label = `> ${this.customBreaks[i - 1]}`;
            }

            legendItem.appendChild(colorBox);
            legendItem.appendChild(document.createTextNode(label));
            legend.appendChild(legendItem);

            this.legendItems.push(legendItem);
        }

        this.map.getContainer().appendChild(legend);
    }

    getFeatureStyle(feature) {
        const colname = this.columnName;
        const value = feature.properties[colname];

        const colorScale = this.generateViridisPalette();
        let color = '#ccc';
        if (value != null) {
            const index = this.findLegendIndex(value);
            const normalizedValue = index / (this.customBreaks.length - 1);
            color = colorScale(normalizedValue);
        }

        return {
            fillColor: color,
            color: '#fff',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.7
        };
    }

    visualize(colname) {
        if (this.geojsonLayer) {
            this.map.removeLayer(this.geojsonLayer);
        }

        this.geojsonLayer = L.geoJson(this.geojsonData, {
            style: (feature) => this.getFeatureStyle(feature),
            onEachFeature: (feature, layer) => this.onEachFeature(feature, layer, colname)
        }).addTo(this.map);

        this.generateLegend(colname);
    }

    getLocationNames() {
        return Object.keys(this.locationNameToLayer);
    }

    findLayerByLocationName(locationName) {
        const normalizedName = this.normalizeLocationName(locationName);
        const layer = this.locationNameToLayer[normalizedName];
        if (!layer) {
            console.warn(`No layer found for Name: "${locationName}"`);
        }
        return layer;
    }

    normalizeLocationName(name) {
        return name.trim().toLowerCase();
    }
}

export { Vismap };
