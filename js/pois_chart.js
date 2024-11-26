function initPoisChart(chartEl, events) {
  const resetButton = chartEl.querySelector('#reset-button');
  const saveButton = chartEl.querySelector('#save-button');
  const canvas = chartEl.querySelector('.daily-trip-schedule');
  const ctx = canvas.getContext('2d');

  // 定义画布参数
  const maxMinutesPerDay = 480; // 每天最大时间为8小时
  const barHeight = 26; // 条形图高度
  const barSpacing = 22; // 条形图间隔
  const initialDays = 7; // 初始天数
  const topGap = 5; // 顶部间隔
  const bottomGap = 5; // 底部间隔
  const rightGap = 5; // 右侧间隔

  // 定义颜色映射表
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

  // 动态调整画布大小
  function adjustCanvasSize(totalDays) {
    const dpr = window.devicePixelRatio || 1; // 适配高分辨率
    const newHeight = topGap + totalDays * (barHeight + barSpacing) - barSpacing + bottomGap;

    canvas.width = canvas.parentElement.clientWidth * dpr;
    canvas.height = newHeight * dpr;

    canvas.style.width = `${canvas.parentElement.clientWidth}px`;
    canvas.style.height = `${newHeight}px`;

    ctx.scale(dpr, dpr); // 设置缩放以适配高分辨率
  }

  // 绘制占位图表
  function drawPlaceholder(totalDays) {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // 清除画布
    const drawWidth = canvas.parentElement.clientWidth - 60 - rightGap;

    for (let i = 0; i < totalDays; i++) {
      const yPosition = topGap + i * (barHeight + barSpacing);

      ctx.fillStyle = colormap.default; // 使用默认颜色
      ctx.fillRect(60, yPosition, drawWidth, barHeight);

      ctx.strokeStyle = '#b0b0b0'; // 绘制边框
      ctx.lineWidth = 1;
      ctx.strokeRect(60, yPosition, drawWidth, barHeight);

      ctx.fillStyle = '#000000'; // 绘制天数标签
      ctx.font = '14px Roboto';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Day ${i + 1}`, 10, yPosition + barHeight / 2);
    }
  }

  // 绘制用户选择的POI点
  function drawPoi(poiSelectedList) {
    let currentDayMinutes = 0; // 当前天已使用的分钟数
    let currentDay = 0; // 当前天数
    let xOffSet = 60; // 初始x偏移量

    poiSelectedList.forEach((poi) => {
      const timeString = poi.properties.Time; // 获取时间属性
      const time = parseInt(timeString.match(/\d+/)[0], 10); // 转换为数字
      console.log(`POI Time: ${time}`);

      const color = colormap[poi.properties.Type] || colormap.default; // 获取颜色

      // 检查是否超出当前天最大时间
      if (currentDayMinutes + time > maxMinutesPerDay) {
        currentDay++;
        currentDayMinutes = 0;
        xOffSet = 60; // 重置x偏移量
      }

      const availableTime = maxMinutesPerDay - currentDayMinutes;
      const timeToDraw = Math.min(availableTime, time); // 当前天可绘制时间
      const barWidth = (timeToDraw / maxMinutesPerDay) * (canvas.parentElement.clientWidth - 60);

      const yPosition = topGap + currentDay * (barHeight + barSpacing);
      ctx.fillStyle = color;
      ctx.fillRect(xOffSet, yPosition, barWidth, barHeight); // 绘制条形图

      currentDayMinutes += timeToDraw;
      xOffSet += barWidth;

      if (time > availableTime) {
        // 剩余时间绘制到下一天
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

  // 主函数：绘制图表
  function drawChart(poiSelectedList) {
    let totalDays = 1; // 默认天数为1
    let currentDayMinutes = 0;

    // 根据POI点计算所需天数
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
      totalDays = initialDays; // 默认天数
    }

    adjustCanvasSize(totalDays); // 调整画布大小
    drawPlaceholder(totalDays); // 绘制占位图
    drawPoi(poiSelectedList); // 绘制POI
  }

  // 监听事件并重新绘制图表
  const poiSelectedList = [];
  canvas.addEventListener('poiUpdated', (event) => {
    poiSelectedList.push(event.detail.poi); // 将新POI添加到列表
    drawChart(poiSelectedList); // 重新绘制图表
  });

  // 初始化绘制
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
