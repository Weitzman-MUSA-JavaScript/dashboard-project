export function setupEventListeners(map, vismapInstance, yearSelectorId, visualizeChartsCallback, populateInfoTableCallback) {
    const yearSelector = document.getElementById(yearSelectorId);

    yearSelector.addEventListener('change', function () {
        const selectedYear = this.value;
        vismapInstance.fetchData(selectedYear);
    });

    map.on('featureSelected', function(event) {
        const properties = event.properties;
        populateInfoTableCallback(properties);
        visualizeChartsCallback(properties ? properties['GEOID'] : null);
    });
}
