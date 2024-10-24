

var url = './data/layers/emotions_main.geojson';

async function getData(url) {
  const response = await fetch(url);

  return response.json();
}

const data = await getData(url);

console.log('main data loaded', data )



export{getData}



  
  
  
