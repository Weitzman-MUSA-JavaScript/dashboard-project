function fetchWeatherData(lat, lon) {
    const apikey = '320ee3652da3b3be6fc3d5423df006cf';
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apikey}&units=metric`;
    
    fetch(weatherUrl)
        .then(response => response.json())
        .then(data => {
            const windSpeed = data.wind.speed; // Wind speed in m/s
            const windDirection = data.wind.deg; // Wind direction in degrees
            const weatherDescription = data.weather[0].description; // Weather description
            
            updateWeatherInfo(windSpeed, windDirection, weatherDescription);
            updateWindRoseChart(windSpeed, windDirection); // Update the wind rose chart
        })
        .catch(error => console.error('Error fetching weather data:', error));
  }
  
  let windRoseChart; // Declare it globally
  let windRoseData = [0, 0, 0, 0, 0, 0, 0, 0];
  
  function initializeWindRoseChart() {
      const ctx = document.getElementById('windRoseChart').getContext('2d');
      windRoseChart = new Chart(ctx, {
          type: 'polarArea',
          data: {
              labels: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'],
              datasets: [{
                  label: 'Wind Speed (m/s)',
                  data: [0, 0, 0, 0, 0, 0, 0, 0], // Initial data
                  backgroundColor: [
                      'rgba(255, 99, 132, 0.2)',
                      'rgba(54, 162, 235, 0.2)',
                      // ... other colors
                  ],
                  borderColor: [
                      'rgba(255, 99, 132, 1)',
                      'rgba(54, 162, 235, 1)',
                      // ... other colors
                  ],
                  borderWidth: 1
              }]
          },
          options: {
              responsive: true,
              scales: {
                  r: {
                      beginAtZero: true,
                  }
              }
          }
      });
  }
  
  function updateWindRoseChart(windSpeed, windDirection) {
    const index = Math.floor((windDirection % 360) / 45);
    windRoseData[index] += windSpeed; // Update data
  
    // Only attempt to destroy if windRoseChart is defined
    if (windRoseChart) {
        windRoseChart.destroy(); // Destroy the existing chart
    }
  
    // Re-initialize the chart
    const windSpeeds = [5, 15, 25, 35]; // Example wind speed data
  const colors = windSpeeds.map(speed => {
      if (speed <= 10) return 'rgba(0, 255, 0, 0.6)'; // Light Green for low speed
      if (speed <= 20) return 'rgba(255, 255, 0, 0.6)'; // Yellow for moderate speed
      return 'rgba(255, 0, 0, 0.6)'; // Red for high speed
  });
  
  // Sample wind direction labels
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const ctx = document.getElementById('windRoseChart').getContext('2d');
    windRoseChart = new Chart(ctx, {
        type: 'polarArea',
        data: {
            labels: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'],
            datasets: [{
                label: 'Wind Speed (m/s)',
                data: windRoseData, // Use updated data
                backgroundColor: [
                    'rgba(255, 99, 132, 0.2)',
                    'rgba(54, 162, 235, 0.2)',
                    // ... other colors
                ],
                borderColor: 'white',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                r: {
                  beginAtZero: true,
                  grid: {
                    color: 'white'
                  }
                }
              },
            plugins: {
              legend: {
                labels: {
                  color: 'white' 
                  }
              }
            }
        }
    });
  }
  
  
  function updateWeatherInfo(speed, direction, description) {
    document.getElementById('windSpeed').innerText = `Wind Speed: ${speed} m/s`;
    document.getElementById('windDirection').innerText = `Wind Direction: ${direction}°`;
    document.getElementById('weatherDescription').innerText = `Weather: ${description}`;
  }

  export { fetchWeatherData }