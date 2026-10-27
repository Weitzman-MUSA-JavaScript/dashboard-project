let canvas;
const width = Math.max(window.innerWidth * 0.178, 0);
const height = Math.max(window.innerHeight * 0.315, 0);
const tilt = 20;


async function createRotatingGlobe(countryEL, yearEL, infoEL, smallglobeEL, land, countries, borders, volCountry) {
  const countrySelect = countryEL;
  const uniqueCountries = [...new Set(volCountry.map((vol) => vol.Country))].sort();
  const yearSelect = yearEL;
  const infoDisplay = infoEL;


  uniqueCountries.forEach((countryName) => {
    countrySelect.append('option')
      .attr('value', countryName)
      .text(countryName);
  });
  const defaultCountryName = 'Cameroon';
  const defaultCountry = countries.find((c) => c.properties.name === defaultCountryName);

  populateYearAndShowInfo(defaultCountryName);

  canvas = smallglobeEL
    .attr('width', width)
    .attr('height', height)
    .style('width', `${width+2}px`)
    .style('height', `${height}px`);
  const context = canvas.node().getContext('2d');
  const projection = d3.geoOrthographic().fitExtent([[10, 10], [width - 10, height - 10]], { type: 'Sphere' });
  const path = d3.geoPath(projection, context);

  let p1; let p2 = [0, 0];
  let r1; let r2 = [0, 0, 0];

  function render(country, arc) {
    context.clearRect(0, 0, width, height);

    context.beginPath();
    path({ type: 'Sphere' });
    context.fillStyle = '#f2f2f2';
    context.fill();

    context.beginPath();
    path(land);
    context.fillStyle = '#B2BEB5';
    context.fill();

    context.beginPath();
    path(country);
    context.fillStyle = '#9D1F36';
    context.fill();

    context.beginPath();
    path(borders);
    context.strokeStyle = '#fff';
    context.lineWidth = 0.5;
    context.stroke();

    context.beginPath();
    path({ type: 'Sphere' });
    context.strokeStyle = '#fff';
    context.lineWidth = 1.5;
    context.stroke();

    if (arc) {
      context.beginPath();
      path(arc);
      context.stroke();
    }

    return context.canvas;
  }


  // Function to rotate the globe to a specific country
  async function rotateToCountry(country) {
    p1 = p2;
    p2 = d3.geoCentroid(country);
    r1 = r2;
    r2 = [-p2[0], tilt - p2[1], 0];

    const ip = d3.geoInterpolate(p1, p2);
    const iv = Versor.interpolateAngles(r1, r2);

    await d3.transition()
      .duration(1250)
      .tween('render', () => (t) => {
        projection.rotate(iv(t));
        render(country, { type: 'LineString', coordinates: [p1, ip(t)] });
      })
      .transition()
      .tween('render', () => (t) => {
        render(country, { type: 'LineString', coordinates: [ip(t), p2] });
      })
      .end();
  }
  await rotateToCountry(defaultCountry);

  function populateYearAndShowInfo(countryName, selectedYear = null) {
    // Get available years for the selected country
    const availableYears = volCountry.filter((vol) => vol.Country === countryName).map((vol) => vol.Year);
    const uniqueYears = [...new Set(availableYears)].sort();

    // Populate the year dropdown and show it
    yearSelect.selectAll('option').remove();
    yearSelect.append('option').text('Select a year').attr('value', '');

    uniqueYears.forEach((year) => {
      yearSelect.append('option')
        .attr('value', year)
        .text(year);
    });

    yearSelect.style('display', 'block');

    if (selectedYear && uniqueYears.includes(selectedYear)) {
      yearSelect.node().value = selectedYear;
    } else if (uniqueYears.length > 0) {
      selectedYear = uniqueYears[0];
      yearSelect.node().value = selectedYear;
    }

    const eruptionInfo = volCountry.find((vol) => vol.Country === countryName && vol.Year === selectedYear);

    if (eruptionInfo) {
      // Display the eruption information
      infoDisplay.html(`
                <div class="eruption-info"> 
                <p>Name: ${eruptionInfo.Name}</p>
                <p>Volcano Type: ${eruptionInfo.Type}</p>
                <p>Deaths: ${eruptionInfo.Deaths}</p>
                </div>
            `);
      infoDisplay.style('display', 'block');
    }
  }

  populateYearAndShowInfo(defaultCountryName);


  countrySelect.on('change', async () => {
    const selectedCountryName = countrySelect.node().value;
    const selectedCountry = countries.find((c) => c.properties.name === selectedCountryName);

    if (selectedCountry) {
      await rotateToCountry(selectedCountry);
      populateYearAndShowInfo(selectedCountryName);
    }
  });

  yearSelect.on('change', () => {
    const selectedYear = yearSelect.node().value;
    const selectedCountryName = countrySelect.node().value;

    if (selectedYear) {
      populateYearAndShowInfo(selectedCountryName, selectedYear);
    }
  });
}


