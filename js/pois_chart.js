function initPoisChart(chartEl, events) {
  const resetButton = chartEl.querySelector('#reset-button');
  const saveButton = chartEl.querySelector('#save-button');
  const chart = chartEl.querySelector('.daily-trip-schedule');

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

  // Save the daily trip schedule as an image
  saveButton.addEventListener('click', (evt) => {
    if (chart) {
      const dataURL = chart.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = 'img/Daily_Trip_Schedule.png';
      link.click();
    } else {
      console.error('No canvas element found for screenshot');
    }
  });
}

export { initPoisChart };
