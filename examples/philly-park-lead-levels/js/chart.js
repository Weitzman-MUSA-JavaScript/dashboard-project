import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

const leadLevelMarker = document.querySelector('#lead-level-chart .level');
const leadLevelLabel = document.querySelector('#lead-level-chart .level-label');

function setLeadLevel(n) {
  const maxLeadLevel = 18064;
  // const scaledValue = n / maxLeadLevel * 100;
  // if use log scale
  const scaledValue = Math.log(n) / Math.log(maxLeadLevel) * 100;

  // Set the location of the marker
  leadLevelMarker.style.width = `${scaledValue}%`;

  // Set the text of the label
  leadLevelLabel.innerHTML = `<div id="chart-text" class="chart-pop"><strong>Lead Level:</strong> ${n.toFixed(2)} ppm</div>`;

  // need to remove hidden class before get the width, otherwise it will exceed the width of the container when first click a park with a higher lead level
  leadLevelLabel.classList.remove('hidden');
  // Set the location of the label
  const labelW = leadLevelLabel.offsetWidth;
  leadLevelLabel.style.left = `min(calc(100% - ${labelW + 1}px), ${scaledValue}%)`;

  // D3 to add color background
  const colorScale = d3.interpolateRgb('rgba(101, 160, 79, 0.41)', 'rgba(246, 177, 114, 0.73)');
  window.colorScale = colorScale;
  const color = colorScale(scaledValue/100);
  leadLevelLabel.style.backgroundColor = color;
}

export {
  setLeadLevel,
};

