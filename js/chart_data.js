function calculateChartData(indivStats, events) {
    let playerPosition = "DB";  
    let playerStats = [];
    let playerStatsValues = [];
    let positionStatsValues = [];
    let positionMedians = [];
    let playerPercentiles = [];
    let categoryPercentiles = [];

    // Stats that are better when lower
    const inversePercentileStats = [
        'Flying 10', '10-Yard Sprint', '60-Yard Shuttle', 'L Drill', 'Pro Agility'
    ];

    // Stat categories
    const statCategories = {
        speed: ['10-Yard Sprint', 'Flying 10'],
        agility: ['Pro Agility', 'L Drill', '60-Yard Shuttle'],
        power: ['Vertical Jump', 'Broad Jump', 'Hang Clean', 'Power Clean'],
        strength: ['Squat', 'Bench', '225lb Bench']
    };

    // Calculate mean player percentile within each stat category
    function getCategoryPercentiles() {
        categoryPercentiles = [];
        for (const category in statCategories) {
        const statNames = statCategories[category];
        const statIndexes = statNames.map(name => playerStats.indexOf(name));
        const percentiles = statIndexes
        .map(index => playerPercentiles[index])
        .filter(value => value !== undefined);

        const mean = percentiles.reduce((a, b) => a + b, 0) / percentiles.length;
        let categoryPercentile = Math.round(mean);
        // only return defined values
        if (!isNaN(categoryPercentile)) {
        categoryPercentiles.push(categoryPercentile);
    } else {
        categoryPercentiles.push(0);
    }
}
        return categoryPercentiles;
    }

    // Calculate player percentiles within position group
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

    // Calculate position group medians (2020-2024)
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

    // Handle stat changes
    function updatePositionStatsValues() {
        positionStatsValues = playerStats.map(statName => {
            return indivStats[playerPosition].map(item => item[statName]);
        });

        positionStatsValues = positionStatsValues.map(statArray => statArray.flat(1));
        getMedians();
        getPercentiles();
        getCategoryPercentiles();
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
        getCategoryPercentiles();
    });

    // Return calculated data for bar and radar chart render
    function getCalculatedData() {
        return {
            positionMedians,
            playerPercentiles,
            playerStats,
            playerStatsValues,
            categoryPercentiles
        };
    }

    return {
        getCalculatedData,
    };
}
  
export { calculateChartData };
