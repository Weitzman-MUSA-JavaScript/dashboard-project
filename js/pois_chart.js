function initPoisChart(chartEl, events) {
  const resetButton = chartEl.querySelector('#reset-button');
  const saveButton = chartEl.querySelector('#save-button');
  const canvas = chartEl.querySelector('.daily-trip-schedule');
  const ctx = canvas.getContext('2d');

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

  //
  // Create the chart for daily trip schedule...
  //

  /* The logic for drawing the chart is created by myself:

  This chart visualizes the estimated travel time for selected POIs as a bar chart.
  Each POI's estimated travel time is proportional to the total available time in a day (6 hours or 360 minutes).   Note: This chart does not account for additional factors like traffic, rest, or meals.
  If a POI's travel time exceeds the remaining time of the current day, the remaining POIs is carried over to the next day.

  The chart is drawn using canvas API and most of the code is modified from ChatGPT's example, because I have to draw the chart manually on the canvas.
  */

  // Define parameters for the chart
  const maxMinutesPerDay = 360; // 6 hours per day
  const barHeight = 26;
  const barSpacing = 22;
  const initialDays = 7;
  const topGap = 5;
  const bottomGap = 5;
  const rightGap = 5;

  // Define the color map for different types of POIs
  const colormap = {
    Commerce: '#F26363',
    Mountain: '#947262',
    Recreation: '#D93BAF',
    Restroom: '#a7a7ad',
    Service: '#919151',
    Tourism: '#008C72',
    Transportation: '#ee9f3e',
    Water: '#0099DD',
    default: '#ffffff',
  };

  // Adjust the canvas size based on the total days
  function adjustCanvasSize(totalDays) {
    const dpr = window.devicePixelRatio || 1; // Adjust for high DPI displays
    const newHeight = topGap + totalDays * (barHeight + barSpacing) - barSpacing + bottomGap;

    canvas.width = canvas.parentElement.clientWidth * dpr;
    canvas.height = newHeight * dpr;

    canvas.style.width = `${canvas.parentElement.clientWidth}px`;
    canvas.style.height = `${newHeight}px`;

    ctx.scale(dpr, dpr);
  }

  // Draw the placeholder chart without any selected POIs
  function drawPlaceholder(totalDays) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const drawWidth = canvas.parentElement.clientWidth - 60 - rightGap;

    for (let i = 0; i < totalDays; i++) {
      const yPosition = topGap + i * (barHeight + barSpacing);

      ctx.fillStyle = colormap.default;
      ctx.fillRect(60, yPosition, drawWidth, barHeight);

      ctx.strokeStyle = '#b0b0b0';
      ctx.lineWidth = 1;
      ctx.strokeRect(60, yPosition, drawWidth, barHeight);

      ctx.fillStyle = '#000000';
      ctx.font = '14px Roboto';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Day ${i + 1}`, 10, yPosition + barHeight / 2);
    }
  }

  // Draw the selected POIs on the chart
  function drawPoi(poiSelectedList) {
    let currentDayMinutes = 0;
    let currentDay = 0;
    let xOffSet = 60;

    poiSelectedList.forEach((poi) => {
      const timeString = poi.properties.Time;
      const time = parseInt(timeString.match(/\d+/)[0], 10);
      console.log(`POI Time: ${time}`);

      const color = colormap[poi.properties.Type] || colormap.default;

      // Check if the current day has enough time to draw the POI
      if (currentDayMinutes + time > maxMinutesPerDay) {
        currentDay++;
        currentDayMinutes = 0;
        xOffSet = 60;
      }

      const availableTime = maxMinutesPerDay - currentDayMinutes;
      const timeToDraw = Math.min(availableTime, time);
      const barWidth = (timeToDraw / maxMinutesPerDay) * (canvas.parentElement.clientWidth - 60);

      const yPosition = topGap + currentDay * (barHeight + barSpacing);
      ctx.fillStyle = color;
      ctx.fillRect(xOffSet, yPosition, barWidth, barHeight);

      currentDayMinutes += timeToDraw;
      xOffSet += barWidth;

      if (time > availableTime) {
        // Draw the remaining POIs on the next day
        currentDay++;
        currentDayMinutes = 0;
        xOffSet = 60;

        const remainingTime = time - timeToDraw;
        const remainingBarWidth = (remainingTime / maxMinutesPerDay) * (canvas.parentElement.clientWidth - 60);

        const nextYPosition = topGap + currentDay * (barHeight + barSpacing);
        ctx.fillRect(xOffSet, nextYPosition, remainingBarWidth, barHeight);

        currentDayMinutes += remainingTime;
        xOffSet += remainingBarWidth;
      }
    });
  }

  // Draw the main chart with the selected POIs
  function drawChart(poiSelectedList) {
    let totalDays = 1;
    let currentDayMinutes = 0;

    if (poiSelectedList && poiSelectedList.length > 0) {
      poiSelectedList.forEach((poi) => {
        const timeString = poi.properties.Time;
        const time = parseInt(timeString.match(/\d+/)[0], 10);
        if (currentDayMinutes + time > maxMinutesPerDay) {
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

    //  Adjust the canvas size based on the total days
    adjustCanvasSize(totalDays);

    // Draw the placeholder chart
    drawPlaceholder(totalDays);

    // Draw the selected POIs
    drawPoi(poiSelectedList);
  }

  // Initialize the chart with an empty list of selected POIs
  drawChart([]);
}

export { initPoisChart };
