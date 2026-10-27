const width = Math.max(window.innerWidth * 0.43, 0);
const height = Math.max(window.innerHeight * 0.85, 0);

const config = {
  speed: 0.002,
  verticalTilt: -10,
  horizontalTilt: -23,
};
let locations = [];
const projection = d3.geoOrthographic().scale(width/2.4).translate([width / 2, height / 2]);
const path = d3.geoPath().projection(projection);
const center = [width / 2, height / 2];
let svg; let markerGroup;
let selectedVolcanoType = 'All';

document.getElementById('volcano-type').addEventListener('change', (evt) => {
  selectedVolcanoType = evt.target.value;
  drawMarkers();
});


async function globe(el, worldData, locationData) {
  svg = el.append('svg').attr('width', width).attr('height', height);
  markerGroup = svg.append('g');
  drawGraticule();
  drawGlobe(worldData, locationData);
  enableRotation();
}

function drawGlobe(worldData, locationData) {
  svg.selectAll('.segment')
    .data(worldData.features)
    .enter()
    .append('path')
    .attr('class', 'segment')
    .attr('d', path)
    .style('stroke', '#888')
    .style('stroke-width', '1px')
    .style('fill', '#B2BEB5')
    .style('opacity', '.6');

  locations = locationData;
  drawMarkers();
}

function enableRotation() {
  d3.timer(function(elapsed) {
    projection.rotate([config.speed * elapsed - 10, config.verticalTilt, config.horizontalTilt]);
    svg.selectAll('path').attr('d', path);
    drawMarkers();
  });
}

function drawGraticule() {
  const graticule = d3.geoGraticule()
    .step([10, 10]);
  svg.append('path')
    .datum(graticule)
    .attr('class', 'graticule')
    .attr('d', path)
    .style('fill', '#fff')
    .style('stroke', '#ccc');
}


function drawMarkers() {
  const tooltip = d3.select('#tooltip');
  const validLocations = locations.filter((d) => {
    const lat = parseFloat(d.latitude);
    const lon = parseFloat(d.longitude);
    const volcanoType = d.type;
    return !isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0 &&
  (selectedVolcanoType === 'All' || volcanoType === selectedVolcanoType);
  });

  const markers = markerGroup.selectAll('circle')
    .data(validLocations);

  markers.exit().remove();

  markers.enter()
    .append('circle')
    .merge(markers)
    .attr('cx', (d) => projection([d.longitude, d.latitude])[0])
    .attr('cy', (d) => projection([d.longitude, d.latitude])[1])
    .attr('fill', (d) => {
      const coordinate = [d.longitude, d.latitude];
      const gdistance = d3.geoDistance(coordinate, projection.invert(center));
      if (gdistance > 1.5) {
        return 'none';
      } else {
        return d.sealevel === 'Above Sea Level' ? '#9D1F35' : '#16335D'; // Red if above sea level, blue if below
      }
    })
    .attr('r', 3)
    .on('mouseover', function(event, d) {
      tooltip.style('visibility', 'visible')
        .html(`<strong>${d.name}</strong><br>
         Elevation: ${d.elevation} m<br>
     Region: ${d.continent}<br>
   Type: ${d.type}<br>
Last Eruption: ${d.eruption}`);
    })
    .on('mousemove', function(event) {
      tooltip.style('top', (event.pageY + 10) + 'px')
        .style('left', (event.pageX + 10) + 'px');
    })
    .on('mouseout', function() {
      tooltip.style('visibility', 'hidden');
    });

  markerGroup.each((d, i, nodes) => {
    nodes[i].parentNode.appendChild(nodes[i]);
  });
}

export { globe };
