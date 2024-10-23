function radar(data){ 
    
    var chrt = document.getElementById("chartId").getContext("2d");
    console.log('data ready for chart', data)
    
    
    const result = [...data.features
        .reduce((r, { properties: { sentiment } }) => {
          const cat = r.get(sentiment);
          cat ? cat.count++ : r.set(sentiment, { sentiment, count: 1 });
          return r;
        }, new Map())
        .values()
      ];

      
      var labels = result.map(item=>item.sentiment)
      var data = result.map(item=>item.count)
      
   
    
      let radarChart = new Chart(chrt, {
        type: 'radar',
        data: {
            labels : labels,
            datasets:[{
                label: 'Sentiment Counts',
                data : data,
                fill: true,
                backgroundColor: 'rgb(170,170,170,0.3)',
                borderColor: 'rgb(54, 162, 235,0)',
                pointBackgroundColor: 'rgb(79,79,79, 0.8)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgb(188, 216, 220)',
                borderWidth: 0.1
            }]
        },
        options: {
            plugins: {
                legend: {
                    // Show legend
                    display: true,
                    // Legend position
                    position: 'bottom',
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: "white",
                    titleColor: "#042a0b",
                    bodyColor: "#042a0b",
                    titleFont: { weight: 'bold' },
                    padding: 5,
                    cornerRadius: 5,
                    borderColor: "#efefef",
                    borderWidth: "2",
                    xAlign: "top"
                },
            },
            responsive: true,


            scales: {
                    r: {
                        ticks: {
                            maxTicksLimit:7,
                           
                        },
                        grid: {
                            // Set grid lines to be circular
                            circular: true,
                            // Set grid line color
                            
                            // Show grid lines
                            display: true,
                            // Do not draw lines beside the ticks
                            drawTicks: false,
                            // Set grid line width
                            lineWidth: 1,
                            // Set grid line length 
                            // into the axis area
                            tickLength: 10,
                            
                        }
                    }
      
        },
        elements: {
            line: {
                // Line curve tension
                tension: 0.7,
            },
        
        },
      }});





}


export{radar};