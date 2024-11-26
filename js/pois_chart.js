function initPoisChart(chartEl, events) {
  const resetButton = chartEl.querySelector('#reset-button');
  const saveButton = chartEl.querySelector('#save-button');
  const canvas = chartEl.querySelector('.daily-trip-schedule');
  const ctx = canvas.getContext('2d');

  //
  // Create the chart for daily trip schedule... (refer to ChatGPT)
  //

  // Define parameters for the chart
  const maxMinutes = 480; // 8 hours
  const barHeight = 30;
  const barSpacing = 20;
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

  // Adjust the canvas size based on the total days
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
      ctx.font = '14px Roboto';
      ctx.textAlign = 'left';
      ctx.fillText(`Day ${i + 1}`, 10, yPosition + barHeight / 1.5);
    }
  }

  // Draw the selected pois
  function drawPoi(poiSelectedList) {
    let currentDayMinutes = 0;
    let currentDay = 0;
    let xOffSet = 0;

    poiSelectedList.forEach((poi) => {
      // Convert the time string to number
      const timeString = poi.properties.Time;
      const time = parseInt(timeString.match(/\d+/)[0], 10);
      console.log(`POI Time: ${time}`);

      const color = colormap[poi.properties.Type] || colormap.default;

      // Check if the current day has more than 480 minutes (8 hours)
      if (currentDayMinutes + time > maxMinutes) {
        currentDay++;
        currentDayMinutes = 0;
        xOffSet = 0;
      }

      // Calculate the width of the bar
      const availableTime = maxMinutes - currentDayMinutes;
      const timeToDraw = Math.min(availableTime, time);
      const barWidth = (timeToDraw / maxMinutes) * canvas.width;

      // Draw the bar for the POI
      const yPosition = currentDay * (barHeight + barSpacing);
      ctx.fillStyle = color;
      ctx.fillRect(xOffSet, yPosition, barWidth, barHeight);

      currentDayMinutes += timeToDraw;
      xOffSet += barWidth;

      if (time > availableTime) {
        // Draw the remaining part of the POIs in the next day
        currentDay++;
        currentDayMinutes = 0;
        xOffSet = 0;

        const remainingTime = time - timeToDraw;
        const remainingBarWidth = (remainingTime / maxMinutes) * canvas.width;

        const nextYPosition = currentDay * (barHeight + barSpacing);
        ctx.fillRect(xOffSet, nextYPosition, remainingBarWidth, barHeight);

        currentDayMinutes += remainingTime;
        xOffSet += remainingBarWidth;
      }
    });
  }

  // Draw the main chart with selected pois
  function drawChart(poiSelectedList) {
    let totalDays = 1;
    let currentDayMinutes = 0;

    if (poiSelectedList && poiSelectedList.length > 0) {
      poiSelectedList.forEach((poi) => {
        const timeString = poi.properties.Time;
        const time = parseInt(timeString.match(/\d+/)[0], 10);
        if (currentDayMinutes + time > maxMinutes) {
          totalDays++;
          currentDayMinutes = time;
        } else {
          currentDayMinutes += time;
        }
      });
      totalDays = Math.max(totalDays, initialDays);
    } else {
      totalDays = initialDays;
    }

    // Call the functions to draw the chart
    adjustCanvasSize(totalDays);

    drawPlaceholder(totalDays);

    if (poiSelectedList && poiSelectedList.length > 0) {
      drawPoi(poiSelectedList);
    } else {
      ctx.fillStyle = '#000';
      ctx.font = '20px Roboto';
      ctx.fillText('No POIs selected', 10, canvas.height - 20);
    }
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
