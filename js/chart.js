import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

function initializeHist(data, evt) {
  evt.addEventListener("select-neighborhood", (e) => {
    reconstructHist(data, e.detail.district);
  }) 
  // Initial execution
  constructHist(data, 0)
}

function reconstructHist(data, district) {
  // Clear any existing graph
  const graph = document.querySelector('#error-hist');
  graph.textContent = '';

  // Construct new graph
  constructHist(data, district);
}

function constructHist(data, district) {

  let histData;

  if (district != 0){
    histData = data.filter((obs) => obs.district == Number(district))
    .map((obs) => obs.residual);
  } else {
    histData = data.map((obs) => obs.residual)
  }

  // set the dimensions and margins of the graph
  var margin = {top: 10, right: 30, bottom: 30, left: 40},
  width = 460 - margin.left - margin.right,
  height = 250 - margin.top - margin.bottom;

  // append the svg object to the body of the page
  var svg = d3.select("#error-hist")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform",
        "translate(" + margin.left + "," + margin.top + ")");

  // X axis: scale and draw:
  var xAxis = d3.scaleLinear()
  .domain([Math.min(...histData)-10, Math.max(...histData)+10])     // can use this instead of 1000 to have the max of data: d3.max(data, function(d) { return +d.price })
  .range([0, width]);

  svg.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(xAxis).ticks(4));

  var histGenerator = d3.bin()
    .domain(xAxis.domain())    // Set the domain to cover the entire intervall [0,1]
    .thresholds(xAxis.ticks(Math.min(100,histData.length)));  // number of thresholds; this will create 19+1 bins

  var bins = histGenerator(histData);

  // Y axis: scale and draw:
  var y = d3.scaleLinear()
    .range([height, 0]);
    y.domain([0, d3.max(bins, function(d) { return d.length; })]);   // d3.hist has to be called before the Y axis obviously
  svg.append("g")
    .call(d3.axisLeft(y));

  // append the bar rectangles to the svg element
  svg.selectAll("rect")
    .data(bins)
    .enter()
    .append("rect")
      .attr("x", 1)
      .attr("transform", function(d) { return "translate(" + xAxis(d.x0) + "," + y(d.length) + ")"; })
      .attr("width", function(d) { return xAxis(d.x1) - xAxis(d.x0) ; })
      .attr("height", function(d) { return height - y(d.length); })
      .style("fill", "#69b3a2");
}

export {
  initializeHist,
};

