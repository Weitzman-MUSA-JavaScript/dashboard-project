function calculateChartData(indivStats, events) {
    let playerPosition = "DB";  
    let playerStats = [];
    let playerStatsValues = [];
    let positionStatsValues = [];
    let positionMedians = [];
    let playerPercentiles = [];

    const inversePercentileStats = [
        'Flying 10', '10-Yard Sprint', '60-Yard Shuttle', 'L Drill', 'Pro Agility'
    ];

    function getPercentiles() {
        playerPercentiles = [];
      
        playerStats.forEach((statName, index) => {
            const playerValue = playerStatsValues[index];
            const statValues = positionStatsValues[index];
            const sortedStatValues = statValues.slice().sort((a, b) => a - b); 
            const countBelow = sortedStatValues.filter(value => value <= playerValue).length;
      
            let percentile = (countBelow / sortedStatValues.length);
            percentile = Math.round(percentile * 100);
      
            if (inversePercentileStats.includes(statName)) {
                percentile = 100 - percentile;
            }
      
            playerPercentiles.push(percentile);
        });
      
        return playerPercentiles;
    }

    function getMedians() {
        positionMedians = [];
    
        positionStatsValues.forEach(statValues => {
            const sortedValues = statValues.slice().sort((a, b) => a - b);
            const mid = Math.floor(sortedValues.length / 2);
    
            let median;
            if (sortedValues.length % 2 === 0) {
                median = (sortedValues[mid - 1] + sortedValues[mid]) / 2;
            } else {
                median = sortedValues[mid];
            }
            positionMedians.push(median);
        });

        return positionMedians;
    }

    function updatePositionStatsValues() {
        positionStatsValues = playerStats.map(statName => {
            return indivStats[playerPosition].map(item => item[statName]);
        });

        positionStatsValues = positionStatsValues.map(statArray => statArray.flat(1));
        getMedians();
        getPercentiles();
    }

    events.addEventListener('positionSelected', (evt) => {
        const { position } = evt.detail;
        playerPosition = position; 
        updatePositionStatsValues();
    });

    events.addEventListener('statFilled', (evt) => {
        const { statName, filled, statValue } = evt.detail;
  
        if (filled) {
            const index = playerStats.indexOf(statName);
  
            if (index !== -1) {
                playerStatsValues[index] = statValue;
                positionStatsValues[index] = indivStats[playerPosition].map(item => item[statName]);
            } else {
                playerStats.push(statName);
                playerStatsValues.push(statValue);
                positionStatsValues.push(indivStats[playerPosition].map(item => item[statName]));
            }
        } else { 
            const index = playerStats.indexOf(statName);
            if (index !== -1) {
                playerStats.splice(index, 1);
                playerStatsValues.splice(index, 1);
                positionStatsValues.splice(index, 1);
            }
        }
        positionStatsValues = positionStatsValues.map(statArray => statArray.flat(1));
        getMedians();
        getPercentiles();
    });

    function getCalculatedData() {

        console.log("Player Stats", playerStats);
        console.log("Player Percentiles", playerPercentiles);
        return {
            positionMedians,
            playerPercentiles,
            playerStats,
            playerStatsValues,
        };
    }

    return {
        getCalculatedData,
    };
}
  
export { calculateChartData };
