function initPoisChart(chartEl, events) {
  const resetButton = chartEl.querySelector('#reset-button');
  const saveButton = chartEl.querySelector('#save-button');
  const canvas = chartEl.querySelector('.daily-trip-schedule');
  const ctx = canvas.getContext('2d');

  //
  // Create the chart for daily trip schedule...
  //

  // Define parameters for the chart
  const maxHours = 8;
  const barHeight = 20;
  const barSpacing = 10;
  const initialDays = 5;

  // Define the colormap for the chart
  const colormap = {
    Commerce: '#F26363',
    Mountain: '#947262',
    Recreation: '#D93BAF',
    Restroom: '#a7a7ad',
    Service: '#919151',
    Tourism: '#008C72',
    Transportation: '#ee9f3e',
    Water: '#0099DD',
    default: '#e0e0e0',
  };

  // Modify the canvas size dynamically
  function adjustCanvasSize(totalDays) {
    const newHeight = totalDays * (barHeight + barSpacing);
    canvas.height = newHeight;
    canvas.width = canvas.parentElement.clientWidth;
  }

  // Draw the placeholder chart without selected pois
  function drawPlaceholder(totalDays) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < totalDays; i++) {
      const yPosition = i * (barHeight + barSpacing);

      ctx.fillStyle = colormap.default;
      ctx.fillRect(0, yPosition, canvas.width, barHeight);

      ctx.fillStyle = '#000';
      ctx.font = '16px Roboto';
      ctx.textAlign = 'left';
      ctx.fillText(`Day ${i + 1}`, 10, yPosition + barHeight / 1.5);
    }
  }

  // Draw the selected pois
  function drawPoi(poiSelectedList) {

  }

  // Draw the main chart with selected pois
  function drawChart(poiSelectedList) {

  }
  drawChart([]);

  //
  // Deal with different events...
  //

  // Listen for updated selected pois list
  events.addEventListener('selectedlistupdated', (evt) => {
    const { poiSelectedList } = evt.detail;
    drawChart(poiSelectedList);
  });

  // Reset the selected pois list
  resetButton.addEventListener('click', (evt) => {
    const event = new CustomEvent('resetselectedlist');
    events.dispatchEvent(event);
  });

  // Save the daily trip schedule as an image
  saveButton.addEventListener('click', (evt) => {
    if (canvas) {
      const dataURL = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = 'Daily_Trip_Schedule.png';
      link.click();
    } else {
      console.error('No canvas element found for screenshot');
    }
  });
}

export { initPoisChart };