export { createRotatingGlobe };


class Versor {
  static fromAngles([l, p, g]) {
    l *= Math.PI / 360;
    p *= Math.PI / 360;
    g *= Math.PI / 360;
    const sl = Math.sin(l); const cl = Math.cos(l);
    const sp = Math.sin(p); const cp = Math.cos(p);
    const sg = Math.sin(g); const cg = Math.cos(g);
    return [
      cl * cp * cg + sl * sp * sg,
      sl * cp * cg - cl * sp * sg,
      cl * sp * cg + sl * cp * sg,
      cl * cp * sg - sl * sp * cg,
    ];
  }
  static toAngles([a, b, c, d]) {
    return [
      Math.atan2(2 * (a * b + c * d), 1 - 2 * (b * b + c * c)) * 180 / Math.PI,
      Math.asin(Math.max(-1, Math.min(1, 2 * (a * c - d * b)))) * 180 / Math.PI,
      Math.atan2(2 * (a * d + b * c), 1 - 2 * (c * c + d * d)) * 180 / Math.PI,
    ];
  }
  static interpolateAngles(a, b) {
    const i = Versor.interpolate(Versor.fromAngles(a), Versor.fromAngles(b));
    return (t) => Versor.toAngles(i(t));
  }
  static interpolateLinear([a1, b1, c1, d1], [a2, b2, c2, d2]) {
    a2 -= a1, b2 -= b1, c2 -= c1, d2 -= d1;
    const x = new Array(4);
    return (t) => {
      const l = Math.hypot(x[0] = a1 + a2 * t, x[1] = b1 + b2 * t, x[2] = c1 + c2 * t, x[3] = d1 + d2 * t);
      x[0] /= l, x[1] /= l, x[2] /= l, x[3] /= l;
      return x;
    };
  }
  static interpolate([a1, b1, c1, d1], [a2, b2, c2, d2]) {
    let dot = a1 * a2 + b1 * b2 + c1 * c2 + d1 * d2;
    if (dot < 0) a2 = -a2, b2 = -b2, c2 = -c2, d2 = -d2, dot = -dot;
    if (dot > 0.9995) return Versor.interpolateLinear([a1, b1, c1, d1], [a2, b2, c2, d2]);
    const theta0 = Math.acos(Math.max(-1, Math.min(1, dot)));
    const x = new Array(4);
    const l = Math.hypot(a2 -= a1 * dot, b2 -= b1 * dot, c2 -= c1 * dot, d2 -= d1 * dot);
    a2 /= l, b2 /= l, c2 /= l, d2 /= l;
    return (t) => {
      const theta = theta0 * t;
      const s = Math.sin(theta);
      const c = Math.cos(theta);
      x[0] = a1 * c + a2 * s;
      x[1] = b1 * c + b2 * s;
      x[2] = c1 * c + c2 * s;
      x[3] = d1 * c + d2 * s;
      return x;
    };
  }
}
