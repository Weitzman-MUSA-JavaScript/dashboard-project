
function initializeStatDisplay(data, neighborhoods, evt){

  const eleMae = document.querySelector('#main-stat-mae');
  const eleMape = document.querySelector('#main-stat-mape');
  const eleBach = document.querySelector('#sec-stat-bach');
  const eleUnemploy = document.querySelector('#sec-stat-unemploy')

  displayStats(eleMae, eleMape, eleBach, eleUnemploy, 0, data, neighborhoods);

  evt.addEventListener("select-neighborhood", (e) => {
    displayStats(eleMae, eleMape, eleBach, eleUnemploy, e.detail.district, data, neighborhoods);
  }) 

}

function displayStats(eleMae, eleMape, eleBach, eleUnemploy, district, data, neighborhoods) {

  let filteredData = data;
  let filteredNeigh = neighborhoods;

  if (district != 0) {
    filteredData = data.filter((obs) => obs.district == district);
    filteredNeigh = neighborhoods.filter((neigh) => neigh.district == district);
  }
  
  console.log(filteredNeigh.filter((neigh) => isNaN(neigh.unemploy)));

  const mae = Math.round(filteredData.reduce((accumulator, obs) => accumulator + Math.abs(obs.residual), 0,) / filteredData.length);
  const mape = Math.round(100 * filteredData.reduce((accumulator, obs) => accumulator + Math.abs(obs.percentResidual), 0,) / filteredData.length);
  const bach = Math.round(1000 * filteredNeigh.filter((neigh) => !isNaN(neigh.bach))
    .reduce((accumulator, neigh) => accumulator + Math.abs(neigh.bach), 0,) / filteredNeigh.length) / 10;
  const unemploy = Math.round(1000 * filteredNeigh.filter((neigh) => !isNaN(neigh.unemploy))
    .reduce((accumulator, neigh) => accumulator + Math.abs(neigh.unemploy), 0,) / filteredNeigh.length) / 10;

  eleMae.textContent = `MAE: $${mae}`;
  eleMape.textContent = `MAPE: ${mape}%`;
  if (filteredNeigh.filter((neigh) => !isNaN(neigh.bach)).length == 0){
    eleBach.textContent = `Bachelor's Degree Rate: NOT AVAILABLE`;
  } else {
    eleBach.textContent = `Bachelor's Degree Rate: ${bach}%`;
  }
  if (filteredNeigh.filter((neigh) => !isNaN(neigh.unemploy)) == 0){
    eleUnemploy.textContent = `Unemployment Rate : NOT AVAILABLE`;
  } else {
    eleUnemploy.textContent = `Unemployment Rate: ${unemploy}%`;
  }
}

export {
  initializeStatDisplay,
};
