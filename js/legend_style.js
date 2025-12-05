const matrixLegend = `
<b>Risk Matrix</b><br>
<div><span style="background:#4575b4;" class="legend-color"></span> Low-Low</div>
<div><span style="background:#91bfdb;" class="legend-color"></span> Low-Medium</div>
<div><span style="background:#e0f3f8;" class="legend-color"></span> Low-High</div>
<div><span style="background:#fee090;" class="legend-color"></span> Medium-Low</div>
<div><span style="background:#fc8d59;" class="legend-color"></span> Medium-Medium</div>
<div><span style="background:#d73027;" class="legend-color"></span> Medium-High</div>
<div><span style="background:#fdae61;" class="legend-color"></span> High-Low</div>
<div><span style="background:#f46d43;" class="legend-color"></span> High-Medium</div>
<div><span style="background:#a50026;" class="legend-color"></span> High-High</div>
`;

const imperviousLegend = `
<b>Impervious</b><br>
<div><span style="background:rgb(0, 255, 100);" class="legend-color"></span> Low Percent</div>
<div><span style="background:rgb(255,0,100);" class="legend-color"></span> High Percent</div>
`;

const inundationLegend = `
<b>Inundation</b><br>
<div><span style="background:rgb(100,255,0);" class="legend-color"></span> Low Risk</div>
<div><span style="background:rgb(100,0,255);" class="legend-color"></span> High Risk</div>
`;

export { matrixLegend, imperviousLegend, inundationLegend };
