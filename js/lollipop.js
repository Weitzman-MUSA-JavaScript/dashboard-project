const margin = {top: 30, right: 25, bottom: 20, left: 35};

// Dynamically calculate width and height based on the viewport size
const width = Math.max(window.innerWidth * 0.5, 0);
const height = Math.max(window.innerHeight * 0.22, 0);
const fontSize = Math.max(width * 0.011, 0);
const colors = ['#8592A0', '#16335D', '#B2BEB5', '#6E726E', '#CC2929', '#9D1F35'];

let svg;
let x;
let xAxis;
let y;
let yAxis;
let data;


async function lollipop(lollipopEL, inputdata) {
  document.getElementById('button1').addEventListener('click', () => {
    update(data, 'VEI');
  });
  document.getElementById('button2').addEventListener('click', () => {
    update(data, 'Deaths');
  });

  data = inputdata;
  svg = lollipopEL
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .style('font-family', 'Roboto')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  x = d3.scaleBand()
    .range([0, width])
    .padding(1);

  xAxis = svg.append('g')
    .attr('transform', 'translate(0,' + height + ')')
    .style('font-family', 'Roboto')
    .style('font-size', fontSize + 'px');

  y = d3.scaleLinear()
    .range([height, 0]);

  yAxis = svg.append('g')
    .attr('class', 'myYaxis')
    .style('font-family', 'Roboto')
    .style('font-size', fontSize + 'px');


  update(data, 'VEI');
}


function update(data, selectedVar) {
  x.domain(data.map(function(d) {
    return d.Type;
  }));
  xAxis.transition().duration(1000).call(d3.axisBottom(x));

  y.domain([0, d3.max(data, function(d) {
    return +d[selectedVar];
  })]);
  yAxis.transition().duration(1000).call(d3.axisLeft(y).ticks(5));

  const l = svg.selectAll('.myLine')
    .data(data);
  l
    .join('line')
    .attr('class', 'myLine')
    .transition()
    .duration(1000)
    .attr('x1', function(d) {
      return x(d.Type);
    })
    .attr('x2', function(d) {
      return x(d.Type);
    })
    .attr('y1', y(0))
    .attr('y2', function(d) {
      return y(d[selectedVar]);
    })
    .attr('stroke', 'grey')
    .attr('stroke-width', 2);

  const c = svg.selectAll('circle')
    .data(data);
  c
    .join('circle')
    .transition()
    .duration(1000)
    .attr('cx', function(d) {
      return x(d.Type);
    })
    .attr('cy', function(d) {
      return y(d[selectedVar]);
    })
    .attr('r', 15)
    .attr('fill', function(d, i) {
      return colors[i % colors.length]; // Cycle through the colors array
    });
}

export { lollipop };
