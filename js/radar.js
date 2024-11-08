//const radarInstances = {};

function initRadar(radarEl, positionMedians, statNames, playerStats, playerPercentiles) {


//radarInstances[radarEl.id] 
//= 
bb.generate({
    title: {
        text: "ATHLETE PROFILE"
      },
        data: {
          x: "x",
          columns: [
          ["x", "Strength", "Power", "Speed", "Agility"],
          ["Athlete", 80, 60, 30, 55],
          ["Position Median", 50, 50, 50, 50],
          ],
          type: "radar", 
          labels: true,
          colors: {
            "Position Median": "lightgray",
            "Athlete": "magenta"
          }
        },
        radar: {
          axis: {
            max: 100
          },
          level: {
            depth: 2
          },
          direction: {
            clockwise: false
          }
        },
        bindto: "#radar-chart"
      });

/*     if (radarInstances[radarEl.id]) {
        radarInstances[radarEl.id].destroy();
    } */

}

export { initRadar };
