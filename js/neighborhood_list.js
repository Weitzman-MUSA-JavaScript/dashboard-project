
function initializeList(neighborhoods, evt) { 
  const neighSelect = document.getElementById('neigh-select');

  for (var neigh of neighborhoods){
    var opt = document.createElement('option');
    opt.value = neigh.district;
    opt.innerHTML = neigh.name;
    neighSelect.appendChild(opt);
  }

  neighSelect.addEventListener("change", (e) => {
    handleSelectedNeighborhood(e, evt)
  })
}

function handleSelectedNeighborhood(e, evt){

  const district = e.target.value;

  // event handling neighborhood selection
  const selectNeighborhoodEvent = new CustomEvent(
    'select-neighborhood', 
    { detail: { district }}
); 
  evt.dispatchEvent(selectNeighborhoodEvent);
}

export {
  initializeList,
};
