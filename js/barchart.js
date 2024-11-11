const barInstances = {};

function initBar(barEl, positionMedians, statNames, playerStats, playerPercentiles) {

    const statCategories = {
        speed: ['10-Yard Sprint', 'Flying 10'],
        agility: ['Pro Agility', 'L Drill', '60-Yard Shuttle'],
        power: ['Vertical Jump', 'Broad Jump', 'Hang Clean', 'Power Clean'],
        strength: ['Squat', 'Bench', '225lb Bench'],
        anthro: ['Weight', 'Height', 'Wingspan']
    };

    const category = barEl.id.replace('-chart', '').toLowerCase();
    const metrics = statCategories[category];
    const filteredStatNames = [];
    const filteredPositionMedians = [];
    const filteredPlayerStats = [];
    const filteredPlayerPercentiles = [];

    statNames.forEach((statName, index) => {
        if (metrics.includes(statName)) {
            filteredStatNames.push(statName);
            filteredPositionMedians.push(positionMedians[index]);
            filteredPlayerStats.push(playerStats[index]);
            filteredPlayerPercentiles.push(playerPercentiles[index]);
        }
    });

    let columns = [
        ['x', ...filteredStatNames],
        ['Player Percentiles', ...filteredPlayerPercentiles]
    ];

    if (barInstances[barEl.id]) {
        barInstances[barEl.id].destroy();
    }

    const colors = getColor(filteredPlayerPercentiles);

    barInstances[barEl.id] = bb.generate({
        title: {
            text: category.charAt(0).toUpperCase() + category.slice(1)
          },
        data: {
            x: 'x',
            columns: columns,
            type: 'bar',
            color: function (color, d) {
                if (d && d.index !== undefined) {
                    return colors[d.index];
                }
                return color;
            }
        },
        bar: {
            padding: 1,
            radius: {
                ratio: 0.2
            },
            width: {
                ratio: 0.5,
                max: 50,
            }
        },
        axis: {
            rotated: false,
            x: {show: true,
                type: 'category',
                categories: filteredStatNames,
            },
            y: {
                show: false,
                max: 100,
                padding: {
                    top: 0,
                    bottom: 0
                },
                tick: {
                    show: true,
                    text: {
                      show: false
                    }
                  }
            }
        },
        legend: {
            show: false
        },
        bindto: barEl
    });

    function getColor(percentiles) {
        return percentiles.map(percentile => {
            if (percentile >= 80) {
                // darkcyan
                return 'rgba(0, 139, 139, 0.7)';
            } else if (percentile >= 60) {
                // gold
                return 'rgba(255, 215, 0, 0.7)';
            } else if (percentile >= 40) {
                // salmon
                return 'rgba(250, 128, 114, 0.7)';
            } else {
                return 'rgba(211, 211, 211, 0.7)';
            }
        });
    }
}

export { initBar };
