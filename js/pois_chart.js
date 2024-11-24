function initPoisChart(chartEl, events) {
  const resetButton = chartEl.querySelector('#reset-button');
  const saveButton = chartEl.querySelector('#save-button');

  //
  // Create a chart
  //

  // Listen for updated selected pois list
  events.addEventListener('selectedlistupdated', (evt) => {
    const { poiSelectedList } = evt.detail;
  });

  // Reset the selected pois list
  resetButton.addEventListener('click', (evt) => {
    const event = new CustomEvent('resetselectedlist');
    events.dispatchEvent(event);
  });
}

export { initPoisChart };
