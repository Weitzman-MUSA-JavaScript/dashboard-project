function initPoisChart(chartEl, pois, events) {
  // Listen for updated selected pois list
  events.addEventListener('selectedlistupdated', (evt) => {
    const { poiSelectedList } = evt.detail;
  });
}

export { initPoisChart };
